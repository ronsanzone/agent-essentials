# Installation

```bash
git clone git@github.com:ronsanzone/agent-essentials.git ~/code/agent-essentials
cd ~/code/agent-essentials
scripts/install-claude.sh --dry-run   # read the plan
scripts/install-claude.sh             # apply
```

## What the installer does

1. **Runtime files stay real files.** If `~/.claude/.mcp.json` or `~/.claude/settings.local.json` is a symlink into this repo (old layout), it is replaced by a real local copy. Old whole-directory links (`~/.claude/skills`, `~/.claude/docs`) into this repo are removed.
2. **Config links:** `config/claude/CLAUDE.md` → `~/.claude/CLAUDE.md`, `config/claude/settings.json` → `~/.claude/settings.json`, `config/claude/mods` → `~/.claude/mods`, and `config/shared/AGENTS.md` → `~/.config/opencode/AGENTS.md` and `~/.pi/agent/AGENTS.md`. Examples (`settings.local.json.example`, `mcp.json.example`) are copied once if absent.
3. **Skills:** for every `skills/<name>/` with a `SKILL.md`, `~/.agents/skills/<name>` → `skills/<name>` and `~/.claude/skills/<name>` → `../../.agents/skills/<name>`. Pi reads `~/.agents/skills` directly. Existing real directories are replaced when byte-identical to the repo; otherwise skipped with a warning (use `--force-config` to back them up and replace).
4. **Agents and hooks:** `config/claude/agents/*.md` → `~/.claude/agents/`, `config/claude/hooks/*.sh` → `~/.claude/hooks/`.
5. **`--prune`:** removes `~/.agents/skills/<name>` and `~/.claude/skills/<name>` for every name in `deprecated-skills/`, but only when the entry is a symlink or identical to the deprecated copy — a foreign real directory with the same name is left alone and reported.
6. **Drift report** (always printed): every `~/.agents/skills` entry as `symlink → repo`, `symlink → <elsewhere>`, `COPY … identical|DIVERGENT`, or `copy (source unknown to this repo)`; plus any `~/.claude/skills` entry not pointing at the store.

Flags: `--dry-run` (read-only; every mutation is printed instead), `--skills-only`, `--config-only`, `--prune`, `--force-config`, `--agent codex|opencode` (additionally runs `npx skills add` for that agent; never `pi`), `--target-dir DIR`.

## Other agents

Claude Code and pi need nothing beyond the installer. For Codex/OpenCode: `scripts/install-claude.sh --agent codex --agent opencode`, or directly `npx skills add ronsanzone/agent-essentials/skills -g -a codex --skill '*' -y`.

## OpenCode plugins

```bash
scripts/install-opencode-plugins.sh --dry-run   # read the plan
scripts/install-opencode-plugins.sh             # apply
scripts/install-opencode-plugins.sh --update    # refresh all listed plugins
```

The plugin list lives in `config/opencode/plugins.txt` (one spec per line, `#` comments). Each entry is installed with `opencode plugin add <spec>`; entries already installed are skipped, and anything not in the list is left alone. Restart the OpenCode TUI after installing or updating.

## Dot integration

In `~/code/dot/profiles/personal.env`: `DOT_ITEM_claude_essentials_APPLY="./scripts/install-claude.sh --prune"`, then `dot down --apply-only`.

## Retiring a skill

`git mv skills/<name> deprecated-skills/<name>`, drop its entry from `vendor-skills.lock.json` if vendored, fix any references (`grep -rn <name> skills config README.md`), then `scripts/install-claude.sh --prune`.

## Verification

```bash
scripts/install-claude.sh --dry-run            # nothing unexpected planned
test ! -L ~/.claude/.mcp.json && test ! -L ~/.claude/settings.local.json
readlink ~/.agents/skills/babysit-pr           # -> <repo>/skills/babysit-pr
readlink ~/.claude/skills/babysit-pr           # -> ../../.agents/skills/babysit-pr
readlink ~/.claude/hooks/guards.sh ~/.claude/agents/codebase-analyzer.md
echo '{"tool_name":"Bash","tool_input":{"command":"git push --force origin x"}}' | ~/.claude/hooks/guards.sh   # -> ask
```

Then start Claude Code: `/skills` lists the repo's skills once each; a drift report with only `symlink -> repo` and known foreign copies means the install is clean.

## Troubleshooting

- **"skip … real content differs from repo"** — a real directory sits where a link should be and is not identical to the repo. Inspect (`diff -r`), copy anything worth keeping back into the repo, then `--force-config` (it backs the directory up under `~/.claude/backups/`).
- **A skill appears twice in `/skills`** — a plugin or another install root also provides it. Check the drift report and `~/.claude/plugins`.
- **Hook did not fire** — hooks are read at session start; restart the session. Test the script directly with the one-liner above.
