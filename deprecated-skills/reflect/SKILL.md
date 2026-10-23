---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
---

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

## When to invoke

Invoke when the user says "reflect" or "/reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## Process

### 1. Locate the active transcript

The parent finds its own transcript file before fanning out. Read only the current project's directory. Do not glob across all projects. That crosses workspace boundaries and reads private chats from unrelated projects.

- Claude Code: `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl`, where `<encoded-cwd>` is the working directory with `/` and `.` replaced by `-`. Subagent transcripts sit at `<session-id>/subagents/*.jsonl`.
- pi: `~/.pi/agent/sessions/<encoded-cwd>/<timestamp>_<uuid>.jsonl`, where `<encoded-cwd>` is `--<cwd without leading slash, / replaced by ->--`.

```bash
ls -t ~/.claude/projects/<encoded-cwd>/*.jsonl ~/.pi/agent/sessions/<encoded-cwd>/*.jsonl 2>/dev/null | head -10
```

For each candidate, grep for a distinctive phrase from the conversation's opening user prompt. Take the matching path. If no path resolves, write a tight digest of the session and pass that instead.

### 2. Spawn three reviewers in parallel

One message, three `Agent` calls, `subagent_type: general-purpose`, explicit `model:` on each. Reviewers need MCP access for context lookups (tickets, chat threads, observability traces referenced in the transcript), which `general-purpose` has.

| Lens | `model` | Prompt template |
|---|---|---|
| Judgment | `fable` | `references/judgment-reviewer.md` |
| Tooling | `opus` | `references/tooling-reviewer.md` |
| Divergent | `fable` | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings in the `Agent` response body.

### 3. Synthesize

One `Agent` call, `subagent_type: general-purpose`, `model: fable`. The synthesizer's quality check includes spot-verifying citations, which can require MCP access. Use `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. The synthesizer returns a structured Accepted / Rejected / Backlog list.

### 4. Structural enforcement check

Sanity-check the synthesizer's Accepted list. For any item that would be enforced more reliably by a lint rule, script, metadata flag, or runtime check, move it from Accepted to Backlog.

### 5. Apply

Before applying any Accepted edit, present the synthesizer's full Accepted/Rejected/Backlog output to the user and wait for explicit approval. The user picks which subset to apply and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

Backlog items are listed for the user to file. Do not file them anywhere without approval.

For each approved Accepted item, follow the Routing field exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): parent does directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): load the `writing-great-skills` skill and draft the edit against its principles.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): load `writing-great-skills` and rewrite the description per its "Writing the description" section.
- `new skill via writing-great-skills: <kebab-name>`: load `writing-great-skills` before creating it. Do not invent the shape ad hoc.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done. Skip this step if it doesn't.

### 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog for the user to file: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
