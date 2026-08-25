---
name: handoff
description: Write a handoff doc for another session or model. Use for "write a handoff", "handoff doc", "hand this off", "monitor handoff", "write a prompt for another session".
argument-hint: "What will the next session be used for?"
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save it to `~/notes/<project>/<YYYY-MM-DD>-<slug>-handoff.md` (never inside a work repo); print the path and, if the user has `pbcopy`, copy a one-line "read <path> and continue" kickoff to the clipboard.

Before writing, leave a stable checkpoint: commit in-flight edits as one `wip:` commit and state in the doc whether the tree builds; cancel any running subagents so nothing keeps mutating after the handoff.

Open the document with one line for the reader: a pickup is inheritance. Read this doc and the artifacts it names instead of re-deriving them, and verify inherited claims (tests green, PR state, branch) against the real artifact before building on them.

Contents, in order: goal and current state (what is done, with evidence — commands, URLs, test output); what is next, as concrete steps; decisions made and why; open questions; environment facts a fresh session cannot infer (ports, which repo runs Evergreen, creds location, running services); suggested skills to invoke.

Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly — a "monitor handoff" is short: what to watch, how to check it, when to stop, where to log.
