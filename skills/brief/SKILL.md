---
name: brief
description: 'Write a coordinator→implementer brief another session or model executes unattended: "write a brief", "brief for PR N", "implementation outline", "same form as the other briefs", "outline for the implementer".'
---

# brief

Outcome: `~/notes/<project>/<workstream>/<slug>-brief.md` — the implementation authority for one PR or unit of work,
self-contained enough that a fresh session (or a weaker model) executes it without this conversation. The implementer
owns three companion files next to it: `<slug>-progress.md` (plan first, then a dated log of decisions, deviations,
verification output — **the progress log wins over the brief**), `<slug>-questions.md` (blocking questions only; the
coordinator answers inline under `**Coordinator answer (<date>)**`), `<slug>-results.md` (what shipped, with `Evidence:`).
Hand it to a pane with `/spawn <brief>`.

## Before writing

1. Pin the head every `path:line` cites (`git rev-parse --short=12 HEAD` in the worktree or base). After a move/rename
   group, tell the reader to grep by symbol.
2. Close the decisions. Anything still open gets one grilling pass with the user now; the brief records them as
   `Decided with <user> <date>: …`. A brief with an open decision is a draft — label it `(draft)` and say what's open.
3. Name the worktree, branch, and base (parent branch for a Graphite stack, or a sha). If the worktree doesn't exist,
   say how `/spawn` creates it (`init-worktree <ticket> <desc>` or `git worktree add … -b <branch> <base>`).
4. Read the predecessor files the implementer must inherit (prior `*-results.md`, `*-review.md`, workstream README) and
   list them in read order. Inheritance beats re-derivation.

## Structure — `references/brief-template.md`

Header paragraph (coordinator → implementer; worktree · branch · base; cited sha; path shorthand like `P=…`) →
**Decided** → **Rules** → **Target layout** (structure changes) or **Context** (read-first files, ≤10 lines) →
**Commit groups** (each: scope, ordered items with `path:line` citations and the exact behaviour, and **Checks** — the
commands that must pass before that commit exists) → **Out of scope (decided)** → **Done when** (observable: commands,
URLs, artifacts; this is the `Evidence:` list the results file must satisfy).

## Writing rules

- Exact commands, never "run the tests": the bazel targets, `gt` verbs, patch/task names, flag values.
- Every commit group has Checks; commit N must be green before N+1 starts. Say which group a live run belongs to.
- Mechanical move first, behaviour second; for behaviour changes prefer vertical slices (steel thread first). Add call
  stacks before/after or a mermaid sequence only where a runtime path changes.
- Rules section carries the standing rules from the template, edited for the repo (hook/format commands, golden files,
  purity constraints). Keep: draft PR + placeholder title, no AI attribution, notes only under `~/notes`, plan before
  code, questions file, **code wins over the brief when they conflict — follow the code, log the deviation**.
- No narrative about this conversation; define shorthand once; ≤150 lines is typical. Written for a reader with none
  of your context.
- Never put the brief in a work repo.

## Report

`Brief: <path> (<n> lines, <k> commit groups, decisions: closed | open: …)`. Offer `/plannotator-annotate <path>` for
review, then `/spawn <path>`. If the workstream has a README index, add the brief to it.
