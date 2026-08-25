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

## Ticket

- Key comes from the branch name, commits, or an argument (`[A-Z][A-Z0-9]+-[0-9]+`). Title: `<KEY>: <title>`.
- **MMS repos: a `CLOUDP-XXXX` placeholder prefix auto-creates the ticket. When that prefix is present or requested, do not create a Jira issue.**
- Otherwise create a ticket only when asked, through executor (`tools.search({query:"jira create issue"})`, then `tools.describe.tool` before calling). Not a CLI.

## Flow

1. State: `git status --porcelain`; current and default branch (`git symbolic-ref refs/remotes/origin/HEAD`); `gh pr list --head <branch> --json number,url,isDraft`.
2. **New PR**: `git fetch origin && git rebase origin/<default>` — on conflict stop, resolve, rerun tests; `git push -u origin <branch>`; build the body per `references/pr-body.md`; `gh pr create --draft --title "<KEY>: <title>" --body "$(cat <<'EOF' … EOF)"`.
3. **Existing PR**: push new commits (plain `git push`). If the body is empty, an unfilled template, or placeholder-only, offer to fill it and apply with `gh pr edit <n> --body …`.
4. Verify: `gh pr view <n> --json url,isDraft,headRefName,commits` — `isDraft` must be true and `headRefName` must match.

## Report

```
PR: <url> (draft)
Evidence: gh pr view → isDraft=true, head=<branch>, <n> commits
Testing: <what ran | Not run: reason>
```

If CI matters, suggest `/babysit-pr <url>`.
