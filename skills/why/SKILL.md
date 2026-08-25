---
name: why
description: Design rationale from the historical record — "why does X work this way", "why did we pick Y", regressions, postmortems, where a threshold came from. Not for runtime behavior (use code-tour / codebase-analyzer).
---

# Why

Answer what forces shaped the code: rationale, rejected alternatives, edge cases, product or operational constraints. The code says what it does, rarely why it exists, so the evidence comes from outside it — commits and PR threads, tickets, docs, chat, observability, incidents, CI history — and the answer is a confidence-calibrated, cited read, never a confident story.

## Posture

- Evidence before narrative; cite every claim (commit, PR #, ticket, doc URL, permalink, `file:line`). Uncited = inference, labelled as such.
- Hedge to match evidence ("appears to", "likely"); surface contradictions; name gaps. A null result from a searched source is evidence too.
- Do not infer intent from code shape, and treat the user's own guess as a hypothesis to test. `references/epistemics.md` is the full framework; the synthesizer must follow it.

## 1. Target and question

Pin the **target** (code, pattern, feature, decision) and the **question** type: design rationale · tradeoff vs alternative · motivating edge cases · external constraint · dead-code · broad history. If the referent is vague, state your interpretation in one line and proceed.

## 2. Code anchor (inline, cheap)

Collect file paths + line ranges, key symbols, `git blame -L`, `git log --follow --oneline -20 -- <file>`, PR numbers from merge subjects `(#1234)`, and `gh pr view <n> --json title,body,author,mergedAt,comments,reviews,closingIssuesReferences` for substantive commits. Pass this seed to every investigator so none rediscovers it.

## 3. Coverage map, then parallel investigators

Load `executor-usage`. In one `execute`, `tools.search({ query, limit: 6 })` for each category's keywords (jira, confluence, glean, github pull request, grafana, splunk, pagerduty, evergreen, warehouse) and return `path :: description` lines only. Map hits onto the categories in `references/source-playbook.md` (what each category holds and the kind of "why" only it surfaces). Source control is always available via git/`gh`. A category with no connection stays on the map as a **gap**, not a skip.

Spawn one `general-purpose` investigator per category with a connection, all in one message, no `model` override. Each gets: `references/investigator-prompt.md`, its one playbook from `references/sources/`, `references/sources/incident-postmortem.md` if the target looks defensive (null checks, retries, timeouts, rate limits, flags, egress guards, OOM handling), the code anchor, and the user's question. Investigators load `executor-usage`, run every query inside `execute`, fetch once and trim in the sandbox, write nothing, return findings and null results only. One source per investigator — pooling dilutes query vocabulary and hides coverage.

Skip a category only with a written reason that appears in Sources Consulted: no connection exists (a gap), or the source is *provably* irrelevant (a build-time script has no runtime error trail). "Probably nothing there" is not a reason; a null search costs one subagent, a missed design doc costs the answer. Answering inline without investigators is for the single-commit case where the PR body already says everything — say so explicitly.

## 4. Synthesize, then present

Spawn one `general-purpose` synthesizer (no model override; it may spot-verify citations via `execute` after loading `executor-usage`). Give it the findings incl. nulls and skips, the code anchor, the question, `references/epistemics.md`, and `references/synthesizer-prompt.md` — that template carries the output format (Question · Code · What We Found · What We Can Infer · Competing Hypotheses · What We Don't Know · Sources Consulted · Confidence Summary).

Present its output. Light edits for clarity are fine; **do not strengthen the confidence language** — the hedging is the product. If the question precedes a change to this code, close with Preserve / Change / Avoid / Risk constraints for the change.

## Failure modes

Confident storytelling from thin evidence · citing the code as proof of its own intent · recency bias (the current shape accreted; trace back) · agreeing with the user's suggested reason without checking · skipping investigators by anticipation · collapsing categories into one agent · dropping the gaps section.

## References

`references/epistemics.md` (confidence tiers, phrasing) · `references/investigator-prompt.md` · `references/source-playbook.md` (categories, what each surfaces, this environment's connections) · `references/sources/*.md` (one playbook per connection: code-archaeology, jira, confluence, glean, grafana, splunk, pagerduty, evergreen; incident-postmortem is cross-cutting) · `references/synthesizer-prompt.md` (output format).
