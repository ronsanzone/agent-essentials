---
name: yeet
description: One-shot end-of-session ship — commit relevant changes, resolve the ticket, push, open a draft PR via submit-pr. Typed as `/yeet [key|url|title|context-file…]`.
disable-model-invocation: true
---

# Yeet

`/yeet` is the user's approval to run the routine shipping steps without per-step confirmation: branch, stage, commit, push, draft PR. Stop only for ambiguity, risk, a failed command, a conflict, or a destructive choice.

## Steps

1. **Snapshot** before mutating: `git status --porcelain`, `git diff` (+ `--cached`), current and default branch, `gh pr list --head <branch> --json number,url,isDraft`.
2. **Ticket**: explicit key/URL/title argument → use it; key in branch or commits → use it. **10gen/mms only: use the `CLOUDP-XXXX` placeholder prefix — it auto-creates the ticket; never create a Jira issue there.** It does not work in mongohouse or mms-automation. Elsewhere with no key: create one through executor (summary from the argument → session goal → branch slug), or ask once if nothing is inferable.
3. **Branch**: on the default branch → `git switch -c <key-lower>-<slug>`; unpushed branch with no key → `git branch -m`. Never rename a branch that is pushed or has a PR.
4. **Commit**: stage explicit relevant paths only — never `git add -A`; `git add -p` for mixed files; stop if relevant and unrelated hunks cannot be separated. Message `<KEY>: <imperative summary>`, no trailers. No relevant changes → skip to 5.
5. **PR**: invoke the `submit-pr` skill in one-shot mode (skip the body-review pause unless confidence is low). It owns template discovery, body, draft creation, and `gh pr view` verification.

## Safety stops

Possible secrets in the diff · mixed hunks · rebase conflict · tests fail after conflict resolution · detached HEAD · `gh` not authenticated · title/body not inferable · a force push would be needed.

## Final response

```
Yeeted.
- Ticket: <key | CLOUDP-XXXX placeholder | created key>
- Branch: <branch>
- Commit: <hash subject | skipped: no relevant local changes>
- PR: <url> (draft)
- Evidence: gh pr view → isDraft=true, head=<branch>; git log origin/<branch> -1 → <hash>
- Testing: <what ran | Not run: reason>
```

Then suggest `/loop 20m /babysit-pr <url>`.
