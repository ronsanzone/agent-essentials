# Playbook: Graphite stacks

Use this when `shipctl next` prints `stacked:`, when the user says "stack this on top" or "part 2", when a parent branch changed, or when a base PR merged. Graphite PR URLs look like `app.graphite.com/github/pr/<owner>/<repo>/<n>/…`; take owner/repo and the number from them for `gh`.

| Command | Purpose |
|---|---|
| `gt log` | Stack structure and PR states |
| `gt create <branch> -m "<KEY>: <msg>"` | New branch on top of the current one |
| `gt modify` | Amend the current branch and restack its children |
| `gt restack` | Rebase every branch onto its parent |
| `gt sync` | Pull trunk, delete merged branches, restack the rest |
| `gt submit --stack` | Push and create or update every PR in the stack (draft) |

1. **Find the frontier.** In `gt log`, the lowest unmerged PR is the only one that matters until it merges. Read upstack threads, but batch their fixes into the frontier's push.
2. **One writer.** `gt restack` and `gt submit --stack` rewrite every branch above. Run them only when no other session's state file shows recent work on this stack.
3. **Do the move:**
   - **Next part:** from the parent, `gt create <key-lower>-part-N -m "<KEY>: <summary>"`, implement it, then `gt submit --stack`.
   - **Parent changed:** change the parent, `gt modify` (or commit, then `gt restack`), then `gt submit --stack`.
   - **Base merged:** `gt sync`, then `gt submit --stack` so the remaining PRs point at trunk. Resolve conflicts per branch during the restack, and record the non-mechanical ones in Decisions.
   - **Rule:** any change to any branch ends with a restack and `gt submit --stack`. Never update one PR and leave its dependents stale.
4. **History.** Let `gt` own rebases and force pushes. No raw `git rebase` or `git push --force` inside a stack, and never rewrite a merged branch: a fix for a merged PR becomes a new PR on top.
5. **Verify.** Stacked mms PRs don't build correctly in Evergreen. Verify the frontier with a manual patch ([patch.md](patch.md)) and paste the link into the PR or the state file. Then run `shipctl next` per PR.
