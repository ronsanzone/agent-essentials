# Agent Essentials

Reusable agent skills plus a small Claude Code config overlay (CLAUDE.md, settings, hooks, agents). Everything the repo owns is **symlinked** into place, so edits here are live in Claude Code and pi immediately and nothing else can silently overwrite them.

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
| `~/.claude/CLAUDE.md`, `~/.claude/settings.json` | `config/claude/` |

It never touches `~/.claude/.mcp.json`, `~/.claude/settings.local.json`, auth, plugin caches, or sessions, and it leaves store entries from other sources alone (they show up in the drift report it prints at the end). `--prune` removes store entries for anything in `deprecated-skills/`. See [INSTALL.md](INSTALL.md).

## Skills

"model + `/name`" skills load their description into every session and fire on matching requests; "user" skills only run when typed.

| Skill | Invoked by | Purpose |
|---|---|---|
| **babysit-pr** | model + `/babysit-pr` | Babysit a PR to green — one full pass of sweep, triage, fix, push, report |
| **blast-radius** | user (`/blast-radius`) | Find what a change could break somewhere else before it ships, beyond the diff, and prove the one fact it's safe because of by running real code instead of writing it up |
| **bruh** | user (`/bruh`) | Restate the last message in plain human language, with no jargon |
| **cleanup-prs** | model + `/cleanup-prs` | Close out Jira tickets whose code is already merged — scan your merged PRs for ticket keys, list the open ones, resolve them after you confirm |
| **code-tour** | model + `/code-tour` | Deep end-to-end tour of a PR, branch, or subsystem as one self-contained HTML doc |
| **create-verification-skill** | user (`/create-verification-skill`) | Generate a project-local verification skill that drives your app the way a user does — any language, framework, or platform |
| **creating-motion-visuals** | model + `/creating-motion-visuals` | Create motion visuals with Psychopomp using its psychopomp and explainer-motion project skills |
| **domain-modeling** | model + `/domain-modeling` | Build and sharpen a project's domain model |
| **executor-usage** | model + `/executor-usage` | Load before using Executor integrations — passthrough search/invoke or the client's execute sandbox |
| **grilling** | model + `/grilling` | Grill the user relentlessly about a plan, decision, or idea |
| **handoff** | model + `/handoff` | Write a handoff doc for another session or model |
| **herdr** | model + `/herdr` | Control herdr from inside it — list/split panes, spawn agents in sibling panes, read their output, wait for output or agent status |
| **maintain-verification-skill** | user (`/maintain-verification-skill`) | Periodic pass that keeps a project's verification skill and feature map honest: parallel source readers per feature, one live session driving every feature, at most one PR of proven corrections |
| **pr-report** | model + `/pr-report` | Report every open PR you own — verdict, blocker, and who holds the ball — then hand the ones needing work to babysit-pr |
| **recall** | model + `/recall` | Recall prior work for a topic from the `trail` index (`~/code/trail`), the notes it points to and live git/gh state: locate a session or worktree, brief where work stands, or gather what earlier sessions found |
| **reflect** | user (`/reflect`) | Three parallel reviewers (judgment, tooling, divergent) mine the current transcript for durable learnings; a synthesizer routes each to a skill edit you approve |
| **review** | user (`/review`) | Fast single-pass code review of a PR, branch, ref range, or working tree |
| **show-me-your-work** | user (`/show-me-your-work`) | Keep a reviewable decision trail for long-running or unattended work: a TSV log with one row per decision (what, why, evidence, result) |
| **session-mine** | model + `/session-mine` | Mine Claude Code + pi transcripts: per-skill usage by month (`usage` mode, the 2-week check for new skills) or a cited friction / boilerplate / skill-candidate report (`full` mode) |
| **software-design-philosophy** | model + `/software-design-philosophy` | Evaluate code and designs using principles and red flags from *A Philosophy of Software Design* |
| **brief** | model + `/brief` | Coordinator→implementer brief another session executes unattended: pinned sha, Decided, Rules, commit groups with Checks, Out of scope, Done when; plus the progress/questions/results companion-file contract |
| **spawn** | model + `/spawn` | Start an implementer for a brief in its own worktree + herdr pane (`claude --effort high` default), send the kickoff, watch questions/status via Monitor, write the coordinator review |
| **show-me** | model + `/show-me` | Help the user understand the current topic visually with concise diagrams, code-shape sketches, and focused HTML artifacts |
| **submit-pr** | model + `/submit-pr` | Create or update a draft PR |
| **why** | model + `/why` | Design rationale from the historical record — "why does X work this way", "why did we pick Y", regressions, postmortems, where a threshold came from |
| **writing-great-skills** | user (`/writing-great-skills`) | Reference for writing and editing skills well — the vocabulary and principles that make a skill predictable |
| **yeet** | user (`/yeet`) | One-shot end-of-session ship — commit relevant changes, resolve the ticket, push, open a draft PR via submit-pr |

Structured research → design → implementation pipelines live in [context-engineering-workflows-v2](https://github.com/ronsanzone/context-engineering-workflows-v2); MMS-specific QA skills live in the employees repo. `vendor-skills.lock.json` records provenance for skills vendored from other repos (cursor/plugins pstack, dmmulroy).

## Config overlay (`config/claude/`)

- `CLAUDE.md` — global rules: simplicity, execution discipline (prove it works, sequence verifiable units, prove reachability), notes go to `~/notes/<project>/`, subagent routing, executor pointer, communication style.
- `settings.json` — permissions (`defaultMode: auto`), model/effort, hooks. Machine-specific hooks and paths go in `settings.local.json` (see the `.example`).
- `hooks/guards.sh` — PreToolUse guards: untracked `.md` inside a work monorepo → ask; `--clean-db`, `reset --hard`, force push → ask; `rm` under `~/.claude/projects/*/memory` → deny.
- `agents/` — `codebase-analyzer` (model inherit), `codebase-locator`, `codebase-pattern-finder`, `web-search-researcher`.

## OpenCode plugins (`config/opencode/`)

`plugins.txt` lists the OpenCode plugins this repo owns, one spec per line. `scripts/install-opencode-plugins.sh` runs `opencode plugin add` for each missing entry (idempotent; `--update` refreshes all of them; `--dry-run` previews). Plugins installed outside the list are never touched. `opencode-vim` (vim-style prompt editing + session navigation) is the first entry.

## Layout

```text
agent-essentials/
├── skills/<name>/SKILL.md[, references/, scripts/]   # one dir per skill
├── deprecated-skills/                                # retired; `--prune` removes them from the store
├── config/claude/
│   ├── CLAUDE.md  settings.json  settings.local.json.example  mcp.json.example
│   ├── agents/*.md
│   └── hooks/guards.sh
├── config/opencode/
│   └── plugins.txt                                   # opencode plugins owned here
├── scripts/install-claude.sh  install-opencode-plugins.sh
├── vendor-skills.lock.json
├── README.md  INSTALL.md
```

## Adding a skill

Create `skills/<name>/SKILL.md` with `name` and `description` frontmatter (description = trigger phrases only, ≤150 chars; body = rules, evidence bar, output shape; long material in `references/`). Add `disable-model-invocation: true` only for verbs you will type. Re-run `scripts/install-claude.sh`. Check two weeks later whether it fired; if not, deprecate it.

## Requirements

Claude Code CLI · `gh` · `jq` (hooks) · `herdr` for the herdr skill · `plannotator` plugin (installed separately) for plan/diff annotation.

## License

MIT
