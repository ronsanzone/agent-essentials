---
name: ship
description: Load first for any question or action about a branch's or PR's state, before running gh, git push, evergreen or Evergreen MCP tools. It is the single entry point for getting code merged. It opens a draft PR (branch, ticket, commit, push, body) and gets a PR to green (CI, Evergreen, merge queue, review comments, conflicts). It also works Graphite stacks, cuts early-signal Evergreen patches, and closes out tickets after merge. Use for "ship this", "open/publish a PR", "is my PR ready/green", "PR status", "why is CI failing", "get this over the line", "babysit #N", "stack this on top", "close out merged tickets", or a pasted PR or Spruce link. Typed as `/ship [open|green|stack|patch|land|check] [pr-url|ticket|context-file…]`.
---

# Ship

This skill runs the same way in Claude Code (`/ship …`), OpenCode (`$ship …`) and Pi (`/skill:ship …`), and loads when the user asks to ship. Invoking it is approval to run the routine steps without per-step confirmation: branch, ticket, stage, commit, push, draft PR, fix pushes, and a re-run of the one task that flaked. Stop only for the hard stops below, an ambiguous choice, a failed command, or anything destructive.

## Route first

1. **Work out the stage.** If the user named a stage (`open`, `green`, `stack`, `patch`, `land`, `check`), use it. Otherwise run:
   ```bash
   shipctl next [<pr-url>] -C <checkout>
   ```
   It prints one verdict. Do what the table says, and do not judge the stage yourself.

   | Verdict | Meaning | Do |
   |---|---|---|
   | `NO_BRANCH`, `UNCOMMITTED`, `NO_PR`, `UNPUSHED` | Local work not yet on a PR | [playbooks/open.md](playbooks/open.md) |
   | `CONFLICT`, `THREADS`, `CI_RED` | PR needs work | [playbooks/green.md](playbooks/green.md) |
   | `WAITING` | CI or the merge queue is running | `shipctl wait <pr>` (it blocks; give it a long timeout or run it in the background), then run `next` again |
   | `READY` | Mergeable; only a human step is left | Report it and stop. The user marks it ready, approves, or merges |
   | `MERGED` | PR merged | [playbooks/land.md](playbooks/land.md) |
   | `CLOSED`, `NOTHING` | Nothing to ship | Report and stop |

   A `stacked:` line in the output also loads [playbooks/stack.md](playbooks/stack.md). `check` is one `shipctl next` plus `shipctl report` when `CI_RED`, with no changes.
2. **Copy the playbook's numbered steps into your todo list verbatim**, before acting. Use the harness's todo tool, or a numbered checklist in your reply if it has none. A step you skip stays listed with the reason. Do not merge, reorder or summarize the steps.
3. **After each playbook, run `shipctl next` again.** "Get this over the line" means keep going: on `WAITING`, run `shipctl wait`, then `next` again, until `READY` or a stop. That loop needs no harness loop command. A single `open` or `check` stops after one pass.

## Hard stops (every playbook)

- **Draft only.** Never mark ready, approve, merge, enqueue in the merge queue, or close a PR unless the user asks for that exact action in this conversation.
- **Never post review replies or resolve threads.** Draft them in the report for the user to post. The one exception is the `augment review` trigger comment in green.md.
- **Resolve the 10gen remote. Never assume `origin`:** in mongohouse and mms-automation `origin` is the fork.
  ```bash
  UP=$(git remote -v | awk '$2 ~ /github\.com[:\/]10gen\// {print $1; exit}'); UP=${UP:-origin}
  REPO=$(git remote get-url "$UP" | sed -E 's#.*github\.com[:/]##; s#\.git$##')
  DEFAULT=$(git symbolic-ref --short "refs/remotes/$UP/HEAD" 2>/dev/null || { git remote set-head "$UP" -a >/dev/null; git symbolic-ref --short "refs/remotes/$UP/HEAD"; }); DEFAULT=${DEFAULT#"$UP"/}
  ```
  PR branches live on `$UP`, never on a fork.
- **Stage explicit paths.** Never `git add -A` or `git add .`: mms worktrees have an untracked `bazel-<worktree>` symlink. Use `git add -u` plus named new files. Stop if relevant and unrelated hunks can't be separated.
- **History.** Never `--force`. `--force-with-lease` only after a deliberate rewrite such as a Graphite restack. Update a pushed branch from its base with a merge, not a rebase.
- **No AI attribution** in commits, PR bodies or comments: no `Co-Authored-By`, no "generated with".
- **Tickets.** In 10gen/mms only, a `CLOUDP-XXXX` placeholder title prefix auto-creates the ticket, so never create a Jira issue there. Elsewhere, create one through Executor only when there is no key (load `executor-usage`).
- **Secrets.** If the diff may contain a secret, stop before committing.

## Tools

| Need | Command |
|---|---|
| Stage and next step | `shipctl next [<pr>] [-C dir] [--json]` |
| Why CI is red (PR run, merge queue, assertions, staleness, repro) | `shipctl report <pr-url\|spruce-url> -C <checkout>`  Exit 1 means failures were found, not that the command failed |
| Block until CI finishes | `shipctl wait <pr\|version>`. Never use `sleep` loops |
| Early-signal Evergreen patch | `shipctl patch <task-url> [--uncommitted]` (see [playbooks/patch.md](playbooks/patch.md)) |
| Tickets whose PRs merged | `~/.agents/skills/ship/scripts/cleanup_prs.py scan` / `resolve … --apply` |

`shipctl` is `scripts/shipctl` (on PATH as `~/bin/shipctl`). It needs `gh`, `git`, and `evergreen` logged in once (`evergreen client get-oauth-token` must print a token). Use the Evergreen MCP only when `shipctl` output doesn't answer the question. From the `evergreen` CLI use only `patch`, `finalize-patch` and `client get-oauth-token`. Never guess other subcommands (`list-tasks`, `version`, `task display` and `patch list` don't exist or do something else).

## State file

`~/.cache/ship/<owner>-<repo>-<pr>.md`, with sections `## PR`, `## Status history`, `## Decisions`, `## Actions`, `## Open items`.

- Read it first.
- Append to it last.
- Never re-triage a failure it records as fixed unless the failure is in a run newer than the fix.
- One agent per PR or stack: an entry written in the last hour by another session means stop and report.

## Report

Lead with the outcome: `OPENED`, `GREEN`/`READY`, `IN-FLIGHT`, `BLOCKED` or `LANDED`. Then give what changed, the decisions you made, any drafted replies, and the open items. Every state claim ends with `Evidence:`, meaning live state read back after the last action (`shipctl next` output, `gh pr view`, the pushed hash, Spruce task states). A signal you didn't observe this run is "unverified", never green. When stopping while the verdict is `WAITING` or `IN-FLIGHT`, give the user the command to resume: `/ship green <url>` (OpenCode: `$ship green <url>`; Pi: `/skill:ship green <url>`). In Claude Code, `/loop 20m /ship green <url>` repeats it on a schedule. When already running under a loop, say when it can stop.
