---
name: rpi-plan
description: "Use after /rpi-research when you want an interactive, gated plan-creation flow. Produces a dw-05-format plan.md at ~/notes/context-engineering/<repo>/<slug>/ that /rpi-implement can execute. Interactive: presents understanding, design options, phase outline, then draft — each gated on user approval."
---

# /rpi-plan

Create an implementation plan through an interactive, gated flow. Consumes `research.md` from `/rpi-research` if present; otherwise dispatches light inline research. Writes a dw-05-format plan ready for `/rpi-implement`.

**RPI principle:** Research documents what **is**. Plan decides what **should change**. Implement performs the **change** and verifies it.

**Use this when:** you've finished `/rpi-research` and want to turn the findings into an implementation-ready plan with explicit user gates for understanding, design choice, phase structure, and final draft review.

**Announce at start:** "Starting /rpi-plan."

## Core Principle: Gated, Not Single-Shot

Plans built in one shot tend to bake in assumptions. This skill enforces **four explicit gates** so you can correct course before the plan crystallizes:

1. **Understanding gate** — present what's understood; resolve open questions
2. **Design option gate** — present 2-4 options grounded in research; pick one
3. **Phase outline gate** — confirm phase boundaries before writing details
4. **Draft review gate** — iterate on the written plan until satisfied

Each gate uses `AskUserQuestion`.

## Setup

1. Run `~/.claude/skills/deep-work/dw-setup.sh "<slug>"` (extract `<slug>` from `$ARGUMENTS`). Parse stdout for `REPO`, `TOPIC_SLUG`, `ARTIFACT_DIR`.
   - If exit 2, `AskUserQuestion` for slug.

## Pre-flight Validation

- If `<ARTIFACT_DIR>/plan.md` exists, `AskUserQuestion`: **Overwrite** / **New slug** / **Abort**.
- Check `<ARTIFACT_DIR>/research.md` — note presence; it determines Step 1's branch below.

## Process

### Step 1: Load context

**Branch A — research.md exists:**
1. Read `<ARTIFACT_DIR>/research.md` fully.
2. Read every file referenced under `## Code References` whose contents will materially shape the plan. Use the `Read` tool with no offset/limit on the most relevant 3-5 files; skim the rest.
3. Skip to Step 2.

**Branch B — no research.md:**
1. Read any files the user mentioned in `$ARGUMENTS` after the slug, fully.
2. Dispatch parallel sub-agents in a single message:
   - `codebase-locator` — find files related to the brief
   - `codebase-analyzer` — analyze the most relevant component
   - `codebase-pattern-finder` (conditional) — find similar implementations if the brief implies "add another X like Y"
3. Wait for all to return. Read the files they identified.
4. If research surfaces non-obvious tradeoffs (multiple plausible approaches), STOP and `AskUserQuestion`: **Abort and run /rpi-research first** / **Continue and surface options at Gate 2**.

### Step 2: Gate 1 — Understanding

Present a focused summary:

```
Based on <research.md | inline research>, here's what I understand:

- <current implementation detail with file:line>
- <key pattern or constraint discovered>
- <potential complexity / edge case>

Open questions I couldn't resolve from the code:
- <question 1>
- <question 2>
```

Use `AskUserQuestion` for each open question (batch when ≤4 questions; otherwise prioritize the load-bearing ones). Only ask questions code can't answer — don't waste a gate on things you could verify with one more file read.

If the user corrects a stated understanding, **verify the correction by reading the relevant code** before accepting it. Do not just take dictation.

### Step 3: Gate 2 — Design Option Pick

Surface 2-4 plausible approaches, each citing research findings as evidence. Skip this gate only if there's genuinely one obvious approach (and say so explicitly).

For each option:

```
**Option A: <name>**
- Approach: <one sentence>
- Evidence: <file:line refs from research showing why this fits>
- Tradeoffs: <pros / cons>

**Option B: <name>**
...
```

Use `AskUserQuestion` with the options as choices. Capture the user's pick + rationale in a buffer — it will land in the plan's header.

### Step 4: Gate 3 — Phase Outline

Propose phase boundaries (1-line each). Each phase must be **independently testable** and produce a working unit.

```
Proposed phasing:

1. <Phase 1 name> — <what it produces; validation command>
2. <Phase 2 name> — <what it produces; validation command>
3. <Phase 3 name> — <what it produces; validation command>

Total: ~<N> tasks across <M> phases.
```

Use `AskUserQuestion`: **Confirm phasing** / **Adjust phase boundaries** / **Adjust task granularity** / **Abort**.

If the user requests adjustments, iterate until they confirm. Keep phase boundaries independently testable and adjust task granularity until the outline is clear enough to draft.

### Step 5: Gate 4 — Draft and Review

Read `./plan-template.md`, then write the plan to `<ARTIFACT_DIR>/plan.md` using that structure. Then announce:

```
Plan drafted at <path>.

Please review:
- Are tasks small enough for one fresh subagent to complete safely, with clear tests/validation?
- Are success criteria specific and runnable?
- Anything missing or out of scope to drop?
```

Iterate via Edit until the user signals satisfaction. **No open questions in the final plan** — if something is unresolved, return to Gate 2 or 3.

## Plan Template (dw-05 format)

Read `./plan-template.md` and use that exact structure for `<ARTIFACT_DIR>/plan.md`. The template includes required execution progress fields, task/phase format, and task granularity guidance.

## Completion

1. Confirm artifact path, phase count, task count.
2. Instruct: "Plan ready at `<ARTIFACT_DIR>/plan.md`. Review once more, then run `/rpi-implement <slug>` to execute."

## Red Flags

**Stop and reconsider if:**
- A gate gets skipped because "the user will catch it later" — gates exist because they're cheaper than fixing the plan after implementation starts.
- An option at Gate 2 has no evidence from research — that's a design hunch, not a grounded option. Either find the evidence or drop the option.
- The plan would contain placeholders or "TBD" — return to the appropriate gate; placeholders become bugs.
- The plan is becoming vague because the scope is large — tighten phase boundaries, task granularity, success criteria, and scope guards before drafting.

## Notes on the four-gate flow

Gates aren't ceremony — each one prevents a specific failure mode:

| Gate | Prevents |
|------|----------|
| Understanding | Planning around a misread of current state |
| Design option | Locking in an approach the user wouldn't have picked |
| Phase outline | Phases that aren't independently testable or are wrongly ordered |
| Draft review | Tasks too vague for `/rpi-implement` to dispatch cleanly |

If a gate feels redundant in a given session (e.g., the user gave the design decision upfront), state the assumption explicitly and ask once for confirmation rather than skipping silently.
