---
name: session-mine
description: 'Mine your Claude Code + pi transcripts. Triggers: "analyze my sessions", "what skills got used", "did <skill> get used", "skill usage report", "where did the agent go wrong", "mine my sessions for".'
---

# session-mine

Outcome: a reproducible, cited answer about how you actually work with agents — from the transcripts, never from
memory or estimates. Counts come from `scripts/mine.py`; every qualitative claim cites `date · session prefix · ≤25-word quote`.

## Modes

- **usage** (default when the question is about skills, tools, models, or counts; ~1–2 min): run the script, answer
  from `skill-usage.md` + `stats.md`. This is the two-week check for any new skill: `--since <skill's commit date> --skills <name>`.
- **full** (question is about behaviour: friction, repeated prompts, skill candidates, working style): usage, plus one
  analyzer agent per month-slice, then a synthesized report.

## Procedure

1. Pick the window the question implies (a skill's creation date, "last month", default 60 days). Run:
   `python3 <this skill dir>/scripts/mine.py --since YYYY-MM-DD [--skills a,b | all] [--store claude|pi|both] [--out DIR]`
   Default out: `~/notes/context-engineering/session-mine/<today>/`. It prints the skill-usage table; the window's
   totals are in `stats.md`. One pass over both stores; ~1 min per 1 GB of transcripts.
2. **usage**: answer from the table and `stats.md`. Include the rows that matter and the `ZERO use` line verbatim. Done.
3. **full**: for every `turns/<store>-<month>.jsonl`, spawn one `general-purpose` agent with
   `references/analyzer-prompt.md`, substituting `{{FILE}}`, `{{QUESTION}}`, `{{SKILLS}}` (installed names from the
   table). Launch them all in one message. Each returns ≤2,000 words of raw findings.
4. Synthesize `<out>/REPORT.md` (≤250 lines): headline numbers from `stats.md`/`skill-usage.md` (not from agents),
   findings ranked by impact with counts + citations, then recommendations. `open` it and give a ≤15-line chat summary
   that states the window, session/turn counts, and the exact command, so the result is reproducible.

## Hard rules

- Numbers come from the script. Agents read and quote; they do not produce portfolio-wide counts.
- Agents read every line of their slice (batches of ~150 via python3). No sampling.
- Output under `~/notes/…`, never in a repo. Don't paste raw turns into chat.
- State these caveats when they bear on the answer: pi loads skills by reading `SKILL.md`, so `pi:read` is pi's
  invocation count; a typed Claude `/name` appears as `<command-name>` (`claude:slash`); subagent (sidechain) turns
  are excluded from human turns; the `corr` flag is a heuristic that under-counts (≈1% flagged vs ≈10% of turns that
  actually redirect) — it is a hint for the analyzers, not a metric.
- A skill with zero use across both harnesses for ≥2 weeks after it shipped is a deletion candidate; say so plainly.

## Output files (per run)

`turns/<store>-<YYYY-MM>.jsonl` · `sessions.tsv` · `stats.md` (per-month human/assistant/AskUserQuestion, skills,
slash, subagents, autonomy tools, MCP, models, error kinds, session shape) · `skill-usage.md` (per skill × month,
channels `cs cS cr ps pr`).
