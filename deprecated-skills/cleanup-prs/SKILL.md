---
name: cleanup-prs
description: Close out Jira tickets whose code is already merged. Scans the merged PRs you authored for ticket keys, lists the ones still open and assigned to you, and resolves them once you confirm. Use when the user asks what tickets have merged code, wants their ticket queue cleaned up or closed out, or asks to resolve tickets whose PRs merged. Typed as `/cleanup-prs`.
---

# Cleanup PRs

Outcome: every open ticket of yours whose fix is already merged ends up resolved — status `Resolved` (CLOUDP) or `Closed` (MHOUSE), resolution `Fixed`, fixVersion `n/a`, `Documentation Changes` = `Not Needed`. **Nothing closes until the user has seen the list and said go.**

The work is mechanical and lives in `scripts/cleanup_prs.py`: `scan` reads `gh` plus Jira, `resolve` is a dry run until you pass `--apply`.

## Steps

1. **Scan** — `scripts/cleanup_prs.py scan --since 180d`. Prints one line per open, assigned-to-you ticket whose key appears in a merged PR: key, status, current fixVersions, summary, PR URLs. Done when you have the full list (or the "nothing to clean up" line).
2. **Triage the list** — keep a ticket only if its PR actually closes it (key in the PR title or the first lines of the body). A key quoted deeper in a body is a ticket the PR *mentions*: origin bugs, follow-ups, support tickets. Drop those and say which you dropped and why. Widen with `--projects CLOUDP,MHOUSE,SECBUG,HELP` only when asked.
3. **Confirm** — show the surviving tickets as a table (key, status, summary, PR, existing fixVersions) and ask for the go-ahead. Treat the reply as permission for those keys only.
4. **Resolve** — `scripts/cleanup_prs.py resolve KEY [KEY...] --apply`. One JSON line per ticket with `http`, `after` and, on failure, `error`. `http: 204` plus `after.resolution: Fixed` is the completion criterion; anything else is reported verbatim, not retried blind.
5. **Verify** — scan again: the tickets must be gone from it. Anything still listed was skipped or failed.

## Notes the script already handles

- **Per-project JQL.** `key in (...)` must carry its `project =` clause: a cross-project key list returns nothing on jira.mongodb.org, and the `jira` CLI silently scopes every query to the configured project.
- **REST v2** with `JIRA_API_TOKEN` (or `~/.config/.jira/.env`). `/rest/api/3` redirects to SSO and rejects the bearer token.
- **Terminal status differs per project** — CLOUDP resolves to `Resolved`, MHOUSE has no `Resolved` and closes to `Closed`. Extend `PROJECT_TARGET` in the script for other projects.
- **fixVersions are appended, never replaced.** MHOUSE tickets usually carry a real release version (`v20261013`); `n/a` goes alongside it so release info survives.
- **Already-resolved tickets are skipped**, so a re-run is safe.

## Final response

A table of what closed, then:

```
Evidence: scripts/cleanup_prs.py resolve … --apply → http 204, after={status: Resolved|Closed, resolution: Fixed, fixVersions: [n/a], doc: Not Needed} for every key; rescan lists none of them.
```

Name anything you left open, and why.
