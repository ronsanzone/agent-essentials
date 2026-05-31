---
name: rpi-research
description: "Use when starting the RPI flow and you want to deeply understand a question, system, or feature by reading the codebase before planning. Produces a durable research artifact at ~/notes/context-engineering/<repo>/<slug>/research.md that rpi-plan consumes."
---

# /rpi-research

Conduct comprehensive read-only research on a question or feature by dispatching parallel sub-agents and synthesizing findings into a single durable research document.

**RPI principle:** Research documents what **is**. Plan decides what **should change**. Implement performs the **change** and verifies it.

**Use this when:** starting the RPI flow and you want a reusable, code-grounded research artifact before planning — e.g. when ramping on a system, investigating a feature area, or gathering objective facts for a later implementation plan.

**Announce at start:** "Starting /rpi-research."

## CRITICAL: Documentarian Stance

You and all dispatched sub-agents are documenting **what exists**, not what should exist.

- DO NOT propose changes, fixes, refactors, or improvements unless the user explicitly asks.
- DO NOT critique the implementation, surface "issues", or recommend alternatives.
- DO describe what exists, where, how it works, and how pieces connect.
- DO surface open questions in the artifact's Open Questions section — but as questions, not as veiled critique.

This stance is what makes the artifact reusable by `/rpi-plan` (and future readers) without baked-in bias.

## Setup

1. Run `~/.claude/skills/deep-work/dw-setup.sh "<slug>"` (extract `<slug>` from `$ARGUMENTS`; everything after the slug is the research query). Parse stdout for `REPO`, `TOPIC_SLUG`, `ARTIFACT_DIR`.
   - If the script exits 2 (`MISSING_SLUG`), use `AskUserQuestion` to ask for a slug, then re-run.

## Pre-flight Validation

- If `<ARTIFACT_DIR>/research.md` already exists, use `AskUserQuestion`:
  - **Follow-up append** — add a new timestamped section to the existing file
  - **Overwrite** — start fresh
  - **New slug** — re-run Setup with a different slug
  - **Abort** — stop
- If `$ARGUMENTS` after the slug is empty, use `AskUserQuestion` to ask for the research query inline.

## Process

### Step 1: Parse input and read mentioned files

`$ARGUMENTS` after the slug is the research query. If the query mentions specific files (tickets, docs, JSON, source files), **read them fully** with the `Read` tool (no `offset`/`limit`) before dispatching any sub-agents. The main context needs full grounding before decomposition.

If the query is solution-shaped ("how should we implement X", "replace A with B"), normalize it into neutral codebase questions before decomposition: what exists, where it is used, how it works, and what patterns already exist. Preserve the original query in the artifact, but dispatch research on the neutralized questions.

### Step 2: Decompose into research areas

Break the query into 3-6 composable research areas. Examples:
- "Where does X live?" → `codebase-locator`
- "How does Y work?" → `codebase-analyzer`
- "Is there a pattern like Z?" → `codebase-pattern-finder`
- "What's the history of W?" → `git log` / `git blame` + `mcp__glean_default__search`
- "How do other systems do this?" → `web-search-researcher` (only if external context genuinely helps)

Skip categories that don't apply. Don't pad with research areas that won't change the artifact.

### Step 3: Dispatch parallel sub-agents

In a **single message**, dispatch one `Agent` call per research area. Prefix every sub-agent prompt with the documentarian directive:

> "You are documenting what exists. Do NOT critique, suggest improvements, or perform root-cause analysis. Return file:line references for every claim."

**Codebase routing** (per `~/.claude/CLAUDE.md` rules):
- `codebase-locator` — find files/components by name or purpose
- `codebase-analyzer` — explain how a specific path works
- `codebase-pattern-finder` — find similar implementations to model after

**External routing:**
- `web-search-researcher` — only when external docs/articles are genuinely needed; instruct it to return links
- Glean (`mcp__glean_default__search`, `mcp__glean_default__read_document`) — for internal docs, tickets, prior decisions

Wait for all sub-agents to complete before synthesizing.

### Step 4: Synthesize findings

- Prioritize live code findings over historical/doc findings as the source of truth.
- Cross-reference: connect findings across components (e.g., "X calls Y at `file.ext:LINE` which then writes to Z").
- Verify file:line references that look suspicious by reading the actual file.
- Identify open questions — things sub-agents couldn't answer or that need human judgment.

### Step 5: Write artifact

Write to `<ARTIFACT_DIR>/research.md` using exactly this structure:

```markdown
---
phase: research
date: <today, YYYY-MM-DD>
researcher: <git config user.name fallback to "unknown">
git_commit: <git rev-parse --short HEAD>
branch: <git branch --show-current>
repo: <REPO from dw-setup.sh>
topic: <TOPIC_SLUG>
status: complete
last_updated: <today, YYYY-MM-DD>
last_updated_note: initial research
---

# Research: <topic title>

## Research Question

<original query, normalized>

## Summary

<3-8 sentence high-level documentation of what exists, answering the question. No "we should" — only "X is", "Y does Z".>

## Detailed Findings

### <Component or Area 1>

- <Description of what exists> (`path/to/file.ext:LINE`)
- <How it connects to other components> (`path:LINE`)
- <Current implementation detail, without evaluation>

### <Component or Area 2>

...

## Code References

- `path/to/file.ext:LINE` — <what is there>
- `another/file.ext:LINE-LINE` — <description of the block>

## Historical Context

<Relevant prior decisions, ticket history, or doc references — cite source. Omit section if none.>

## Open Questions

<Things that require human judgment or that the codebase alone can't answer. Phrased as questions, not critique.>
- <question 1>
- <question 2>

_If no open questions, write: "None — research is complete for the stated question."_
```

### Step 6 (optional): Follow-up append

If the user has follow-up questions in the same session:
- Update frontmatter: bump `last_updated`, append `last_updated_note: "<brief description>"`.
- Append a new section `## Follow-up Research <YYYY-MM-DD HH:MM>` with its own Summary / Detailed Findings / Code References / Open Questions sub-sections.
- Dispatch additional sub-agents as needed; same documentarian directive.

If the follow-up arrives in a fresh conversation, re-run `/rpi-research <slug> <new query>` and choose **Follow-up append** at the pre-flight gate.

## Completion

- Report: artifact path, number of detailed findings sections, count of open questions.
- Instruct: "Review `<path>/research.md`. When ready, run `/rpi-plan <slug>` to turn this into an implementation plan."

## Red Flags

**Stop and reconsider if:**
- A sub-agent returns critique or suggestions instead of documentation — re-dispatch with the documentarian directive made explicit.
- File:line references don't match the actual file — verify by reading; if wrong, dispatch a follow-up.
- The question is actually "how should we" rather than "how does it" — neutralize it into code-answerable research questions before dispatching sub-agents.
