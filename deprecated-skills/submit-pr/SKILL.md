---
name: submit-pr
description: Create or update a draft PR. Use for "create/submit/open/push PR", "write/fill the PR description", or when branch work is done and needs to go upstream.
---

# Submit PR

Outcome: a **draft** PR for the current branch with a filled description, verified with `gh pr view`, URL reported as evidence. Optional arguments: context file paths to inform the description — read only those, never auto-discover files.

## Hard rules

- Draft only (`--draft`). The user marks it ready.
- Template discovery, first hit wins: `.github/PULL_REQUEST_TEMPLATE.md`, `.github/pull_request_template.md`, `.github/PULL_REQUEST_TEMPLATE/default.md`, `docs/pull_request_template.md`, `PULL_REQUEST_TEMPLATE.md`. None found → ask once, or use the minimal body in `references/pr-body.md`.
- No AI attribution anywhere: no `Co-Authored-By` trailers, no "AI-assisted" wording in commits or the body.
- Never `--force`. `--force-with-lease` only when the branch was already pushed and you rewrote its history on purpose. Never force-push to resolve a merge conflict.
- The Testing section states exactly what ran, or `Not run: <reason>`. Never claim tests you did not run.
- Present the body for review before creating the PR, unless the caller asked for one-shot (e.g. `yeet`).
- Screenshots and video go through `gh --attach` (see Attachments). Never upload evidence to an external host — that leaks internal data.

## Remote

Never assume `origin` is upstream: in mongohouse and mms-automation `origin` is the ronsanzone fork. Resolve once and use `$UP` everywhere below:

```bash
UP=$(git remote -v | awk '$2 ~ /github\.com[:\/]10gen\// {print $1; exit}'); UP=${UP:-origin}
REPO=$(git remote get-url "$UP" | sed -E 's#.*github\.com[:/]##; s#\.git$##')
DEFAULT=$(git symbolic-ref --short "refs/remotes/$UP/HEAD" 2>/dev/null || { git remote set-head "$UP" -a >/dev/null; git symbolic-ref --short "refs/remotes/$UP/HEAD"; }); DEFAULT=${DEFAULT#"$UP"/}
```

PR branches live on `$UP` (no fork PRs). If the branch already exists on a fork remote with an open fork PR, stop and ask before moving it.

## Ticket

- Key comes from the branch name, commits, or an argument (`[A-Z][A-Z0-9]+-[0-9]+`). Title: `<KEY>: <title>`.
- **10gen/mms only: a `CLOUDP-XXXX` placeholder prefix auto-creates the ticket.** When that prefix is present or requested there, do not create a Jira issue. It does not work in mongohouse, mms-automation or other repos.
- Otherwise create a ticket only when asked, through Executor (`jira_create_issue`; load `executor-usage` for the calling shape). Not a CLI.

## Flow

1. State: `git status --porcelain`; resolve `$UP`/`$REPO`/`$DEFAULT` (see Remote); `gh pr list -R "$REPO" --head <branch> --json number,url,isDraft`.
2. **New PR**: `git fetch "$UP" && git rebase "$UP/$DEFAULT"` — on conflict stop, resolve, rerun tests; `git push -u "$UP" <branch>`; build the body per `references/pr-body.md`, including the visual Change outline; `gh pr create -R "$REPO" --head <branch> --base "$DEFAULT" --draft --title "<KEY>: <title>" --body-file <path>`; attach any visual evidence (see Attachments).
3. **Existing PR**: push new commits to the PR's head remote (`git push "$UP" <branch>`). If the body is empty, an unfilled template, or placeholder-only, offer to fill it and apply with `gh pr edit <n> --body …`.
4. Verify: `gh pr view <n> -R "$REPO" --json url,isDraft,headRefName,headRepositoryOwner,commits` — `isDraft` must be true, `headRefName` must match, and `headRepositoryOwner` must be the 10gen org for 10gen repos (not the fork).

## Attachments (screenshots, video)

`gh pr create/edit --attach <file>#<alt text>` uploads the file and returns a `github.com/user-attachments/...` URL scoped to repo access. Up to 50 files. Use it for visual evidence instead of describing a screenshot the reviewer cannot see.

- **Reference rewriting is exact-match and fragile.** gh rewrites `![alt](./shot.png)` in the body only when the path string matches the `--attach` argument literally. On a mismatch (body `shot.png`, attach `/abs/path/shot.png`) it leaves your refs dangling *and* appends the assets at the bottom — clean up both.
- **Most reliable path:** `--attach` the files, then `gh pr view <n> --json body` to read the returned URLs, inline them with `![alt](url)`, and re-apply with `gh pr edit <n> --body-file`. One extra edit, no matching rules to satisfy.
- **Video is a bare URL** on its own line — GitHub renders it as a player. An image-style `![alt](url)` for a video renders broken.
- Verify: `gh pr view <n> --json body` shows no leftover local paths, and the asset URLs return 200.

## Report

```
PR: <url> (draft)
Evidence: gh pr view → isDraft=true, head=<branch>, <n> commits
Testing: <what ran | Not run: reason>
```

If CI matters, suggest `/babysit-pr <url>`.
