# Claude Essentials

Reusable agent skills and a small, safe Claude Code config overlay.

The package no longer symlinks its whole `.claude` directory into `~/.claude`. Skills are installed with the standard `npx skills` CLI, while local/runtime Claude files such as `.mcp.json` and `settings.local.json` remain real files in `~/.claude`.

## Quick Start

Install all skills globally for Claude Code:

```bash
npx skills add ronsanzone/claude-essentials -g -a claude-code --skill '*' -y
```

Or from a local checkout:

```bash
git clone git@github.com:ronsanzone/claude-essentials.git ~/code/claude-essentials
cd ~/code/claude-essentials
scripts/install-claude.sh
```

`install-claude.sh` does two things:

1. Installs skills with `npx skills`.
2. Links only safe Claude config from `config/claude/` into `~/.claude`.

It intentionally does **not** manage real secrets/runtime files:

- `~/.claude/.mcp.json`
- `~/.claude/settings.local.json`
- `~/.claude/auth.json`
- Claude plugin caches, sessions, project state, and other runtime files

## Skills Overview

### Deep-Work Pipeline Orchestrator

Runs the full deep-work pipeline in a single session using agent teams with configurable review gates.

> Note: individual deep-work phase skills and RPI skills have moved to [context-engineering-workflows](https://github.com/ronsanzone/context-engineering-workflows). This repo retains the single-session orchestrator (`/deep-work-pipeline`).

### Code Review & PR Skills

| Skill | Command | Purpose |
|-------|---------|---------|
| **quick-review** | `/quick-review` | Single-pass expert review with severity-ranked findings |
| **local-code-review** | `/local-code-review` | Local code review of working tree changes |
| **submit-pr** | `/submit-pr` | Create or update draft PRs with generated descriptions |
| **yeet** | `/yeet` | One-shot Jira + commit + push + draft PR workflow |

### Workflow Skills

| Skill | Command | Purpose |
|-------|---------|---------|
| **refine-ticket** | `/refine-ticket` | Refine Jira/pasted/file ticket context into `ticket.md` |
| **investigate-and-fix** | `/investigate-and-fix` | Lightweight investigate → plan → implement workflow |
| **session-retrospective** | `/session-retrospective` | Analyze session process efficiency |
| **quiz** | `/quiz` | Tutor/quiz the user on session or topic understanding |

### Reporting & Presentation

| Skill | Command | Purpose |
|-------|---------|---------|
| **code-tour** | `/code-tour` | Generate an interactive HTML tour of a PR, branch, or feature |
| **html-report** | `/html-report` | Render compiled content as a self-contained HTML technical report |

### Plannotator Skills

| Skill | Command | Purpose |
|-------|---------|---------|
| **plannotator-annotate** | `/plannotator-annotate` | Open Plannotator annotation UI for files/URLs/folders |
| **plannotator-last** | `/plannotator-last` | Annotate the latest assistant message |
| **plannotator-review** | `/plannotator-review` | Open Plannotator code review UI |

## Install Options

List available skills without installing:

```bash
npx skills add ronsanzone/claude-essentials --list
```

Install one skill:

```bash
npx skills add ronsanzone/claude-essentials -g -a claude-code --skill quick-review -y
```

Install for multiple agents:

```bash
npx skills add ronsanzone/claude-essentials -g -a claude-code -a pi --skill '*' -y
```

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
scripts/install-claude.sh --agent claude-code --agent pi
```

## Directory Structure

```text
claude-essentials/
├── skills/                         # canonical Agent Skills package source
│   ├── code-tour/
│   ├── deep-work-pipeline/
│   ├── html-report/
│   ├── investigate-and-fix/
│   ├── local-code-review/
│   ├── plannotator-*/
│   ├── quick-review/
│   ├── quiz/
│   ├── refine-ticket/
│   ├── session-retrospective/
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
npx skills add . --list
```

## Requirements

- Claude Code CLI for Claude usage
- Node/npm for `npx skills`
- `gh` CLI for GitHub/PR-related skills
- `plannotator` CLI for Plannotator skills

## License

MIT
