# Agent Essentials

Reusable agent skills, the global rules shared by Claude Code, OpenCode and Pi, plus a small Claude Code config overlay (CLAUDE.md, settings, hooks, agents, mods). Everything the repo owns is **symlinked** into place, so edits here are live in Claude Code and pi immediately and nothing else can silently overwrite them.

## Quick start

```bash
git clone git@github.com:ronsanzone/agent-essentials.git ~/code/agent-essentials
cd ~/code/agent-essentials
scripts/install-claude.sh            # add --dry-run first if you like
```

The installer links:

| Target | Source |
|---|---|
| `~/.agents/skills/<name>` | `skills/<name>` (shared store; pi reads it directly) |
| `~/.claude/skills/<name>` | `../../.agents/skills/<name>` |
| `~/.claude/agents/<name>.md` | `config/claude/agents/<name>.md` |
| `~/.claude/hooks/<name>.sh` | `config/claude/hooks/<name>.sh` |
| `~/.claude/CLAUDE.md`, `~/.claude/settings.json`, `~/.claude/mods` | `config/claude/` |
| `~/.config/opencode/AGENTS.md`, `~/.pi/agent/AGENTS.md` | `config/shared/AGENTS.md` |

It never touches `~/.claude/.mcp.json`, `~/.claude/settings.local.json`, auth, plugin caches, or sessions, and it leaves store entries from other sources alone (they show up in the drift report it prints at the end). `--prune` removes store entries for anything in `deprecated-skills/`. See [INSTALL.md](INSTALL.md).

## Skills

"model + `/name`" skills load their description into every session and fire on matching requests; "user" skills only run when typed.

| Skill | Invoked by | Purpose |
|---|---|---|
| **babysit-pr** | model + `/babysit-pr` | Babysit a PR to green — one full pass of sweep, triage, fix, push, report |
| **ci-triage** | model + `/ci-triage` | `ci-triage report/wait/patch`: one-command CI brief for a PR or Evergreen run (merge queue included), blocking wait, scoped early-signal patches |
| **blast-radius** | user (`/blast-radius`) | Find what a change could break beyond the diff, and prove the one fact it's safe because of by running real code |
| **bruh** | user (`/bruh`) | Restate the last message in plain human language, with no jargon |
| **cleanup-prs** | model + `/cleanup-prs` | Close out Jira tickets whose code is already merged, after you confirm |
| **create-verification-skill** | user (`/create-verification-skill`) | Generate a project-local verification skill that drives your app the way a user does |
| **creating-motion-visuals** | user (`/creating-motion-visuals`) | Create motion visuals with Psychopomp |
| **executor-usage** | model + `/executor-usage` | Executor 2 calling pattern, known tool paths (Jira, Confluence, Evergreen, Glean), result unwrapping |
| **handoff** | model + `/handoff` | Write a handoff doc for another session or model |
| **maintain-verification-skill** | user (`/maintain-verification-skill`) | Periodic pass that keeps a project's verification skill and feature map honest |
| **recall** | model + `/recall` | Recall prior work from the `trail` index (`~/code/trail`), its notes and live git/gh state |
| **review** | user (`/review`) | Fast single-pass code review of a PR, branch, ref range, or working tree |
| **show-me** | model + `/show-me` | Help the user understand the current topic visually with concise diagrams and focused HTML artifacts |
| **software-design-philosophy** | model + `/software-design-philosophy` | Evaluate code and designs using *A Philosophy of Software Design* |
| **submit-pr** | model + `/submit-pr` | Create or update a draft PR (resolves the 10gen remote; never assumes `origin`) |
| **why** | user (`/why`) | Design rationale from the historical record |
| **yeet** | user (`/yeet`) | One-shot end-of-session ship — commit, ticket, push, draft PR via submit-pr |

Retired skills live in `deprecated-skills/`; `scripts/install-claude.sh --prune` removes them from the store.

Structured research → design → implementation pipelines live in [context-engineering-workflows-v2](https://github.com/ronsanzone/context-engineering-workflows-v2); MMS-specific QA skills live in the employees repo. `vendor-skills.lock.json` records provenance for skills vendored from other repos (cursor/plugins pstack, dmmulroy).

## Shared rules (`config/shared/AGENTS.md`)

One set of global rules for all three harnesses: simplicity and precedent, execution discipline (prove it works, proportional verification, do it yourself, prove reachability), git remotes (never assume `origin`), provenance and confidentiality, `trail` first, integrations (Executor; obs CLIs for Grafana/Splunk/PagerDuty), writing for people, communication style. Claude Code imports it from `CLAUDE.md`; OpenCode and Pi read it as their global `AGENTS.md`. Harness-specific additions stay in each harness (Claude: `CLAUDE.md`; Pi: pi-essentials `agent/APPEND_SYSTEM.md`).

## Config overlay (`config/claude/`)

- `CLAUDE.md` — imports the shared rules, adds Claude-only subagent routing and Executor tool names.
- `settings.json` — permissions (`defaultMode: auto`), model/effort, hooks. Machine-specific hooks and paths go in `settings.local.json` (see the `.example`).
- `hooks/guards.sh` — PreToolUse guards: untracked `.md` inside a work monorepo → ask; `--clean-db`, `reset --hard`, force push → ask; `rm` under `~/.claude/projects/*/memory` → deny.
- `agents/` — `codebase-analyzer` (model inherit), `codebase-locator`, `codebase-pattern-finder`, `web-search-researcher`.
- `mods/` — local Claude Code mods loaded via `CLAUDE_CODE_PLUGIN_DIRS`: `ci-band` (`/ci` PR/CI status band), `artifact-tray`.
- Claude Code writes `/model`, `/effort` and plugin changes through the `settings.json` symlink, so those land in this repo: commit or revert them.

## OpenCode plugins (`config/opencode/`)

`plugins.txt` lists the OpenCode plugins this repo owns, one spec per line. `scripts/install-opencode-plugins.sh` runs `opencode plugin add` for each missing entry (idempotent; `--update` refreshes all of them; `--dry-run` previews). Plugins installed outside the list are never touched. `opencode-vim` (vim-style prompt editing + session navigation) is the first entry.

## Layout

```text
agent-essentials/
├── skills/<name>/SKILL.md[, references/, scripts/]   # one dir per skill
├── deprecated-skills/                                # retired; `--prune` removes them from the store
├── config/shared/AGENTS.md                         # global rules for Claude Code, OpenCode, Pi
├── config/claude/
│   ├── CLAUDE.md  settings.json  settings.local.json.example  mcp.json.example
│   ├── agents/*.md
│   ├── hooks/guards.sh
│   └── mods/                                        # ci-band, artifact-tray
├── config/opencode/
│   └── plugins.txt                                   # opencode plugins owned here
├── scripts/install-claude.sh  install-opencode-plugins.sh
├── vendor-skills.lock.json
├── README.md  INSTALL.md
```

## Adding a skill

Create `skills/<name>/SKILL.md` with `name` and `description` frontmatter (description = trigger phrases only, ≤150 chars; body = rules, evidence bar, output shape; long material in `references/`). Add `disable-model-invocation: true` only for verbs you will type. Re-run `scripts/install-claude.sh`. Check two weeks later whether it fired; if not, deprecate it.

## Requirements

Claude Code CLI · `gh` · `jq` (hooks) · `trail` · `plannotator` plugin (installed separately) for plan/diff annotation · Executor 2 (MCP at `127.0.0.1:4312`, registered at Claude user scope).

## License

MIT
