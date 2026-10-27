# Playbook: open a draft PR

For the verdicts `NO_BRANCH`, `UNCOMMITTED`, `NO_PR` and `UNPUSHED`, or `/ship open`. The outcome is a draft PR for the current work, with a filled body, verified with `gh pr view`. Optional arguments are a ticket key, URL or title, plus context files: read only the files the user named, and never discover files on your own.

**Repos without a PR flow.** Some repos are personal and commit straight to the default branch, with no 10gen remote (e.g. `agent-essentials`, `dotfiles`). There, step 4 is the whole job: commit, then stop. Push only if asked.

1. **Snapshot** before changing anything:
   - `git status --porcelain`, plus `git diff` and `git diff --cached`.
   - Resolve `$UP`, `$REPO` and `$DEFAULT` (see SKILL.md).
   - `gh pr list -R "$REPO" --head <branch> --state open --json number,url,isDraft`
2. **Ticket.** Use a key or URL from the argument first, then a key in the branch name or commits (`[A-Z][A-Z0-9]+-[0-9]+`). If there is none: in 10gen/mms use the `CLOUDP-XXXX` placeholder. Elsewhere create a ticket through Executor, with the summary taken from the argument, then the session goal, then the branch slug. Ask once only if none of these gives a summary.
3. **Branch.**
   - On the default branch: `git switch -c <key-lower>-<slug>`.
   - On an unpushed branch with no key: `git branch -m`.
   - Never rename a branch that is pushed or has a PR.
4. **Commit.** Stage explicit paths only (see Hard stops). The message is `<KEY>: <imperative summary>`, with no trailers. If there are no relevant changes, skip this step.
5. **Update from base.**
   - New PR: `git fetch "$UP" && git rebase "$UP/$DEFAULT"`.
   - Pushed branch: merge `"$UP/$DEFAULT"`; never rebase it.
   - On a conflict, stop, resolve it, then rerun the tests that cover the conflicted files.
6. **Check before pushing.** Run the cheapest check that exercises the change: compile, or the targeted test.
   - If BUILD or dependency files changed in mms, also run `bazel build --config=javac <targets>`, because Evergreen enforces strict deps.
   - Record exactly what ran, for the Testing section.
7. **Push** to `$UP` with `git push -u "$UP" <branch>`. For an existing PR, push to the PR's head remote.
8. **PR body.** Fill the body per [../references/pr-body.md](../references/pr-body.md): the repo template, the Change outline, and Testing that says exactly what ran or `Not run: <reason>`. If the repo's AGENTS.md names a PR-description skill (mms: `pull-request-guidelines`), load it and follow it too. Present the body for review first, unless the user ran `/ship` one-shot or confidence is high.
9. **Create or update the PR.**
   - New: `gh pr create -R "$REPO" --head <branch> --base "$DEFAULT" --draft --title "<KEY>: <title>" --body-file <path>`.
   - Existing: push, then fill an empty or placeholder body with `gh pr edit <n> --body-file`.
   - Visual evidence goes through `--attach` (see pr-body.md). Never upload to an external host.
10. **Verify.** Run `gh pr view <n> -R "$REPO" --json url,isDraft,headRefName,headRepositoryOwner,commits`. It must show `isDraft` true, the right head, and the 10gen org as head owner. Then run `shipctl next <url>`.

Report:
```
OPENED
- Ticket: <key | CLOUDP-XXXX placeholder | created key>
- Branch: <branch> · Commit: <hash subject | skipped>
- PR: <url> (draft)
- Testing: <what ran | Not run: reason>
- Evidence: gh pr view → isDraft=true, head=<branch>; shipctl next → <verdict>
```
