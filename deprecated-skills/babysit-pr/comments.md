# Playbook: new comments

## Fetch

Both surfaces, filtered to items newer than the last pass recorded in the state file:

```bash
gh pr view <n> -R <owner>/<repo> --comments
gh api repos/<owner>/<repo>/pulls/<n>/comments   # inline review threads
```

Separate **human reviewers** from **bots** (augment, coverage/lint bots).

## Bot comments

Verify the claim, don't take it on faith: if the bot says a generator wasn't run or coverage dropped, check. Valid → fix and include in this pass's push. Invalid → record why in the triage table; no reply needed.

## Human comments

Triage every comment into one of:

- **Valid — fix it.** Apply the change, include it in this pass's push, and draft a short reply noting what changed.
- **Question.** Determine the answer from the code/plans and draft a reply.
- **Disagree.** Draft the rationale for pushing back.

Record the triage table (comment → classification → action/draft) in the state file and reproduce it in the report.

**Never post replies or resolve threads.** All drafts go in the report for the user to post. Fixes to accepted feedback are the only autonomous action here.
