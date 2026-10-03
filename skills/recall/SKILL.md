---
name: recall
description: "Recall prior work from the trail index, notes and live state. Use when the user asks where they left off, wants catching up on a topic or directory, wants the session, branch, worktree or notes for something found, or wants what earlier sessions decided or learned gathered."
---

# Recall

Rebuild the working context for a topic from what is already recorded, cheapest source first: the **trail** index, then the notes it points to, then live state. Transcripts are for what those three leave open.

`trail` indexes Claude Code, pi and opencode sessions. One call per handle:

| Call | Returns |
|---|---|
| `trail here` | recent sessions, most-reused notes and PRs for this directory |
| `trail <PR url \| ticket \| words>` | sessions that worked on it, sessions that only mentioned it, branch, worktree, notes ranked by reuse |
| `trail <notes path>` | who wrote the note, who has used it since, whether it is `STALE` |
| `trail <session id>` | what was asked in order, how the session ended, its notes and PRs, transcript path, resume command |

## Steps

1. **Route.** Name the branch of recall the ask is, in one line, with its topic:
   - **locate** — a session, branch, worktree or note is wanted. Run the one `trail` call that answers it, reply with those lines and the resume command, and stop.
   - **resume** — work is to be continued or its state reported. Steps 2–6, then the brief.
   - **gather** — what several sessions decided, learned or reported is wanted. Steps 2–6, then the findings list.

   A full state capsule already in the prompt (paths, branch, the change) is the context: use it and skip to step 5.
2. **Trail.** Run `trail` on the handle the user gave; on their words if they gave none; `trail here` if they gave neither. Each PR or branch under "worked on it" is a **thread**, plus any the user named. Sessions under "mentioned in" join a thread only when marked "you asked". A heading that reads "newest N of M" means older sessions exist: say so when the user asked for all of it. Done when every thread has its sessions and its top notes listed.
3. **Sessions.** Run `trail <id>` on each thread's sessions, newest first, until one adds nothing new. What was asked and how it ended is that session's summary.
4. **Notes.** Read each thread's most-reused note, the project `README.md` State section when there is one. A note marked `STALE` is history: take decisions and reasons from it, and status from step 5.
5. **Live state.** Check every PR, branch and worktree the reply will name, now: `gh pr view <n> -R <repo> --json state,isDraft,mergedAt,statusCheckRollup`, `git -C <dir> status -sb`, `git worktree list`. Done when every status the reply states rests on a command run in this session.
6. **Transcripts, for what is still open.** When the answer turns on what an agent did or found (a decision, an error, feedback from a run) and steps 3–4 do not hold it, open the transcript at the path `trail <id>` gives: grep for the topic and read those regions. For four or more transcripts, give each to a subagent on a fast model with one schema: topic, decisions, open threads, problems hit, artifacts, each citing the session id. The raw transcripts stay with the subagents.

When a thread's story lives outside your own sessions (a regression, a decision others made, a bug users keep reporting), hand that question to the **why** skill and fold what returns into Problems.

On a machine without `trail`, say so and replace steps 2–3 with a grep of `~/.claude/projects/*/*.jsonl` and `~/.pi/agent/sessions/*/*.jsonl`, newest first by `ls -t`.

## The brief (resume)

- **Capsule.** At most 5 bullets: what this work is and where it stands.
- **Threads.** One line each, opening with exactly one tag: `[merged #N]`, `[open PR #N]`, `[in flight <branch>]`, `[verified, uncommitted]`, `[reverted #N]` or `[planned, not started]`.
- **Problems.** At most 5, the recurring ones, including any fix that shipped and was reverted.
- **Next move.** The single most useful next action, with the resume command when it is "continue session X".

Cite sessions by their first 8 characters and notes by path. An adjacent feature or ticket stays out unless it blocks this one. When the brief outgrows a screen, cut detail before threads.

## The findings list (gather)

One line per finding, ranked by how much it matters to the ask, each citing the session id and date it came from. Group repeats: a finding seen in three sessions is one line with three citations.
