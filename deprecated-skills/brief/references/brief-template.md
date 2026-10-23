# Brief template

Replace every `<…>`. Delete sections that don't apply (Target layout for pure behaviour changes; Context for pure moves).
Keep section names — `/spawn`, the implementer, and the coordinator review all key off them.

````markdown
# <SLUG> — <one-line title> (brief)

Coordinator → implementer. Worktree `~/code/worktrees/<repo>/<dir>`, branch `<branch>`, <stacked on `<parent>` | base `<sha>`>.
Shorthand `P=<package or path prefix>`. Every `path:line` below cites `<sha12>`; after a move group paths change — grep by symbol.

Decided with <user> <YYYY-MM-DD>: <decision>; <decision>; **<emphasised decision>**; everything in §Out of scope stays out.

## Rules

- Draft PR, title `<TICKET-or-CLOUDP-xxxx>: <title>`; no AI attribution anywhere (commits, PR, comments).
- Notes, logs, and questions live in `~/notes/<project>/<workstream>/` — never in the repo.
- <repo-specific commit hygiene: hooks path, formatter command>
- **Before every commit:** `<build command>` and `<test command>`. <strict-deps / lint notes>
- <invariants that must not change: golden files, generated artifacts, schema keys, public API>
- <purity / layering constraints>
- Write your plan to `<slug>-progress.md` **before editing code** (read order verified, decisions cited). Log decisions,
  deviations from this brief, patch ids and measurements there, dated. The progress log wins over this brief.
- Blocking questions → `<slug>-questions.md`; continue on unblocked work. Do not reopen the Decided items.
- If this brief conflicts with the live code, the code wins: follow it and log the deviation.
- Results with `Evidence:` (commands/URLs + observed output) → `<slug>-results.md`.

## Target layout            <!-- structure changes only -->

```
<tree with one comment per file: what it owns>
```

Dependency rule: `<a> ← <b> ← <c>`. Violations to cut: `<Class→Dep (path:line)>`, …

## Context                  <!-- when no layout section -->

Read first, in order: `<file>` (<why>), `<prior-results.md>` §<n>, `<workstream README>`.
Entry points: `<Class.method (path:line)>` → `<…>` → `<…>`.

## Commit group 1 — <name> (<mechanical | behaviour>)

<one line of intent>. <ordering rule: one commit per item | one commit>.

- **<Item id> <title>.** <exact change, with `path:line` citations and the target behaviour>. <what must not change>.
- …

Checks: `<build>`; `<tests>`; <artifact/golden diff expectation>; <live run name, if any>.

## Commit group 2 — <name>

…

Checks: …

## Out of scope (decided)

<comma-separated list of things the implementer will be tempted to do; each with the reason or the brief that owns it>.

## Done when

<build/test command> green; `git diff <base>...HEAD --stat` shows <expected shape>; <artifact present>; `<slug>-progress.md`
has <required measurements>; <live run / patch id> recorded green in `<slug>-results.md` with `Evidence:`.
````

## Companion files the implementer creates

- `<slug>-progress.md` — `# <SLUG> — implementer progress log`; `## 0. Plan (<date>, before any code)` with `0.1 Read and
  verified against the head` and `0.2 Corrections to the brief found before coding (code wins)`; then dated entries per
  commit group: decisions (cited), deviations, verification output, patch ids.
- `<slug>-questions.md` — one `## <date> — <topic> (blocking | flagging)` per question with the options considered;
  coordinator replies inline as `**Coordinator answer (<date>):** …`.
- `<slug>-results.md` — what shipped (PR URL, commits), measurements, and an `Evidence:` block per Done-when item.
- `<slug>-review.md` — written by the coordinator after `/spawn`'s monitor reports done: verdict, what was checked,
  fixes `F1…Fn` folded into their owning commits, runs table.
