# Plan Template (dw-05 format)

Use this exact structure for `<ARTIFACT_DIR>/plan.md`:

```markdown
# <Topic Title> Implementation Plan

**Goal:** <one sentence>
**Architecture:** <2-3 sentences capturing the chosen design from Gate 2>
**Tech Stack:** <relevant tech>
**Spec:** <link to design doc if one exists, else omit>

## Research Context

### Brief
<original input, normalized into prose>

### Source
<one of: "Built from research.md (see ./research.md)" | "Inline research dispatched during /rpi-plan">

### Design Decision (from Gate 2)
- **Chosen:** <Option name>
- **Rationale:** <why this option won given research evidence>
- **Rejected:** <Option name> — <one-line why not>

### Files in scope
- `path/to/file.ext:LINES` — <what it does>

### Patterns to follow
- `path/to/example.ext:LINES` — <pattern name and shape>

### Constraints
- <constraint 1>

### Assumptions
- <accepted assumption or user-provided decision; distinguish from code facts above>

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

- [ ] **Step 1: Write the failing test** — <function name, inputs, expected output>
- [ ] **Step 2: Run test (expect FAIL)** — `<exact command>`
- [ ] **Step 3: Implement** — <exact names, signatures, fields>
- [ ] **Step 4: Run test (expect PASS)** — `<exact command>`
- [ ] **Step 5: Commit** — `<suggested message>`

### Phase 1 success criteria
- Automated: `<command>`
- Manual: <if any>

### Phase 1 scope guards
- Phase 1 does NOT include <X>.

---
phase: plan
date: <today, YYYY-MM-DD>
topic: <slug>
repo: <repo>
git_sha: <git rev-parse --short HEAD>
total_phases: <N>
total_tasks: <N>
status: complete
---
```

## Task and phase guidelines

- **Task granularity:** small enough for one fresh subagent to complete safely, usually 10-30 minutes, with clear tests/validation. Use TDD where practical: failing test → run (expect fail) → implement → run (expect pass) → commit.
- **Every task MUST include:** exact file paths (Create/Modify with line ranges), pattern reference, exact names/signatures/fields, test function names + I/O, validation command, commit message.
- **Phase decomposition:** each phase produces a working, testable unit with clear validation.
