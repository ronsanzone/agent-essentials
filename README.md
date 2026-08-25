# Agent Essentials

Reusable agent skills and a small, safe Claude Code config overlay.

The package installs from its central `skills/` folder with the standard `npx skills` CLI, while local/runtime Claude files such as `.mcp.json` and `settings.local.json` remain real files in `~/.claude`.

## Quick Start

Install all skills globally for Claude Code:

```bash
npx skills add ronsanzone/agent-essentials/skills -g -a claude-code --skill '*' -y
```

Or from a local checkout:

```bash
git clone git@github.com:ronsanzone/agent-essentials.git ~/code/agent-essentials
cd ~/code/agent-essentials
scripts/install-claude.sh
```

`install-claude.sh` does three things:

1. Installs skills from `skills/` with `npx skills`, then syncs `skills/` into the shared `~/.agents/skills` store (the CLI does not refresh the store from a local path).
2. Keeps `~/.claude/skills/<name>` as links into that shared store.
3. Links only safe Claude config from `config/claude/` into `~/.claude`.

It intentionally does **not** manage real secrets/runtime files:

- `~/.claude/.mcp.json`
- `~/.claude/settings.local.json`
- `~/.claude/auth.json`
- Claude plugin caches, sessions, project state, and other runtime files

## Skills Overview

### Context Engineering Workflows

The structured research/design/implementation workflows are maintained separately in [context-engineering-workflows-v2](https://github.com/ronsanzone/context-engineering-workflows-v2). Install that package independently; this repository owns reusable general-purpose skills and Claude configuration.

### Code Review & PR Skills

| Skill | Command | Purpose |
|-------|---------|---------|
| **review** | `/review` | Fast single-pass review of a PR, branch, range, or working tree; severity-ranked findings plus a dismissed list |
| **submit-pr** | `/submit-pr` | Create or update draft PRs with generated descriptions |
| **yeet** | `/yeet` | One-shot Jira + commit + push + draft PR workflow |

### Workflow Skills

| Skill | Command | Purpose |
|-------|---------|---------|
| **quiz** | `/quiz` | Tutor/quiz the user on session or topic understanding |

### Verification Skills

Vendored from [cursor/plugins pstack](https://github.com/cursor/plugins/tree/main/pstack) (MIT); provenance in `vendor-skills.lock.json`.

| Skill | Command | Purpose |
|-------|---------|---------|
| **create-verification-skill** | `/create-verification-skill` | Generate a project-local `verify-<app>` skill that drives the real app and captures proof, plus a per-feature map |
| **maintain-verification-skill** | `/maintain-verification-skill` | Periodic pass that keeps a `verify-<app>` skill and its feature map honest against the current app |

### Investigation Skills

Vendored from [cursor/plugins pstack](https://github.com/cursor/plugins/tree/main/pstack) (MIT) and adapted to Claude Code + the executor MCP; provenance in `vendor-skills.lock.json`.

| Skill | Command | Purpose |
|-------|---------|---------|
| **why** | `/why` | Why was this built this way: one investigator per evidence source (git/gh, Jira, Confluence, Glean, Grafana, Splunk, PagerDuty, Evergreen), cited and confidence-tiered |
| **blast-radius** | `/blast-radius` | What a small change could break elsewhere, with the one safety fact proven by running code |
| **show-me-your-work** | `/show-me-your-work` | Append-only TSV decision trail for long or unattended runs, audited against the transcript |

### Reporting & Presentation

| Skill | Command | Purpose |
|-------|---------|---------|
| **code-tour** | `/code-tour` | Generate a self-contained HTML tour of a PR, branch, or feature |

### Plannotator Skills

| Skill | Command | Purpose |
|-------|---------|---------|
| **plannotator-annotate** | `/plannotator-annotate` | Open Plannotator annotation UI for files/URLs/folders |
| **plannotator-last** | `/plannotator-last` | Annotate the latest assistant message |
| **plannotator-review** | `/plannotator-review` | Open Plannotator code review UI |

## Install Options

List available skills without installing:

```bash
npx skills add ronsanzone/agent-essentials/skills --list
```

Install one skill:

```bash
npx skills add ronsanzone/agent-essentials/skills -g -a claude-code --skill review -y
```

Install for multiple non-Pi agents:

```bash
npx skills add ronsanzone/agent-essentials/skills -g -a claude-code -a codex -a opencode --skill '*' -y
```

Pi discovers the shared global store at `~/.agents/skills` automatically. Do not pass `-a pi` while `~/.pi/agent/skills` is intentionally absent.

Install safe Claude config plus skills from a checkout:

```bash
scripts/install-claude.sh
```

Useful installer flags:

```bash
scripts/install-claude.sh --dry-run
scripts/install-claude.sh --skills-only
scripts/install-claude.sh --config-only
scripts/install-claude.sh --force-config
scripts/install-claude.sh --agent claude-code --agent codex --agent opencode
```

## Directory Structure

```text
agent-essentials/
├── skills/                         # canonical reusable Agent Skills package source
│   ├── code-tour/
│   ├── plannotator-*/
│   ├── review/
│   ├── quiz/
│   ├── submit-pr/
│   └── yeet/
├── config/claude/                  # safe Claude Code config overlay
│   ├── CLAUDE.md
│   ├── settings.json
│   ├── settings.local.json.example
│   ├── mcp.json.example
│   └── docs/
├── deprecated-skills/
├── scripts/
│   ├── install-claude.sh
│   └── link-claude-files.sh        # compatibility shim
├── README.md
└── INSTALL.md
```

## Dot Integration

For `~/code/dot`, the profile apply command should be:

```bash
DOT_ITEM_claude_essentials_APPLY="./scripts/install-claude.sh"
```

This keeps `dot down` as the orchestration command while avoiding whole-directory Claude symlinks.

## Adding New Skills

Create a directory under `skills/` with a `SKILL.md` file:

```yaml
---
name: my-skill
description: Use when ...
---
```

Validate discovery:

```bash
npx skills add ./skills --list
```

## Requirements

- Claude Code CLI for Claude usage
- Node/npm for `npx skills`
- `gh` CLI for GitHub/PR-related skills
- `plannotator` CLI for Plannotator skills

## License

MIT
