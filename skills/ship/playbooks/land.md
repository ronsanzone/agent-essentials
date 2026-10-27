# Playbook: land and close out

For the verdict `MERGED`, or `/ship land` ("close out merged tickets"). Merging and enqueueing are the user's actions. This playbook starts after a merge, or watches a queue the user started.

1. **Merge queue (if the PR is queued).** Run `shipctl wait <pr>`.
   - A queued PR is not merged. Report `LANDED` only when `shipctl next` says `MERGED`.
   - If the queue removes the PR, run `shipctl report <pr>`. Its merge-queue section shows each attempt, and the green playbook takes over.
2. **Stack follow-through.** If the merged PR was the base of a stack, run stack.md "Base merged" so the rest re-point at trunk.
3. **Tickets.** Run `~/.agents/skills/ship/scripts/cleanup_prs.py scan --since 180d`. It lists open tickets assigned to the user whose key appears in a merged PR.
   - Keep a ticket only if its PR closes it: the key is in the PR title or the first lines of the body.
   - Drop tickets the PR only mentions (origin bugs, follow-ups), and say which you dropped and why.
   - Widen with `--projects CLOUDP,MHOUSE,SECBUG,HELP` only when asked.
4. **Confirm.** Show the surviving tickets as a table (key, status, summary, PR, fixVersions) and ask for the go-ahead. The reply is permission for those keys only.
5. **Resolve** with `~/.agents/skills/ship/scripts/cleanup_prs.py resolve KEY [KEY…] --apply`.
   - Done means `http: 204` and `after.resolution: Fixed` on every key. Report anything else verbatim, and don't retry it blind.
   - Each project closes to its own status: CLOUDP to `Resolved`, MHOUSE to `Closed`. Extend `PROJECT_TARGET` in the script for other projects.
   - fixVersions are appended, never replaced.
6. **Verify.** Scan again: none of the resolved keys may be listed. Report `LANDED` with a table of what closed, plus `Evidence:` from the `resolve` output and the rescan. Name anything left open, and why.

Notes:
- The script uses Jira REST v2 with `JIRA_API_TOKEN` (or `~/.config/.jira/.env`). v3 redirects to SSO.
- Every key list carries its own `project =` clause.
- Already-resolved tickets are skipped, so a rerun is safe.
