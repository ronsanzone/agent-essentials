---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save to the temporary directory of the user's OS - not the current workspace.

Before writing, leave a stable checkpoint: commit in-flight edits as one `wip:` commit and state in the doc whether the tree builds; cancel any running subagents so nothing keeps mutating after the handoff.

Open the document with one line for the reader: a pickup is inheritance. Read this doc and the artifacts it names instead of re-deriving them, and verify inherited claims (tests green, PR state, branch) against the real artifact before building on them.

Include a "suggested skills" section in the document, which suggests skills that the agent should invoke.

Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.
