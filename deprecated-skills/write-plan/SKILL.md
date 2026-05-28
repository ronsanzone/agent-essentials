---
name: write-plan
description: "Use when you have a small, well-scoped change that needs an implementation plan but doesn't warrant the deep-work pipeline's research/design phases. Use instead of investigate-and-fix when you want a durable plan artifact rather than a transient EnterPlanMode plan."
---

# /write-plan

Drafts a full dw-05-format implementation plan from a brief, a file, or a Jira key. Light inline research via codebase agents fills in file:line references and patterns; the plan lands at `~/notes/context-engineering/<repo>/<slug>/plan.md` ready for `/implement-plan <slug>`.

**Use this when:** the change is small enough that Phases 1-4 of the deep-work pipeline (research questions, research, design discussion, outline) would be overkill, but you still want a durable plan artifact, fresh-subagent-per-task implementation, and two-stage review.

**Do NOT use this when:** the change has real design questions, needs cross-session paper trail, or has a scope you can't articulate in a paragraph. Use `/dw-01-research-questions <slug>` instead.

**Announce at start:** "Starting /write-plan."

## Setup

1. Run `~/.claude/skills/deep-work/dw-setup.sh "<slug>"` (extract `<slug>` from `$ARGUMENTS`; everything after the slug is the brief input). Parse stdout for `REPO`, `TOPIC_SLUG`, `ARTIFACT_DIR`.
   - If the script exits 2 (`MISSING_SLUG` on stderr), use `AskUserQuestion` to ask the user for a topic slug, then re-run with the slug.

## Pre-flight Validation

- `<ARTIFACT_DIR>/plan.md` does NOT already exist → if it DOES, use `AskUserQuestion`:
  - **Overwrite** — proceed and clobber the existing plan
  - **New slug** — ask for a different slug, re-run Setup
  - **Abort** — stop the skill
- The brief is non-empty → if `$ARGUMENTS` after the slug is empty AND no file path was provided, use `AskUserQuestion` to ask for the brief inline.

## Process

### Step 1: Parse input

`$ARGUMENTS` after the slug is the input. Resolve it to a brief string in this order:

| Input shape | Action |
|-------------|--------|
| Matches `^[A-Z]+-[0-9]+$` (Jira key, e.g. `PROJ-12345`) | Fetch via `mcp__glean_default__search` with the key. Extract problem statement, acceptance criteria, linked context. If linked docs are referenced, optionally `mcp__glean_default__read_document` for the most relevant. |
| Existing file path (use `Read`) | Read the file. Treat full contents as the brief. |
| Otherwise | Treat as free-form pasted text. |

If Glean returns nothing useful, note the gap and proceed with what's available — do NOT block.

### Step 2: Light research

Dispatch the following subagents in parallel (single message, multiple `Agent` tool calls):

1. **`codebase-locator`** — "Find files and components related to: [key nouns from the brief]. Return file paths grouped by purpose."
2. **`codebase-analyzer`** — once locator returns, dispatch this against the most relevant component: "Analyze [path]. Document: current behavior, data flow, error handling, test coverage. Include file:line references."
3. **`codebase-pattern-finder`** (conditional — only if the brief explicitly implies an existing pattern, e.g. "add another X like Y") — "Find examples of [pattern] in the codebase. Return concrete code examples with file:line references."

Capture each agent's findings. Do NOT proceed to drafting until all dispatched agents return.

If during research you discover the change has real design questions (multiple plausible approaches with non-obvious tradeoffs), STOP and tell the user:

> "This change has design questions that should be resolved before planning: [list questions]. Recommend running `/dw-01-research-questions <slug>` instead. Abort `/write-plan`?"

Use `AskUserQuestion` with **Abort and switch to deep-work** / **Pick the obvious approach and continue** options.

### Step 3: Draft plan

Write the plan to a buffer (do not write to disk yet). Use exactly this structure:

```markdown
# <Topic Title> Implementation Plan

**Goal:** <one sentence>
**Architecture:** <2-3 sentences about approach>
**Tech Stack:** <relevant tech>

**Spec:** <link to a design doc if one exists, else omit>

## Research Context

### Brief
<original input, normalized into prose>

### Files in scope
- `path/to/file.ext:LINES` — <what it does, from codebase-analyzer findings>

### Patterns to follow
- `path/to/example.ext:LINES` — <pattern name and shape>

### Constraints
- <surfaced constraint 1>

## Execution Progress

### Phase Progress
| # | Phase | Status | Validation Command | Result |
|---|-------|--------|--------------------|--------|
| 1 | <phase name> | `[ ] NOT STARTED` | `<exact validation command>` | — |

**Status legend:** `[ ] NOT STARTED` | `[~] IN PROGRESS` | `[x] DONE` | `[!] BLOCKED`

### Task Completion
| Task | Description | Status | Committed | Deviations |
|------|-------------|--------|-----------|------------|
| **Phase 1** | | | | |
| 1.1 | <short description> | `[ ]` | — | |

**Task status legend:** `[ ]` pending | `[~]` in progress | `[x]` done | `[!]` blocked | `[-]` skipped

### Deviation Log
> Record any deviations from the plan here. Format: **Task X.Y:** <what changed> — <why> — <downstream impact>.
_No deviations recorded._

## Phase 1: <name>

### Task 1.1: <name>

**Files:**
- Create: `exact/path`
- Modify: `exact/path:LINES`
- Test: `tests/exact/path`

**Pattern:** <ref to a Files-in-scope or Patterns-to-follow entry>

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test (expect FAIL)**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run test (expect PASS)**
- [ ] **Step 5: Commit**

### Phase 1 success criteria
- Automated: <command>
- Manual: <if any>

### Phase 1 scope guards
- Phase 1 does NOT include <X>.

---
phase: plan
date: <today, YYYY-MM-DD>
topic: <slug>
repo: <repo>
git_sha: <output of `git rev-parse --short HEAD`>
total_phases: <N>
total_tasks: <N>
status: complete
---
```

**Task granularity:** 2-5 minutes each. TDD pattern: failing test → run (expect fail) → implement → run (expect pass) → commit.

**Every task MUST include:**
1. **Files:** Exact paths, action (Create/Modify), line ranges where modifying
2. **Pattern:** Reference to a research finding (e.g., "Follow `path/to/example.ext:LINES` from Patterns to follow")
3. **What to create/modify:** Exact names, signatures, fields — enough that the implementer makes no design decisions
4. **Tests:** Function names, inputs, expected outputs
5. **Validation:** Exact command + expected result
6. **Commit:** Files to include + suggested message

Phase decomposition heuristic: each phase produces a working, testable unit. A small change is often one phase with 2-5 tasks. If the plan exceeds 3 phases or 12 tasks total, the change is probably too big for `/write-plan` — recommend `/dw-01-research-questions` instead.

### Step 4: Write artifact

Write the buffered plan to `<ARTIFACT_DIR>/plan.md` using the `Write` tool. The artifact directory was created by `dw-setup.sh` in Setup.

## Completion

1. Present a summary to the user: number of phases, number of tasks, key files in scope.
2. Instruct: "Plan ready at `<ARTIFACT_DIR>/plan.md`. Review it, then run `/implement-plan <slug>` to execute."

## Red flags

**Stop and reconsider if:**
- The brief is vague enough that the plan would be full of placeholders — push back and ask for concrete specifics before drafting.
- Research surfaces multiple plausible approaches with non-obvious tradeoffs — that's a design question; route to `/dw-01-research-questions`.
- The change touches >5 files across >2 components — likely too big for `/write-plan`; route to deep-work.
