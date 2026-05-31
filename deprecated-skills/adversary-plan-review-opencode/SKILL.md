---
name: adversary-plan-review-opencode
description: >
  Use when an implementation plan needs independent adversarial review from a different
  model before implementation begins. Accepts plan file path or deep-work topic slug.
---

# Adversary Plan Review (OpenCode)

Route an implementation plan to opencode for adversarial review. The reviewing model
assumes the plan has gaps and actively looks for problems — not confirmation.

**This skill composes on `opencode-consult`.** It constructs the adversarial prompt;
opencode-consult handles the transport.

## When to Use

- Before implementing a plan — especially high-stakes or complex plans
- When you want a genuinely independent perspective (different model, different biases)
- When Claude already reviewed the plan (via `dw-05b`) and you want a second opinion

**When NOT to use:**
- For quick sanity checks — use `dw-05b-plan-review` (faster, no server dependency)
- When there's no plan file yet — this reviews existing plans, not creates them
- For code review — use `adversary-code-review-opencode` instead

## Arguments

Parse `$ARGUMENTS` as one of:
- **File path** — a path to a plan file (e.g., `path/to/plan.md`)
- **Topic slug** — a deep-work topic slug (e.g., `adversary-review-opencode`)

Detection: if the argument contains `/` or ends in `.md`, treat as file path. Otherwise
treat as topic slug.

If empty, ask user via AskUserQuestion.

## Process

### Step 1: Resolve input

**If topic slug:**

```bash
REPO=$(basename "$(git remote get-url origin 2>/dev/null | sed 's/.git$//')" 2>/dev/null || basename "$(pwd)")
ARTIFACT_DIR="$HOME/notes/context-engineering/$REPO/$SLUG"
PLAN_FILE="$ARTIFACT_DIR/05-plan.md"
```

Verify `$PLAN_FILE` exists. If not: "Plan not found at `$PLAN_FILE`. Check the topic slug." **Stop.**

List all files in `$ARTIFACT_DIR` and record which artifacts are present.

**If file path:**

Verify the file exists. If not: "Plan file not found at `$ARGUMENTS`." **Stop.**

Set `ARTIFACT_DIR` to the parent directory. Check for sibling artifacts (`00-ticket.md`,
`02-research.md`, `03-design-discussion.md`, `04-structure-outline.md`).

### Step 2: Build the inline context string

The adversarial rubric (review categories, calibration rules, severity, output format)
lives in the static file `prompt.md` alongside this skill. The inline string provides
the dynamic context — what to review and how to approach it.

**When artifact directory exists (topic slug or sibling artifacts found):**

```
You are performing an adversarial review of an implementation plan. Assume the plan
has gaps until proven otherwise. Your job is to find problems, not confirm the plan
is good.

FIRST: Read every file in <ARTIFACT_DIR>. These artifacts form the requirements chain:
- 00-ticket.md — requirements and acceptance criteria (the contract)
- 02-research.md — codebase findings, patterns, constraints
- 03-design-discussion.md — architectural decisions and scope boundaries (settled — do NOT re-litigate)
- 04-structure-outline.md — phase structure, risk register, scope guards
- 05-plan.md — the plan under review

Cross-reference the plan against ALL of these.

THEN: Read any codebase source files referenced in the plan. Verify file paths,
function signatures, and module structures against the actual codebase.
```

**When no artifact directory (bare file path, no siblings):**

```
You are performing an adversarial review of an implementation plan. Assume the plan
has gaps until proven otherwise. Your job is to find problems, not confirm the plan
is good.

Read the plan file at <PLAN_FILE>. Then read any codebase source files referenced in
the plan. Verify file paths, function signatures, and module structures against the
actual codebase.
```

(Omit Requirements Traceability from expected output since there's no ticket to trace against.)

### Step 3: Dispatch via opencode-consult

Spawn a `general-purpose` subagent that follows the `opencode-consult` dispatch pattern
(server check, `--dir`, `--file`, model env var, output noise filtering).

The subagent must:

1. Follow `opencode-consult` Step 2 to verify the server and resolve `PROJECT_DIR` and `MODEL`.

2. Run the consultation with the static rubric file:
   ```bash
   SKILL_DIR="$HOME/.claude/skills/adversary-plan-review-opencode"
   opencode run --attach "$SERVER_URL" --dir "$PROJECT_DIR" -m "$MODEL" \
     "<inline context string from Step 2>" \
     --file "$SKILL_DIR/prompt.md"
   ```

3. Filter tool call noise from the output (per opencode-consult guidance) and return:
   ```
   ## OpenCode Adversarial Plan Review
   **Model:** <model used>
   **Plan:** <plan file path>
   **Artifacts reviewed:** <list of artifact files read, or "plan only">

   ### Review Result
   <Structured review output only — verdict, findings, strengths. No tool call traces.>
   ```

### Step 4: Present result

Display the subagent's structured result to the user. Add guidance based on verdict:

- **APPROVED:** "OpenCode adversarial review found no blocking issues."
- **APPROVED WITH CONDITIONS:** "OpenCode found Important issues. Review findings above
  and decide whether to address before implementation."
- **REVISE:** "OpenCode found Critical issues. Review findings above and consider
  updating the plan."

The user decides what to do with the findings. This skill does not modify anything.

## Configuration

| Setting | Default | Override |
|---------|---------|---------|
| Model | `github-copilot/gpt-5.4` | `OPENCODE_REVIEW_MODEL` env var |
| Port | `4096` | First argument to `check-server.sh` |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Reviewing a plan without the ticket/artifacts | Half the value is cross-referencing. Always use topic slug when artifacts exist. |
| Prompt too long for large plans | If the plan exceeds ~50 tasks, split the review — send one phase at a time and ask opencode to review each independently. |
| Treating opencode findings as authoritative | OpenCode is advisory. Findings may be wrong — the reviewing model lacks Claude's context. Always verify findings before acting. |
| Re-running without addressing prior findings | If a previous review found issues, fix them first. Don't hope a second run will disagree. |

## Failure Handling

| Failure | What to Tell the User |
|---------|----------------------|
| `check-server.sh` exits 1 | "OpenCode server is not running on port 4096. Start it before retrying." |
| `opencode run` returns empty output | "OpenCode returned no response. The server may have timed out or the model may be unavailable. Check the opencode web UI at http://localhost:4096 for session details." |
| `opencode run` returns truncated/garbled output | "OpenCode response appears incomplete. The prompt may be too long for the model's context. Try reviewing a smaller scope (single phase or subset of tasks)." |
| Subagent fails for any other reason | "Consultation failed. Check that opencode is configured correctly (`opencode auth list`) and the server is healthy." |
