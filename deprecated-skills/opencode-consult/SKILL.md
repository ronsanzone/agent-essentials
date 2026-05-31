---
name: opencode-consult
description: >
  Consult opencode for a second opinion on design, review, or analysis.
  Building block skill — invoke when another skill or the user requests
  consultation. Uses server mode for observability (attach via TUI or browser).
---

# OpenCode Consult

## Overview

Consult opencode for a second opinion during any task. Claude remains the decision-maker;
opencode provides an independent perspective using a different model.

Results are captured via subagent to protect the main conversation context. The opencode
server runs in persistent mode so you can observe consultations via TUI or web browser.

**This skill is a building block.** It does not decide when to consult — the calling
context (user, pipeline skill, or Claude's judgment) makes that call.

## Prerequisites

- `opencode` CLI installed and on `$PATH`
- At least one provider configured (`opencode auth list` to verify)
- `curl` available (used by server health check)

## Server Lifecycle

The opencode server is managed by a system launch process on port `4096`. This skill does
**not** start the server — it only verifies it is running. If the server is down, the skill
fails immediately.

Before the first consultation, verify the server is available:

```bash
~/.claude/skills/opencode-consult/check-server.sh [port]
```

| Argument | Default | Description |
|----------|---------|-------------|
| `port` | `4096` | Port for the opencode web server |

The script returns the server URL on success, or exits `1` with an error if the server
is not reachable. If it fails, check that the system launch process is configured and running.

## Consultation Pattern

### Step 1: Spawn a subagent

Claude spawns a `general-purpose` subagent with three things:
1. Instructions to verify the server is reachable (fail if not)
2. The consultation prompt (see Prompt Framing below)
3. Instructions to return the structured output format

### Step 2: Subagent runs the consultation

```bash
# Verify server is running (exits 1 if not)
SERVER_URL=$(~/.claude/skills/opencode-consult/check-server.sh)

# Resolve project directory and model
PROJECT_DIR=$(git rev-parse --show-toplevel)
MODEL="${OPENCODE_REVIEW_MODEL:-github-copilot/gpt-5.4}"

# Run the consultation
opencode run --attach "$SERVER_URL" --dir "$PROJECT_DIR" -m "$MODEL" "Your prompt here"
```

**`--dir` is required.** The opencode server runs with `/` as its cwd (system launch
process). Without `--dir`, the consulted model cannot find project files or run git
commands.

**`--file` for static prompts (optional).** If the calling skill has a static prompt
file (e.g., a review rubric), append `--file path/to/prompt.md`. The inline string
carries dynamic context; the file carries the reusable rubric:

```bash
opencode run --attach "$SERVER_URL" --dir "$PROJECT_DIR" -m "$MODEL" \
  "Dynamic context here" \
  --file "$SKILL_DIR/prompt.md"
```

The subagent can also read project files (via its own Read/Grep/Glob tools) to include
relevant code context in the prompt string.

**Output contains tool call noise.** The raw output from `opencode run` includes tool
call traces (file reads, command executions) mixed with the model's response. The
subagent must extract the structured response and discard the noise when returning
to the main context.

### Step 3: Subagent returns structured result

The subagent formats and returns:

```
## OpenCode Consultation Result
**Model:** <model used>
**Session:** <session ID, if available>
**Question:** <what was asked>

### Response
<OpenCode's response, summarized if lengthy>

### Key Points
- <bullet summary of actionable insights>
```

### Step 4: Claude synthesizes

Claude in the main context receives the summary and decides how to use it.
The consultation is advisory — Claude makes the final call.

## Prompt Framing

Frame consultation questions with context so the consulted model understands its role:

```
You are being consulted as a second opinion. Here's the context:

**Task:** <what we're working on>
**Question:** <specific thing we want your perspective on>
**Constraints:** <relevant constraints you should know>

Provide your analysis. Be direct and specific.
```

**Grounding tip:** The consulted model has full read access to the project but will only
use it if the prompt requires it. Conceptual questions get conceptual answers. For
code-grounded analysis, explicitly ask the model to read specific files or run commands
(e.g., "Read `src/handler.go` and identify edge cases" or "Run `git log --oneline -10`
and summarize recent changes").

## Session Management

| Mode | How | When to Use |
|------|-----|-------------|
| New session | _(default, no extra flags)_ | Default. Clean context per consultation. |
| Continue session | Add `--continue` or `-s <session-id>` | Multiple related consultations in the same phase. OpenCode retains prior context. |
| Fork session | Add `--fork` with `--continue` or `-s` | Branch from a prior session to explore an alternative without losing the original. |

The calling context decides which mode to use. Default to new sessions unless
there's a specific reason to continue or fork.

## Configuration

| Setting | Default | Override |
|---------|---------|---------|
| Port | `4096` | First argument to `check-server.sh` |
| Model | `github-copilot/gpt-5.4` | `OPENCODE_REVIEW_MODEL` env var, or `-m` flag |
| Project dir | _(from `git rev-parse`)_ | `--dir` flag on `opencode run` |
| Static prompt | _(none)_ | `--file` flag on `opencode run` |

## Observability

Because the skill uses `opencode web` (server mode), you can observe consultations:

- **Browser:** Open `http://localhost:4096` to see the web UI with all sessions
- **TUI:** Run `opencode attach http://localhost:4096` from any terminal
- **Session history:** All consultations persist as sessions, reviewable after the fact

## Example Invocations

**Simple one-shot consultation (subagent prompt):**

> Verify the opencode server is running by executing `~/.claude/skills/opencode-consult/check-server.sh`. If it fails, stop and report that the server is not available.
> Then run: `PROJECT_DIR=$(git rev-parse --show-toplevel) && MODEL="${OPENCODE_REVIEW_MODEL:-github-copilot/gpt-5.4}" && opencode run --attach http://localhost:4096 --dir "$PROJECT_DIR" -m "$MODEL" "We're designing an error handling strategy for a CLI tool. The current approach uses panic/recover. Should we switch to explicit error returns? The codebase is Go, ~15k LOC."`
> Extract the structured response from the output (discard tool call traces) and return using the structured output format documented in this skill.

**With a static prompt file (e.g., adversarial review rubric):**

> Run: `opencode run --attach http://localhost:4096 --dir "$PROJECT_DIR" -m "$MODEL" "Review the plan at docs/plan.md. Verify file paths against the codebase." --file ~/.claude/skills/adversary-plan-review-opencode/prompt.md`

**Continuing a prior session:**

> Run: `opencode run --attach http://localhost:4096 --dir "$PROJECT_DIR" -m "$MODEL" --continue "Based on your earlier analysis, what specific functions should we refactor first?"`
