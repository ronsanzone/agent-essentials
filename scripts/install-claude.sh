#!/usr/bin/env bash
# Install agent-essentials.
#
# Model: everything this repo owns is a symlink back into the repo, so edits
# here are live everywhere and nothing else can silently overwrite them.
#
#   ~/.agents/skills/<name>        -> $ROOT/skills/<name>        (shared store; pi reads this)
#   ~/.claude/skills/<name>        -> ../../.agents/skills/<name> (Claude's view of the store)
#   ~/.claude/agents/<name>.md     -> $ROOT/config/claude/agents/<name>.md
#   ~/.claude/hooks/<name>.sh      -> $ROOT/config/claude/hooks/<name>.sh
#   ~/.claude/CLAUDE.md, settings.json -> $ROOT/config/claude/...
#   ~/.config/opencode/AGENTS.md, ~/.pi/agent/AGENTS.md -> $ROOT/config/shared/AGENTS.md
#   ~/.config/opencode/commands/ship.md -> $ROOT/config/opencode/commands/ship.md
#   ~/bin/shipctl                  -> $ROOT/skills/ship/scripts/shipctl
#
# Store entries from other sources (npx skills, plugins, other repos) are left
# alone and listed in the drift report at the end. Runtime/local files such as
# ~/.claude/.mcp.json and ~/.claude/settings.local.json are never symlinked.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/install-claude.sh [options]

Options:
  --skills-only       Install skills/agents/hooks only; skip CLAUDE.md/settings links.
  --config-only       Install Claude config only; skip skills/agents/hooks.
  --prune             Also remove store entries named in deprecated-skills/.
  --dry-run           Print planned actions without changing files.
  --force-config      Back up and replace existing real config files/directories.
  --agent AGENT       Also run `npx skills add` for another agent (codex, opencode...). May repeat.
  --target-dir DIR    Claude config dir (default: ~/.claude).
  -h, --help          Show this help.

Pi discovers ~/.agents/skills automatically; do not pass --agent pi.
EOF
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_DIR="$ROOT/config/claude"
TARGET_DIR="$HOME/.claude"
SHARED_SKILLS_ROOT="$HOME/.agents/skills"
BACKUP_DIR="$HOME/.claude/backups/agent-essentials-$(date +%Y%m%d-%H%M%S)"

INSTALL_SKILLS=1
INSTALL_CONFIG=1
PRUNE=0
DRY_RUN=0
FORCE_CONFIG=0
AGENTS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skills-only) INSTALL_CONFIG=0; shift ;;
    --config-only) INSTALL_SKILLS=0; shift ;;
    --prune) PRUNE=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --force-config) FORCE_CONFIG=1; shift ;;
    --agent|-a)
      [[ $# -ge 2 && -n "${2:-}" ]] || { echo "missing value after $1" >&2; exit 1; }
      [[ "$2" != "pi" ]] || { echo "Pi reads ~/.agents/skills directly; do not pass --agent pi." >&2; exit 1; }
      AGENTS+=("$2"); shift 2 ;;
    --target-dir)
      [[ $# -ge 2 && -n "${2:-}" ]] || { echo "missing value after --target-dir" >&2; exit 1; }
      TARGET_DIR="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown argument: $1" >&2; usage >&2; exit 1 ;;
  esac
done

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run]'; printf ' %q' "$@"; printf '\n'
  else
    "$@"
  fi
}
note() { printf '%s\n' "$*"; }
warn() { printf 'WARN: %s\n' "$*" >&2; }

backup() { # move $1 into the backup dir under a flattened name
  local path="$1" name
  name="${path#"$HOME"/}"; name="${name//\//-}"
  run mkdir -p "$BACKUP_DIR"
  note "backup $path -> $BACKUP_DIR/$name"
  run mv "$path" "$BACKUP_DIR/$name"
}

points_into_repo() { # $1 = symlink path
  [[ -L "$1" ]] || return 1
  case "$(readlink "$1")" in
    "$ROOT"|"$ROOT"/*|~/code/agent-essentials|~/code/agent-essentials/*) return 0 ;;
    *) return 1 ;;
  esac
}

# link <src> <dest> [identical-ok]
# Replace $dest with a symlink to $src. Existing symlinks are replaced.
# Existing real content: replaced if byte-identical to $src (generated copies),
# otherwise backed up when --force-config, else skipped with a warning.
link() {
  local src="$1" dest="$2"
  if [[ -L "$dest" ]]; then
    [[ "$(readlink "$dest")" == "$src" ]] && { note "ok   $dest"; return 0; }
    run rm "$dest"
  elif [[ -e "$dest" ]]; then
    if diff -qr "$dest" "$src" >/dev/null 2>&1; then
      note "replace identical copy $dest with link"
      run rm -r "$dest"
    elif [[ "$FORCE_CONFIG" -eq 1 ]]; then
      backup "$dest"
    else
      warn "skip $dest; real content differs from repo (use --force-config to back up and replace)"
      return 0
    fi
  fi
  [[ -d "$(dirname "$dest")" ]] || run mkdir -p "$(dirname "$dest")"
  run ln -s "$src" "$dest"
  note "link $dest -> $src"
}

# Runtime files must be real local files, never links into this repo.
materialize_local() {
  local path="$TARGET_DIR/$1" mode="$2" tmp
  [[ -L "$path" ]] && points_into_repo "$path" || return 0
  if [[ ! -e "$path" ]]; then note "remove broken repo symlink $path"; run rm "$path"; return 0; fi
  note "materialize $path as a real local file"
  if [[ "$DRY_RUN" -eq 1 ]]; then return 0; fi
  tmp="$(mktemp)"; cp -pL "$path" "$tmp"; rm "$path"; mv "$tmp" "$path"; chmod "$mode" "$path" || true
}

remove_repo_symlink() { # old whole-directory links from earlier layouts
  local path="$TARGET_DIR/$1"
  [[ -L "$path" ]] && points_into_repo "$path" || return 0
  note "remove old repo symlink $path"; run rm "$path"
}

install_config() {
  note "== Claude config =="
  materialize_local ".mcp.json" 600
  materialize_local "settings.local.json" 600
  remove_repo_symlink "skills"
  remove_repo_symlink "docs"
  link "$CONFIG_DIR/CLAUDE.md" "$TARGET_DIR/CLAUDE.md"
  link "$CONFIG_DIR/settings.json" "$TARGET_DIR/settings.json"
  # Local Claude Code mods (ci-band, artifact-tray), loaded via CLAUDE_CODE_PLUGIN_DIRS in settings.json.
  link "$CONFIG_DIR/mods" "$TARGET_DIR/mods"
  # Shared global rules: Claude imports them from CLAUDE.md; OpenCode and Pi read AGENTS.md directly.
  link "$ROOT/config/shared/AGENTS.md" "$HOME/.config/opencode/AGENTS.md"
  link "$ROOT/config/shared/AGENTS.md" "$HOME/.pi/agent/AGENTS.md"
  # OpenCode has no skill slash commands; this one gives it `/ship` (Pi has `/skill:ship`).
  link "$ROOT/config/opencode/commands/ship.md" "$HOME/.config/opencode/commands/ship.md"
  # The ship skill's CLI, for every harness.
  link "$ROOT/skills/ship/scripts/shipctl" "$HOME/bin/shipctl"
  for f in settings.local.json.example mcp.json.example; do
    [[ -f "$CONFIG_DIR/$f" && ! -e "$TARGET_DIR/.$f" && ! -e "$TARGET_DIR/$f" ]] || continue
    run cp "$CONFIG_DIR/$f" "$TARGET_DIR/$f"; note "copy example $TARGET_DIR/$f"
  done
}

install_skills() {
  note "== skills (symlink store) =="
  run mkdir -p "$SHARED_SKILLS_ROOT" "$TARGET_DIR/skills"
  local src name
  for src in "$ROOT"/skills/*/; do
    src="${src%/}"; name="$(basename "$src")"
    [[ -f "$src/SKILL.md" ]] || { warn "skills/$name has no SKILL.md; skipped"; continue; }
    link "$src" "$SHARED_SKILLS_ROOT/$name"
    link "../../.agents/skills/$name" "$TARGET_DIR/skills/$name"
  done
  if [[ ${#AGENTS[@]} -gt 0 ]]; then
    local cmd=(npx skills add "$ROOT/skills" -g --skill '*' -y)
    local agent; for agent in "${AGENTS[@]}"; do cmd+=(-a "$agent"); done
    note "== npx skills for other agents: ${AGENTS[*]} =="
    run "${cmd[@]}"
  fi
}

install_agents_and_hooks() {
  note "== agents + hooks =="
  local f
  for f in "$CONFIG_DIR"/agents/*.md; do
    [[ -f "$f" ]] && link "$f" "$TARGET_DIR/agents/$(basename "$f")"
  done
  for f in "$CONFIG_DIR"/hooks/*.sh; do
    [[ -f "$f" ]] && link "$f" "$TARGET_DIR/hooks/$(basename "$f")"
  done
}

prune_deprecated() {
  note "== prune deprecated skills from the store =="
  local d name p
  for d in "$ROOT"/deprecated-skills/*/; do
    name="$(basename "${d%/}")"
    for p in "$SHARED_SKILLS_ROOT/$name" "$TARGET_DIR/skills/$name"; do
      [[ -e "$p" || -L "$p" ]] || continue
      # ~/.claude/skills real dirs are never ours (plannotator CLI, vendors) — only prune links there.
      if [[ -L "$p" ]] || { [[ "$p" == "$SHARED_SKILLS_ROOT/"* ]] && diff -qr "$p" "${d%/}" >/dev/null 2>&1; }; then
        note "prune $p"; run rm -r "$p"
      else
        note "leave $p (real content differs from the deprecated copy; not ours)"
      fi
    done
  done
}

drift_report() {
  note "== drift report: ~/.agents/skills =="
  local p name target repo
  for p in "$SHARED_SKILLS_ROOT"/*; do
    [[ -e "$p" || -L "$p" ]] || continue
    name="$(basename "$p")"; repo="$ROOT/skills/$name"
    if [[ -L "$p" ]]; then
      target="$(readlink "$p")"
      if [[ "$target" == "$repo" ]]; then printf '  %-36s symlink -> repo\n' "$name"
      else printf '  %-36s symlink -> %s\n' "$name" "$target"; fi
    elif [[ -d "$repo" ]]; then
      printf '  %-36s COPY, repo has same name -> %s\n' "$name" "$(diff -rq "$p" "$repo" >/dev/null 2>&1 && echo identical || echo 'DIVERGENT (run installer to relink)')"
    else
      printf '  %-36s copy (source unknown to this repo)\n' "$name"
    fi
  done
  note "== drift report: ~/.claude/skills not pointing at the store =="
  for p in "$TARGET_DIR"/skills/*; do
    [[ -e "$p" || -L "$p" ]] || continue
    name="$(basename "$p")"
    if [[ -L "$p" ]]; then
      [[ "$(readlink "$p")" == "../../.agents/skills/$name" ]] || printf '  %-36s symlink -> %s\n' "$name" "$(readlink "$p")"
    else
      printf '  %-36s REAL DIR (not managed)\n' "$name"
    fi
  done
}

if [[ "$INSTALL_CONFIG" -eq 1 ]]; then install_config; fi
if [[ "$INSTALL_SKILLS" -eq 1 ]]; then
  install_skills
  install_agents_and_hooks
  [[ "$PRUNE" -eq 1 ]] && prune_deprecated
fi
drift_report
note "agent-essentials install complete"
[[ "$DRY_RUN" -eq 0 && -d "$BACKUP_DIR" ]] && note "backups: $BACKUP_DIR" || true
