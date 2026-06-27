---
name: yeet
description: One-shot end-of-session shipping workflow. Use when the user says "yeet", wants zero-friction local changes to become a Jira-backed commit and draft PR, or asks to create/commit/push/submit a PR in one flow. Accepts an optional Jira key, Jira URL, or ticket title.
---

# Yeet

One-shot end-of-session workflow: resolve/create a Jira ticket, commit relevant local changes if needed, push the branch, and create or update a draft PR with a useful description.

`/yeet [ticket-key | ticket-url | ticket-title | context-file ...]`

Examples:
- `/yeet CLOUDP-12345`
- `/yeet https://jira.example.com/browse/CLOUDP-12345`
- `/yeet "Fix Alibaba capacity denylist validation"`
- `/yeet` — infer from branch/session; create a Jira ticket if none exists

## Operating Principle

`/yeet` is the user's approval to perform the routine shipping actions automatically:

- create a Jira ticket when no ticket exists
- create/switch/rename a feature branch when needed
- stage and commit relevant local changes
- push the branch
- create a draft PR, or update/push an existing PR

Only stop for user input when there is ambiguity, risk, missing required data, command failure, merge conflict, or destructive operation.

## Hard Rules

- **Zero friction by default.** Do not ask for approval before each normal step. Report what happened at the end.
- **Draft PRs only.** Never create a ready-for-review PR.
- **Never commit secrets, credentials, generated junk, editor files, dependency caches, or unrelated changes.**
- **Never use `git add -A` blindly.** Stage explicit paths after inspecting status/diff.
- **Never force push unless required for an existing remote branch after a rebase.** Use `--force-with-lease`, never `--force`.
- **Do not include `Co-Authored-By` trailers** unless the user explicitly asks.
- **Do not invent testing.** PR body testing must say exactly what was run or "Not run" with a reason.
- **If on the default branch, create a feature branch before committing.**
- **If the worktree has unrelated changes, leave them unstaged or stop if separation is unclear.**
- **If a command fails, stop, explain the failure, and give the next command/action.**

## Decision Tree

```text
Start
│
├─ Snapshot repo state
│  ├─ current branch, default branch, upstream, existing PR
│  ├─ git status/diff/staged diff
│  └─ branch commits vs default
│
├─ Resolve ticket
│  ├─ Explicit Jira key/URL in args? use it
│  ├─ Jira key in branch name? use it
│  ├─ Jira key in commits? use it
│  ├─ Non-key arg/title provided? create Jira ticket with that title
│  └─ No ticket info? create Jira ticket inferred from local/session changes
│
├─ Branch check
│  ├─ On default branch? create feature branch from ticket + slug
│  ├─ Branch has no ticket and branch is not pushed? rename to ticket + slug
│  └─ Otherwise keep current branch
│
├─ Commit check
│  ├─ Relevant local changes exist? stage explicit paths and commit
│  ├─ Only irrelevant/ambiguous changes exist? stop or ask what to include
│  └─ No local changes? skip commit
│
├─ PR check
│  ├─ Existing PR for branch? push commits and improve bare description if needed
│  └─ No PR? rebase onto default if safe, push, create draft PR
│
└─ Final report: ticket, commit(s), PR URL, testing, anything skipped
```

## Step 1: Snapshot Repo State

Run these before mutating anything:

```bash
git status --porcelain=v1
git branch --show-current
git remote -v
git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'
gh pr list --head "$(git branch --show-current)" --json number,url,title,state --limit 5
```

Then inspect changes:

```bash
git diff --stat
git diff --cached --stat
git diff
git diff --cached
```

If the diff is large, inspect enough to classify files as relevant vs unrelated. Prefer the user's session context when available.

## Step 2: Resolve or Create Jira Ticket

### Ticket Detection

Treat any of these as an existing ticket:

- Jira issue key: `[A-Z][A-Z0-9]+-[0-9]+`
- Jira URL containing `/browse/<KEY>`
- branch name containing a key
- commit subject/body containing a key

Verify an explicit or inferred key:

```bash
jira issue view <KEY> --raw
```

### Ticket Creation

Create a Jira ticket when no existing key is available.

Inputs for summary, in priority order:
1. non-key `/yeet` argument
2. session goal from conversation
3. branch slug converted to words
4. concise summary inferred from `git diff --stat` + changed code

If summary cannot be inferred confidently, ask once.

Default issue type: `Task`.
Default project: configured Jira CLI project. If Jira CLI has no default project and no project is inferable from repo/branch, ask once.

Build a concise description:

```markdown
## Context
<why this ticket exists, inferred from session/local changes>

## Scope
- <main change 1>
- <main change 2>

## Acceptance Criteria
- [ ] Change is implemented and covered by appropriate validation
- [ ] PR is linked and ready for review

## Implementation Notes
- Branch: <branch>
- Local changes summarized from git diff/stat
```

Create via stdin and parse the key:

```bash
jira issue create --raw --no-input -tTask -s "<summary>" --template - <<'EOF'
<description>
EOF
```

The `jira` CLI returns JSON for `--raw`; extract `.key`. If raw output format differs, read the output and extract the created key manually.

## Step 3: Branch Handling

Find default branch:

```bash
DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')
```

If currently on the default branch, create a feature branch before committing:

```bash
git switch -c "<ticket-key-lower>-<short-slug>"
```

If current branch has no ticket key, is not pushed, and a ticket key is now known, rename it:

```bash
git branch --show-current
git ls-remote --exit-code --heads origin "$(git branch --show-current)"
git branch -m "<ticket-key-lower>-<short-slug>"
```

Do not rename a branch that already has an upstream or open PR unless the user explicitly asks.

## Step 4: Commit Relevant Local Changes

### Classify Changes

Relevant changes are files that support the session objective/ticket. Examples:
- source changes for the feature/fix
- tests for those changes
- docs/config/migrations directly required by the change

Unrelated changes include:
- separate feature work
- local notes/scratch files
- environment files
- generated/cache/vendor output not expected in the repo
- editor/OS artifacts

If all dirty files are relevant, stage explicit paths:

```bash
git add path/to/file1 path/to/file2
```

If mixed relevant/unrelated changes exist, stage only relevant files or use patch mode for partially relevant files:

```bash
git add -p path/to/file
```

If you cannot separate safely, stop and ask which files/hunks to include.

### Commit Message

Use one commit unless changes naturally require separation.

Format when ticket is known:

```text
<TICKET-KEY>: <imperative summary>
```

Examples:
- `CLOUDP-12345: Fix capacity denylist validation`
- `CLOUDP-12345: Add retry handling for provider lookup`

Commit:

```bash
git commit -m "<TICKET-KEY>: <imperative summary>"
```

If there are no relevant local changes, skip commit and continue to PR handling. This supports the case where commits already exist and only PR submission remains.

## Step 5: Submit PR

Use the existing `submit-pr` skill as the base reference when PR-specific detail is needed. Load/reference it by skill name, not by filesystem path. If that skill is unavailable, use the PR rules embedded below.

Yeet overrides one part of `submit-pr`: **do not pause for PR-description approval unless confidence is low.** The user invoked Yeet for a one-shot flow. Generate the body and create/update the draft PR automatically when the inputs are clear.

### Existing PR

If `gh pr list --head <branch>` returns a PR:

1. If there are commits to push, run:
   ```bash
   git push origin <branch>
   ```
2. Fetch the PR body:
   ```bash
   gh pr view --json body --jq '.body'
   ```
3. If the body is empty, unfilled template, or placeholder-only, generate a proper body and update:
   ```bash
   gh pr edit <number> --body "$(cat <<'EOF'
   <generated body>
   EOF
   )"
   ```
4. Report the PR URL.

### New PR

Before creating a new PR, rebase onto default branch only when the worktree is clean and the branch is not already diverged in a risky way:

```bash
git fetch origin
git rebase "origin/<default-branch>"
```

If conflicts occur, stop. After conflicts are resolved, tests must be rerun before continuing.

Push:

```bash
git push -u origin <branch>
```

Create a draft PR:

```bash
gh pr create --draft \
  --title "<TICKET-KEY>: <PR title>" \
  --body "$(cat <<'EOF'
<generated body>
EOF
)"
```

If `gh pr create` returns a URL, report it. If it opens an editor or fails due missing title/body/template data, stop and show the generated title/body.

## PR Body Generation

Find PR template in this order:

```text
.github/PULL_REQUEST_TEMPLATE.md
.github/pull_request_template.md
.github/PULL_REQUEST_TEMPLATE/default.md
docs/pull_request_template.md
PULL_REQUEST_TEMPLATE.md
```

If no template exists, use:

```markdown
## Ticket
<ticket link or key>

## Summary
- <what changed>
- <why it changed>
- <reviewer hot spots, if any>

## Testing
- <commands run, or "Not run: <reason>">
```

If a template exists, fill only the same sections described in `../submit-pr/SKILL.md`:
- Ticket
- Summary
- Open Questions, only if real open questions exist
- Testing
- Performance, only if relevant

Leave reviewer checklists and boilerplate unchanged. Do not check boxes.

## Testing Detection

Use session context and shell history only if available. Otherwise inspect recent commands is not required.

Acceptable Testing entries:
- `make test`
- `go test ./...`
- `npm test`
- `Not run: not requested during this session`
- `Not run: PR-only documentation/workflow change`

Do not claim tests passed unless you ran them or the session clearly shows they ran successfully.

## Safety Stops

Stop and ask or report next steps if any of these happen:

- cannot determine Jira project/summary for a new ticket
- `jira issue create` fails
- `gh` is not authenticated
- on detached HEAD
- local changes include possible secrets or credentials
- relevant and unrelated hunks are mixed and cannot be separated safely
- rebase conflict
- tests fail after conflict resolution
- pushing requires non-trivial force push decision
- PR title/body cannot be generated confidently

## Final Response

Keep it short. Include:

```markdown
Yeeted.

- Ticket: <KEY/link or created key>
- Branch: <branch>
- Commit: <hash + subject, or "skipped: no relevant local changes">
- PR: <url>
- Testing: <what ran / not run>
- Notes: <only if something was skipped or needs attention>
```
