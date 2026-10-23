---
name: review
description: Fast single-pass code review of a PR, branch, ref range, or working tree. Severity-ranked findings with the reasoning shown, plus what was considered and dismissed.
disable-model-invocation: true
---

# Review

One pass, one model. Findings carry the path that reaches them, a severity, and the lens that caught them. What you weighed and rejected is listed too. Depth scales with the diff. Heavier tools are named at the end, never run by default.

Report only. Do not edit code. The user picks what to act on.

## Usage

```
/review                       # current branch vs auto-detected base, plus the working tree
/review <base-branch>         # current branch vs that base
/review <pr-number | pr-url>  # a PR; GitHub or Graphite URL
/review <ref>..<ref>          # any range
```

## 1. Resolve the target

- **No argument.** Base is the first that succeeds: `<UP>/HEAD` where `<UP>` is the remote whose URL matches `github.com[:/]10gen/` (in mongohouse and mms-automation `origin` is a stale fork), then `git symbolic-ref refs/remotes/origin/HEAD`, then `main`, then `master`; none → ask. Range is `<base>...HEAD`, plus the working tree (`git diff HEAD`).
- **Branch name.** Same, with that base.
- **PR.** A number, a GitHub URL, or a Graphite URL (`app.graphite.com/github/pr/<owner>/<repo>/<n>/...`). `gh pr view <n> --json title,body,baseRefName,headRefName,additions,deletions,changedFiles`; add `-R <owner/repo>` only when the URL names a repo other than the current one.
- **Range.** `git diff <a>...<b>`.

No commits past base and a clean tree, or an empty PR diff: say there is nothing to review and stop.

## 2. Intent and metadata, not the diff yet

Write one sentence: what this change is trying to do. Take it from the PR title and body, the commit subjects (`git log --oneline <range>`), or the user's message. Findings judge whether the work achieves that intent. The intent itself is not under review unless asked.

Then names and stats only:

```bash
git diff --name-only <range>     # PR: gh pr diff <n> --name-only
git diff --stat <range>
```

## 3. Domain tools, before any diff content

Check the file list against every row. For each match: read the ruleset, run its tools, hold the output. Do not load diff content or read changed files until this step is done. Diff volume crowds out tool runs; this barrier exists because of observed, repeated skips.

| Domain | Detection | Ruleset |
|---|---|---|
| React | any `.jsx` or `.tsx` in the file list | `react-ruleset.md` |

No match: proceed, having checked.

## 4. Load the diff, scale the context

Local: `git diff <base>...HEAD`, then `git diff HEAD`, kept separate (branch commits vs working tree). PR: `gh pr diff <n>`.

- **Under ~200 changed lines.** Read the diff. Open surrounding code only where a finding needs the call chain.
- **Larger, or touching shared code.** Read the changed hunks with surrounding context in each modified file. For oversized files read the changed ranges, not the whole file.
- **PR in the current repo.** `git fetch <UP> pull/<n>/head:refs/remotes/pr/<n>` once (`<UP>` = the 10gen remote; a fork has no PR refs), then `git show pr/<n>:<path>` for context. Do not check the branch out.
- **PR in another repo.** Review the diff alone and say context was unavailable.

## 5. Review through the lenses

**Correctness.** Does it do what the intent says? Edge cases (empty, nil, boundaries, concurrent access), error paths (swallowed or propagated), state (races, stale closures, dangling references). Idempotency: run it twice, or crash it halfway; if the outcome depends on leftover state, a reconciliation step is missing. A potential bug is a finding only with the call chain that reaches it. "This could be nil" without the path is not.

**Root cause vs symptom.** Guard clauses that mask an invariant violation. Retries that hide a broken contract. Casts that silence a modeling error. A fix in module A that belongs in module B's contract. A fix that is a comment or a convention ("don't do X"): ask whether a type, lint, or runtime check could make the wrong thing impossible. This lens needs reading past the diff: callers, callees, types.

**Structure.** Validation at the boundary, trusted inside. Orchestration and detail not mixed in one function. Data shapes that match the access pattern. Does the change read as if the design always accounted for it, or bolted on? A new API beside the old one with no external consumers: migrate callers and delete the old path in the same change. Do not penalize simple code for lacking abstraction.

**Verification.** Tests exercise behavior, not implementation. A bug fix carries a test for the bug. Integration boundaries are tested along the real path. Checks read the real value, not a proxy (an mtime, a cache, a delegate's summary).

**Complexity budget.** Abstractions with one call site. Parameters for cases that do not exist. Dead code. Compatibility scaffolding for a migration that is finished. Three lines of duplication beat a premature abstraction.

**Security.** Only what you can trace: input reaching a dangerous sink (SQL, shell, eval, innerHTML) without sanitization; auth gaps on new endpoints; secrets in code or logs; TOCTOU on a security path.

**Performance.** Algorithmic complexity, N+1 queries, unbounded memory, work in a hot path. Obvious and measurable only.

Domain tool output: every warning lands somewhere, as a finding at its real severity tagged with its source (`[react-doctor]`), or under Dismissed with the reason.

## 6. Judge before you write

You hold context the lenses do not: the intent, the rest of the codebase, what the next change will do. Filter with it.

- **Hypothetical vs actual.** "What if X is null" is a finding only if a caller can pass null. Trace it. If types or upstream validation prevent it, dismiss.
- **Nitpick gravity.** A review that is all nits means the code is fine. Say so.
- **Premature abstraction.** Suggest extraction only when the code already needs to change in a second way.
- **"I would have done it differently"** is not a finding without a concrete problem in the current approach.
- **Consistency.** Flagging a pattern the rest of the repo uses is missing context, not a finding.
- **Keep the uncomfortable ones** that name a concrete execution path or expose a gap in your model of the code. Correctness and security findings get extra scrutiny before dismissal.

Critical plus High: five or fewer. More than that, filter harder or say the change should be split.

## 7. Output

Follow this template. Skip a severity section with no findings.

````markdown
# Review: <target>

**Intent:** <one sentence>
**Scope:** <range or PR #> | <N> commits | <N> files | +<added> / -<removed>
**Verdict:** ship | fix Critical/High first | needs a design conversation. <one clause why>
<!-- domain tool scores when run, e.g. **React Doctor:** 82/100 (4 warnings) -->

## Critical

### C1. <short title>

**File:** `path/to/file.ext:LINE-LINE` · **Lens:** Correctness | Security | ...

<2-4 sentences: what is wrong, why it matters, the path that reaches it.>

```language
// current
<code as it exists in the diff>
```

```language
// fix
<corrected code>
```

## High

<same shape as Critical>

## Medium

### M1. <short title>

**File:** `path/to/file.ext:LINE` · **Lens:** <lens>

<Explanation. Code only when the fix is not obvious from the description.>

## Low

- **L1. <title>** · `file.ext:LINE` · <one line>

## Dismissed

- <what was weighed> · <why it is not a finding, one line>

## Positive observations

- <a pattern worth repeating elsewhere; omit the section when nothing earns it>
````

Rules:

- Critical and High always show current and fixed code. Medium shows code only when the fix is not obvious. Low is one line.
- Every finding has a `file:line` and a lens.
- Domain tool findings carry their source tag in the title: `M1. [react-doctor] Stale closure in setPageNum`.
- Dismissed lists what you considered and rejected, including dismissed domain tool warnings. Omit it only when nothing was weighed and rejected.

- A finding stated as confirmed names what confirmed it (test run, repro command, trace) on an `Evidence:` line; otherwise label it plausible.

## Escalate by reference

- Multi-agent review with adversarial verification of each finding: Claude Code's built-in `/code-review`.
