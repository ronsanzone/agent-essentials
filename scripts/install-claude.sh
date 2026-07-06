#!/usr/bin/env bash
# Install agent-essentials safely.
#
# Skills are installed with `npx skills`; only non-secret Claude config is
# package-managed. Runtime/local files such as ~/.claude/.mcp.json and
# ~/.claude/settings.local.json are materialized as real local files if they were
# previously symlinked to this repo.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/install-claude.sh [options]

Options:
  --skills-only       Install skills only; skip Claude config links/examples.
  --config-only       Install Claude config only; skip npx skills install.
  --dry-run           Print planned actions without changing files.
  --force-config      Back up and replace existing real config files/directories.
  --copy-skills       Pass --copy to npx skills instead of the default symlink mode.
  --agent AGENT       Agent target for npx skills (default: claude-code). May repeat.
  --target-dir DIR    Claude config dir (default: ~/.claude).
  -h, --help          Show this help.

Examples:
  scripts/install-claude.sh
  scripts/install-claude.sh --dry-run
  scripts/install-claude.sh --skills-only --agent claude-code --agent pi
EOF
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_DIR="$ROOT/config/claude"
TARGET_DIR="$HOME/.claude"
BACKUP_ROOT="$HOME/.claude/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$BACKUP_ROOT/agent-essentials-migration-$STAMP"

INSTALL_SKILLS=1
INSTALL_CONFIG=1
DRY_RUN=0
FORCE_CONFIG=0
COPY_SKILLS=0
AGENTS=(claude-code)

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skills-only)
      INSTALL_CONFIG=0
      shift
      ;;
    --config-only)
      INSTALL_SKILLS=0
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --force-config)
      FORCE_CONFIG=1
      shift
      ;;
    --copy-skills)
      COPY_SKILLS=1
      shift
      ;;
    --agent|-a)
      [[ $# -ge 2 && -n "${2:-}" ]] || { echo "missing value after $1" >&2; exit 1; }
      if [[ "${#AGENTS[@]}" -eq 1 && "${AGENTS[0]}" == "claude-code" ]]; then
        AGENTS=()
      fi
      AGENTS+=("$2")
      shift 2
      ;;
    --target-dir)
      [[ $# -ge 2 && -n "${2:-}" ]] || { echo "missing value after --target-dir" >&2; exit 1; }
      TARGET_DIR="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run]'
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}

note() { printf '%s\n' "$*"; }
warn() { printf 'WARN: %s\n' "$*" >&2; }

ensure_backup_dir() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    note "[dry-run] mkdir -p $BACKUP_DIR"
  else
    mkdir -p "$BACKUP_DIR"
  fi
}

backup_path() {
  local path="$1"
  local rel backup_name
  rel="${path#"$TARGET_DIR"/}"
  backup_name="${rel//\//-}"
  ensure_backup_dir
  note "backup $path -> $BACKUP_DIR/$backup_name"
  run mv "$path" "$BACKUP_DIR/$backup_name"
}

symlink_target_is_this_repo() {
  local path="$1"
  [[ -L "$path" ]] || return 1
  local target
  target="$(readlink "$path")"
  case "$target" in
    "$ROOT"|"$ROOT"/*|"$HOME/code/agent-essentials"|"$HOME/code/agent-essentials"/*|~/code/agent-essentials|~/code/agent-essentials/*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

materialize_local_symlink() {
  local rel="$1"
  local mode="$2"
  local path="$TARGET_DIR/$rel"

  [[ -L "$path" ]] || return 0
  if ! symlink_target_is_this_repo "$path"; then
    warn "leaving $path alone; symlink target is outside this repo"
    return 0
  fi

  if [[ ! -e "$path" ]]; then
    note "remove broken repo symlink $path"
    run rm "$path"
    return 0
  fi

  local backup_name tmp
  backup_name="${rel//\//-}"
  ensure_backup_dir
  note "materialize $path as a real local file (backup: $BACKUP_DIR/$backup_name)"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    note "[dry-run] cp -pL $path $BACKUP_DIR/$backup_name"
    note "[dry-run] replace symlink with dereferenced file and chmod $mode"
    return 0
  fi
  cp -pL "$path" "$BACKUP_DIR/$backup_name"
  tmp="$(mktemp)"
  cp -pL "$path" "$tmp"
  rm "$path"
  mv "$tmp" "$path"
  chmod "$mode" "$path" || true
}

remove_repo_symlink() {
  local rel="$1"
  local path="$TARGET_DIR/$rel"
  [[ -L "$path" ]] || return 0
  if symlink_target_is_this_repo "$path"; then
    note "remove old repo symlink $path"
    run rm "$path"
  fi
}

materialize_or_remove_obsolete_symlink() {
  local rel="$1"
  local path="$TARGET_DIR/$rel"
  [[ -L "$path" ]] || return 0
  if ! symlink_target_is_this_repo "$path"; then
    warn "leaving obsolete-looking $path alone; symlink target is outside this repo"
    return 0
  fi

  if [[ -e "$path" ]]; then
    local backup_name tmp
    backup_name="${rel//\//-}"
    ensure_backup_dir
    note "materialize obsolete $path as local content (backup: $BACKUP_DIR/$backup_name)"
    if [[ "$DRY_RUN" -eq 1 ]]; then
      note "[dry-run] copy dereferenced content, replace symlink"
      return 0
    fi
    cp -aL "$path" "$BACKUP_DIR/$backup_name"
    tmp="$(mktemp -d)"
    cp -aL "$path" "$tmp/content"
    rm "$path"
    mv "$tmp/content" "$path"
    rmdir "$tmp"
  else
    note "remove broken obsolete repo symlink $path"
    run rm "$path"
  fi
}

install_managed_link() {
  local rel="$1"
  local src="$CONFIG_DIR/$rel"
  local dest="$TARGET_DIR/$rel"

  [[ -e "$src" || -L "$src" ]] || return 0

  if [[ -L "$dest" ]]; then
    local current_target
    current_target="$(readlink "$dest")"
    if [[ "$current_target" == "$src" ]]; then
      note "ok link $dest -> $src"
      return 0
    fi
    if symlink_target_is_this_repo "$dest"; then
      note "replace managed symlink $dest -> $src"
      run rm "$dest"
    else
      warn "skip $dest; symlink target is outside this repo"
      return 0
    fi
  elif [[ -e "$dest" ]]; then
    if [[ "$FORCE_CONFIG" -eq 1 ]]; then
      backup_path "$dest"
    else
      warn "skip $dest; exists as real local content (use --force-config to replace)"
      return 0
    fi
  fi

  run mkdir -p "$(dirname "$dest")"
  run ln -s "$src" "$dest"
  note "link $dest -> $src"
}

install_example_copy() {
  local src_rel="$1"
  local dest_rel="$2"
  local src="$CONFIG_DIR/$src_rel"
  local dest="$TARGET_DIR/$dest_rel"

  [[ -f "$src" ]] || return 0

  if [[ -L "$dest" ]]; then
    if symlink_target_is_this_repo "$dest"; then
      note "replace old example symlink $dest with local copy"
      run rm "$dest"
    else
      warn "skip $dest; symlink target is outside this repo"
      return 0
    fi
  elif [[ -e "$dest" ]]; then
    note "ok $dest exists"
    return 0
  fi

  run mkdir -p "$(dirname "$dest")"
  run cp "$src" "$dest"
  note "copy example $dest"
}

migrate_old_layout() {
  note "== migrate old agent-essentials symlinks =="
  run mkdir -p "$TARGET_DIR"

  # Local/runtime files must survive package removal as real, non-symlink files.
  materialize_local_symlink ".mcp.json" 600
  materialize_local_symlink "settings.local.json" 600

  # npx skills owns this path now; remove the old whole-directory package link.
  remove_repo_symlink "skills"

  # These are not part of the new package layout. Preserve if the old target still
  # exists; otherwise remove broken repo-owned symlinks.
  materialize_or_remove_obsolete_symlink "agents"
  materialize_or_remove_obsolete_symlink "commands"
  materialize_or_remove_obsolete_symlink "rules"
}

install_config() {
  note "== install safe Claude config =="
  install_managed_link "CLAUDE.md"
  install_managed_link "settings.json"
  install_managed_link "docs"
  install_example_copy "settings.local.json.example" "settings.local.json.example"
  install_example_copy "mcp.json.example" ".mcp.json.example"
}

install_skills() {
  note "== install skills via npx skills =="
  local cmd=(npx skills add "$ROOT" -g --skill '*' -y)
  local agent
  for agent in "${AGENTS[@]}"; do
    cmd+=(-a "$agent")
  done
  if [[ "$COPY_SKILLS" -eq 1 ]]; then
    cmd+=(--copy)
  fi
  run "${cmd[@]}"
}

if [[ "$INSTALL_CONFIG" -eq 1 ]]; then
  migrate_old_layout
  install_config
fi

if [[ "$INSTALL_SKILLS" -eq 1 ]]; then
  install_skills
fi

note "agent-essentials install complete"
if [[ "$DRY_RUN" -eq 0 && -d "$BACKUP_DIR" ]]; then
  note "backups: $BACKUP_DIR"
fi
