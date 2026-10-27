# Playbook: merge conflicts / stale branch

Fires when `mergeable` is `CONFLICTING`, or `mergeStateStatus` is `BEHIND` and failures look like staleness (tests passing locally but failing against newer master).

## 1. Detect a Graphite stack first

Check whether the branch is Graphite-managed (`gt log` succeeds and shows the branch in a stack). Stack state changes the whole play:

- **Base PR of the stack merged:** sync and restack onto master so the branch picks up the merge commit, then update every PR in the stack:
  ```bash
  gt sync
  gt restack
  gt submit --stack
  ```
- **Stacked but base not merged:** restack on the parent branch, resolve conflicts as below, then `gt submit --stack` so dependent PRs update too. Any rebase or fix on a stacked PR ends with a restack + stack submit — never update just the one PR.
- **Never rewrite merged history.** A fix whose owning PR has already merged becomes a new PR on top of the remaining stack, not an amend of the merged branch.
- **One actor on the stack.** `gt restack` and `gt submit --stack` rewrite every branch above the one you touch. Run them only when the sibling state files show no other pass working the stack; a second actor restacking concurrently discards finished work.

## 2. Non-stacked branch

Merge the latest base into the already-pushed PR branch. Do not rebase it just to update from the base; that rewrites public history and forces a force push for no benefit.

```bash
# $UP = the 10gen remote (see submit-pr "Remote"); origin is a fork in mongohouse/mms-automation
git fetch "$UP"
git merge "$UP/<default-branch>"
```

Resolve conflicts hunk by hunk. Every non-mechanical resolution — anywhere both sides changed behavior and you chose — goes in the Decisions section verbatim: file, what each side wanted, what you picked, why.

If a conflict requires a product/design call you cannot defend from the code, stop that file, leave the rest resolved, and report BLOCKED with the specific question.

## 3. Verify, then push

Re-run the tests covering the conflicted files before pushing. For a non-stacked branch updated with a merge commit:

```bash
git push <pr-head-remote> <branch>   # the remote the PR head lives on: headRepositoryOwner from gh pr view
```

Use `git push --force-with-lease` only when a workflow has already rewritten history, such as a Graphite restack. The push retriggers CI/Evergreen — do not kick a separate run.

## Evergreen caveat

Stacked PRs in mms do not build correctly in Evergreen; after a restack, a manual Evergreen patch may be needed — see [evergreen.md](evergreen.md).
