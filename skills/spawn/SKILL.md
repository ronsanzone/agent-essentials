---
name: spawn
description: 'Start an implementer for a brief or handoff in its own worktree and herdr pane, then watch it: "spawn an implementer for <brief>", "spin up a pane for X", "kick off the brief", "hand this to another agent / a pi session".'
---

# spawn

Outcome: one agent session in its own herdr pane, in the brief's worktree, reading the brief, with the coordinator
(you) watching its files and status. Pane mechanics come from the `herdr` skill — follow its spawn recipe; don't
re-derive flags. Communication after kickoff is through files only.

## Steps

1. **Read the brief/handoff header**: worktree, branch, base/parent, slug, read order. Refuse to spawn a brief marked
   `(draft)` or with open decisions — say what's open.
2. **Worktree.** If the directory doesn't exist, create it from the repo root: `init-worktree <ticket> <desc>` when the
   user's convention applies, else `git worktree add <dir> -b <branch> <base>`; for a Graphite stack, `gt create <branch>`
   inside the worktree on the named parent. **One implementer per brief and per worktree**: check `herdr pane list` for a
   pane already in that cwd and the mtime of `<slug>-progress.md`; if either shows live work, stop and report it.
3. **Pane.** `herdr` recipe: split `--no-focus`, `pane run "cd <worktree> && eapclaude --effort high"` (the standing
   default; `pi` with the model the user named when they ask for pi), `wait output --match ">"`.
4. **Kickoff.** One `pane run` with the message below, filled from the brief. Short — the brief carries the rules.
5. **Watch.** Don't spend turns polling the pane. Start a `Monitor` on a command that returns when either fires:
   `herdr wait agent-status <P> --status blocked --timeout <long>` / `--status done`, or `<slug>-questions.md` mtime
   changes. On a question: read it, answer inline under `**Coordinator answer (<date>):**`, then
   `pane run "<P>" "answered in <slug>-questions.md — continue"`. On done: review.
6. **Review** (coordinator): `git diff <base>...HEAD --stat` and the diff against the brief's commit groups, read
   `<slug>-progress.md` and `<slug>-results.md`, verify the Done-when `Evidence:` yourself (re-run a check, open the patch
   URL). Write `<slug>-review.md`: verdict, what you checked, fixes `F1…Fn` folded into their owning commits, runs table.
   Hand fixes back with one `pane run` pointing at the review file.

## Kickoff message

```
You are the implementer for <SLUG>. I am the coordinator; we communicate through files only.
Read first, in order: <brief path> (complete and self-contained — the implementation authority), then <predecessor files>.
Work in this worktree on branch <branch> (<stacked on <parent> | from <sha>>). Draft PR, placeholder <TICKET>-xxxx title, no AI attribution.
Protocol: write your plan with cited decisions to <slug>-progress.md before editing code; log decisions, deviations, patch ids and measurements there — it wins over the brief. Blocking questions only in <slug>-questions.md; continue on unblocked work. Results with Evidence in <slug>-results.md.
The brief's Decided items are resolved — do not reopen them. Commit N must pass its Checks before commit N+1 starts.
Begin with the reading and write your plan section before editing code.
```

## Not in herdr

If `HERDR_ENV` is unset, don't fake it: print the worktree command, the launch command (`cd <worktree> && eapclaude
--effort high`), and the kickoff message as a paste-ready block, and stop.

## Report

```
Spawned <slug>: pane <P>, worktree <dir>, branch <branch>
Evidence: <launch command as run>; pane output: "<first prompt/response line seen>"
Watching: <monitor command>; questions file: <path>
```
