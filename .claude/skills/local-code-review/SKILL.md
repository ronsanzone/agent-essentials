---
name: local-code-review
description: Use when reviewing local branch changes before creating a PR. Triggers on requests to review current work, check branch quality, or get feedback on uncommitted or committed changes against the parent branch.
disable-model-invocation: true
---

# Local Code Review

Single-pass expert code review of local branch changes — committed and uncommitted — against the parent branch.

## Overview

Reviews your working branch diff without touching GitHub. Catches issues before they become PR comments.

## Usage

```
/local-code-review [base-branch]
```

- No arguments: auto-detects parent branch (main/master or upstream tracking branch)
- With argument: uses specified branch as comparison base

Examples:
- `/local-code-review` — review against auto-detected parent
- `/local-code-review develop` — review against `develop`

## Implementation

### Step 1: Determine the Base Branch

If no base branch argument provided, detect it using this fallback chain — use the **first** that succeeds:

```bash
# 1. Remote default branch (most reliable)
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'

# 2. If no remote configured, check for common defaults
git rev-parse --verify --quiet main 2>/dev/null && echo main
git rev-parse --verify --quiet master 2>/dev/null && echo master
```

If none succeed, ask the user to specify a base branch.

### Step 2: Gather Metadata (NOT the diff)

Collect **only** metadata — file lists, stats, and commit summaries. **Do NOT load full diff content yet.**

```bash
# Branch name and commit summary
git log --oneline <base-branch>..HEAD

# Files changed — names and stats only
git diff --name-only <base-branch>...HEAD
git diff --name-only HEAD
git diff --stat <base-branch>...HEAD
git diff --stat HEAD  # uncommitted
```

If there are **zero commits** on the branch (HEAD equals base) and no uncommitted changes, report that there is nothing to review and stop.

### Step 3: Detect Domains and Run Required Tools

**MANDATORY. Complete this step BEFORE loading any diff content.**

**Do NOT run `git diff` for file contents, or read changed files, until this step is complete.** Loading diff content before running domain tools causes attention displacement — the diff volume crowds out tool invocations and they get skipped. This sequencing barrier exists because of observed, repeated failures when parallelized.

Check file extensions from the Step 2 file list against ALL domain rulesets:

| Domain | Detection | Ruleset File |
|--------|-----------|--------------|
| React | Any `.jsx` or `.tsx` files in changed list | `react-ruleset.md` |

For **every** matching domain:
1. **Read** the ruleset file from the skill directory
2. **Run** every tool the ruleset requires — capture output
3. **Hold** tool output for the review step

If no domains match, proceed — but you must have checked the file list to confirm.

### Step 4: Load Diff and Read Context

**Only now** load the full diff content:

```bash
# Committed changes on this branch vs base
git diff <base-branch>...HEAD

# Uncommitted changes (staged + unstaged) if any
git diff HEAD
```

Present diffs clearly separated:
- **Branch commits** (what's been committed since diverging from base)
- **Working tree** (uncommitted/staged changes on top, if any)

For non-trivial changes, read surrounding code in modified files to understand the full context — not just the diff lines. This helps catch issues like:
- Functions that are correct in isolation but wrong in context
- Missing updates to related code
- Broken invariants elsewhere in the file

**Large files:** If a file exceeds the read token limit, use `offset`/`limit` to read the changed hunks rather than the full file. Use `git diff <base-branch>...HEAD -- <file>` to identify which line ranges changed, then read those ranges with surrounding context.

### Step 5: Review

Apply the general analysis framework below to all gathered changes. Fold domain tool findings into the appropriate severity level — assess each warning, assign severity, and place it alongside your manual findings. Tag domain tool findings with their source (e.g., `[react-doctor]`) so provenance is clear. Every domain tool warning must appear somewhere in the output — either as a finding at the appropriate severity or explicitly dismissed in a Low bullet.

## Analysis Framework

Apply in priority order:

| Priority | Focus | What to Look For |
|----------|-------|------------------|
| 0 | **Correctness** | Bugs, spec violations, logic errors, edge cases |
| 1 | **Security** | Injection, auth flaws, data exposure, insecure defaults |
| 2 | **Performance** | Algorithmic complexity, memory, queries, bottlenecks |
| 3 | **Code Quality** | Readability, naming, structure, organization |
| 4 | **Best Practices** | Language idioms, design patterns, standards |
| 5 | **Error Handling** | Exceptions, validation, failure recovery |
| 6 | **Testing** | Testability, missing test cases, test strategies |

## Review Guidelines

- Be direct, constructive, and technically precise
- Balance perfectionism with pragmatism — focus on changes that provide meaningful value
- Consider the broader system context and architectural implications
- Ask clarifying questions when context is needed

## Output Template

Follow this template exactly. Skip any severity section that has no findings.

````markdown
# Local Code Review: <branch-name> vs <base-branch>

**Branch:** <branch> | **Base:** <base> | **Commits:** <N> | **Files changed:** <N> (committed) + <N> (uncommitted)
**Lines:** +<added> / -<removed>
<!-- Include domain tool scores when applicable -->
**React Doctor:** <score>/100 (<N> warnings across <N> files)

---

## Critical Issues

### C1. <Short title describing the issue>

**File:** `path/to/file.ext:LINE-LINE`
**Category:** Correctness | Security | Performance | Error Handling

<2-4 sentence explanation of what's wrong, why it matters, and what happens if not fixed.>

```language
// ❌ Current
<the problematic code as it exists in the diff>
```

```language
// ✅ Fix
<the corrected code>
```

### C2. ...

---

## High

### H1. <Short title>

**File:** `path/to/file.ext:LINE-LINE`
**Category:** <category>

<Explanation of the issue and consequences.>

```language
// ❌ Current
<problematic code>
```

```language
// ✅ Fix
<corrected code>
```

---

## Medium

### M1. <Short title>

**File:** `path/to/file.ext:LINE`
**Category:** <category>

<Explanation. Code examples optional for medium — include when the fix is non-obvious.>

---

## Low

- **L1. <Title>** — `file.ext:LINE` — <One-line description. No code examples needed.>
- **L2. ...**

---

## Positive Observations

- <Pattern or decision worth calling out as well-done>
- <...>
````

### Template rules

- **Critical and High** issues always include before/after code examples
- **Medium** issues include code examples when the fix is non-obvious; omit when the fix is self-evident from the description
- **Low** issues are single-line bullet points — no code examples
- **Every finding** gets a file:line reference and a category from the analysis framework
- **Domain tool findings** are tagged with source in the title (e.g., `M1. [react-doctor] Stale closure in setPageNum`). Dismissed warnings go in Low with rationale (e.g., `L1. [react-doctor] Array index key — dismissed, stable list`)
- **Positive Observations** are bullet points — brief, specific, no filler praise
