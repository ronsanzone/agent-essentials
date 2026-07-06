# Installation Guide

Agent Essentials is installed from the repo's central `skills/` folder with `npx skills`, plus an optional safe Claude Code config overlay.

Do **not** symlink this repository's `.claude` directory into `~/.claude`. This repo intentionally does not use a package-owned `.claude` directory because `~/.claude` also contains local secrets and runtime state.

## Prerequisites

- Node/npm for `npx skills`
- Claude Code CLI if installing for Claude Code
- `gh` CLI for PR-related skills
- `plannotator` CLI for Plannotator skills

## Install Skills Only

Install all skills globally for Claude Code:

```bash
npx skills add ronsanzone/agent-essentials/skills -g -a claude-code --skill '*' -y
```

Install a specific skill:

```bash
npx skills add ronsanzone/agent-essentials/skills -g -a claude-code --skill quick-review -y
```

List available skills:

```bash
npx skills add ronsanzone/agent-essentials/skills --list
```

Install for multiple agents:

```bash
npx skills add ronsanzone/agent-essentials/skills -g -a claude-code -a pi --skill '*' -y
```

## Install From a Local Checkout

```bash
git clone git@github.com:ronsanzone/agent-essentials.git ~/code/agent-essentials
cd ~/code/agent-essentials
scripts/install-claude.sh
```

The installer:

1. Migrates old repo-owned symlinks in `~/.claude`.
2. Materializes local-only files as real files if needed:
   - `~/.claude/.mcp.json`
   - `~/.claude/settings.local.json`
3. Removes the old `~/.claude/skills` symlink if it points to this repo.
4. Links safe config:
   - `config/claude/CLAUDE.md` → `~/.claude/CLAUDE.md`
   - `config/claude/settings.json` → `~/.claude/settings.json`
   - `config/claude/docs` → `~/.claude/docs`
5. Copies examples if absent:
   - `~/.claude/settings.local.json.example`
   - `~/.claude/.mcp.json.example`
6. Installs skills from `skills/` via `npx skills`.

Useful flags:

```bash
scripts/install-claude.sh --dry-run
scripts/install-claude.sh --skills-only
scripts/install-claude.sh --config-only
scripts/install-claude.sh --force-config
scripts/install-claude.sh --copy-skills
scripts/install-claude.sh --agent claude-code --agent pi
```

## Migrating From the Old Symlink Install

Old installs often had symlinks like:

```text
~/.claude/.mcp.json -> ~/code/agent-essentials/.claude/.mcp.json
~/.claude/settings.local.json -> ~/code/agent-essentials/.claude/settings.local.json
~/.claude/skills -> ~/code/agent-essentials/.claude/skills
```

Run:

```bash
cd ~/code/agent-essentials
scripts/install-claude.sh --dry-run
scripts/install-claude.sh
```

After migration, verify local secret/runtime files are real files, not symlinks:

```bash
test ! -L ~/.claude/.mcp.json
test ! -L ~/.claude/settings.local.json
test -d ~/.claude/skills
```

If the old `.mcp.json` token was accidentally committed or shared, rotate it.

## Dot Integration

In `~/code/dot/profiles/personal.env`, use:

```bash
DOT_ITEM_claude_essentials_APPLY="./scripts/install-claude.sh"
```

Then:

```bash
dot down --apply-only
dot doctor --deep
```

`dot down` will keep the repo updated, run the safe installer, and avoid symlinking the whole Claude config directory.

## Updating

For a checkout managed directly:

```bash
cd ~/code/agent-essentials
git pull
scripts/install-claude.sh
```

For skills installed directly from GitHub:

```bash
npx skills update -g
```

## Uninstalling Skills

Remove installed skills from Claude Code:

```bash
npx skills remove --global --agent claude-code --skill '*' -y
```

Or remove specific skills:

```bash
npx skills remove --global --agent claude-code quick-review
```

Remove safe config links manually if desired:

```bash
rm ~/.claude/CLAUDE.md ~/.claude/settings.json ~/.claude/docs
```

Do not remove local files such as `~/.claude/.mcp.json` or `~/.claude/settings.local.json` unless you intentionally want to delete your local configuration.

## Verification Checklist

- [ ] `npx skills add ./skills --list` finds the expected skills.
- [ ] `~/.claude/.mcp.json` is a real file if present, not a symlink.
- [ ] `~/.claude/settings.local.json` is a real file if present, not a symlink.
- [ ] `~/.claude/skills` is a real directory managed by `npx skills`.
- [ ] `~/.claude/CLAUDE.md` points to `config/claude/CLAUDE.md` or another intentional local config.
- [ ] Claude Code starts and `/skills` shows installed skills.

## Troubleshooting

### `npx skills` installs to an unexpected agent

Specify the agent explicitly:

```bash
npx skills add ./skills -g -a claude-code --skill '*' -y
```

### Existing real config was not replaced

The installer skips real local files by default. Use:

```bash
scripts/install-claude.sh --force-config
```

This backs up the existing path before replacing it.

### Broken old symlink remains

Run:

```bash
find ~/.claude -maxdepth 1 -type l -exec sh -c 'for p; do test -e "$p" || echo "$p -> $(readlink "$p")"; done' sh {} +
```

Then rerun:

```bash
scripts/install-claude.sh
```
