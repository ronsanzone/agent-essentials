---
name: code-tour
description: "End-to-end HTML tour of a PR, branch, or subsystem. Triggers: code tour, tour of the change, code walkthrough, walkthrough html, ramp me up on."
---

# Code Tour

Outcome: one self-contained HTML file (inline CSS/JS/SVG) that walks a reader through a PR, branch, or subsystem — structured, dense, every claim cited `file:line`. Scope is the subsystem under review, not the application: assume the reader works in this codebase daily.

`/code-tour <PR url|number>` · `/code-tour` (current branch vs its base) · `/code-tour <topic>`

## 1. Mode and material

- **PR**: `gh pr view -R <owner/repo> <n>`, `gh pr diff -R <owner/repo> <n>`.
- **Branch**: base = `git symbolic-ref refs/remotes/origin/HEAD` (fall back to the graphite parent if `gt` is present); `git diff <base>...HEAD`, `git log <base>..HEAD --oneline`.
- **Topic**: the argument is the scope; no diff.

## 2. Scope and reader

From the diff/topic, identify the key files and packages, the subsystem name, and the entry point. Pick the **reader profile** — it drives everything downstream:

- **Ramp-up** — new to the subsystem, will edit soon: lifecycle section, execution-order walkthrough, dense citations.
- **PR review** — knows the subsystem: what the diff does; skip lifecycle.
- **Showcase** — leadership / cross-team, reads once: thematic sections, outcomes first, light citations, project masthead, no build commands.

Capture any scope exclusions the user gave ("leave out GA work") verbatim; they go into every agent brief.

## 3. Research: five parallel agents

Launch five agents in one message, each scoped to one dimension from `references/dimensions.md` (default `codebase-analyzer`; `general-purpose` for History and Recent Activity, which read git/notes/tickets). Each brief carries the diff or topic, key files, the exclusions, and: "Scope to this subsystem. `file:line` on every claim. Report concisely." Ask for structured findings, not summaries.

## 4. Compile

Choose the template from `references/templates.md` (Trace for ramp-up/PR review; Showcase for stakeholders) and add supplementary sections only where research surfaced material (What's Actively Being Built, Gaps, Sibling Implementations, Key Design Decisions, Data Model, Error Handling, Testing). The Big Picture SVG is the map every later section refers back to.

## 5. Render

One HTML file: sticky TOC, numbered sections, collapsible long code/tables, hero with title + eyebrow + meta pills (date, ref, scope, reading time). Inline SVG diagrams, syntax-highlighted snippets trimmed to the lines that matter, no filler, no emoji. Tone per reader profile.

Path: `~/notes/<project>/<slug>-tour.html` (project = repo name; slug = ticket/PR title, branch, or topic). Print the absolute path and `open` it; if `open` fails, leave the path.

## 6. Verify before reporting

Spot-check five `file:line` citations against the tree (wrong lines are the usual defect). Confirm the file opens and every TOC anchor resolves. Report: path, reader profile, dimensions used, anything excluded.

Iteration is normal — content additions, reordering, a reader-profile pivot (switch templates rather than patching sections).
