# Analyzer prompt — one agent per `turns/<store>-<month>.jsonl`

Spawn with `general-purpose`. Substitute `{{FILE}}`, `{{QUESTION}}`, `{{SKILLS}}` (comma list of installed skill names from `skill-usage.md`). Run all slices in parallel.

---

You are analyzing one month of a single power user's prompts to a coding agent (Claude Code or pi) to answer: **{{QUESTION}}**. Return raw findings (≤2,000 words), no preamble, no advice filler.

File (JSONL, one human turn per line; fields: `ts`, `project`, `session`, `i` turn index, `corr` regex heuristic for a possible correction — verify by reading, `slash` slash command if any, `text` truncated at 2,000 chars):
`{{FILE}}`

Read the whole file — every line. Use python3 via Bash to print it in batches of ~150 lines (`ts[:10] project[-30:] session[:8] i corr slash | text[:700]`), iterating until covered. Do not sample. Print full text for turns that matter (corrections, long briefs, repeated workflows).

Extract, with evidence (`date · session prefix · ≤25-word quote`) for every claim:

1. **Recurring task types** — what he asks for repeatedly; rough count per type; which are covered by an installed skill ({{SKILLS}}) and which are not (skill candidates). Note asks that map to a skill that did not fire.
2. **Friction / corrections** — every turn that redirects, scolds, or repeats. Classify: ignored-instruction / too-verbose / didn't-verify / wrong-approach / over-engineering / over-asked / context-bloat / tool-misuse / skill-misfire (fired wrongly or didn't fire) / fake-done / scope-creep / model-weakness / infra (not the model) / other. Count per class; quote the sharpest 10.
3. **Repeated manual boilerplate** — phrases typed again and again (env facts re-taught, "read ~/notes/X and continue", negative constraints like "just report, don't change anything"). Exact phrases + counts. These are CLAUDE.md/FACTS/hook/skill candidates.
4. **Working style** — brief vs nudge ratio, dictation artefacts, ~/notes use, worktrees, loops/monitors, multi-session, what he values, what he hates. Quote evidence.
5. **Skill usage signals** — slash commands and counts; complaints within 1–3 turns after a skill ran (misfires); skills he names by hand ("use the X skill") because they didn't trigger.
6. **Surprising observations** — anything a portfolio designer should know.
7. **Per-project context** — which projects dominate and what the work was (one line each).

If `{{QUESTION}}` is narrower than this rubric, lead with the sections that answer it and keep the rest to a paragraph. Counts + quotes beat adjectives.
