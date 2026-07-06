---
name: refine-ticket
description: "Use when starting work on a ticket that needs refinement before entering the deep-work pipeline. Reads from Jira, pasted text, or a file, then interactively refines it into a structured ticket.md."
---

# Refine Ticket

Interactively refine a ticket into a structured `ticket.md` file. Walks through 4 fixed categories asking targeted questions one at a time. Outputs a clean, consistent ticket ready for the deep-work pipeline.

**Announce at start:** "Starting ticket refinement."

## Hard Rules

- **Never auto-fill content, but do identify gaps.** The user provides all information. You structure it. However, you MUST analyze each category and call out specific gaps, ambiguities, or missing details to help the user refine effectively.
- **Fixed categories only.** Do not add, skip, or reorder categories.
- **No technical investigation.** Do not suggest reproduction steps, environment details, investigation starting points, or code analysis. That is the pipeline's job. Context gathering (reading linked docs) is NOT technical investigation — it is required.
- **Always write a file.** Output is `ticket.md` in the current working directory. Never output the ticket as conversation text only.

## Setup

1. Parse `$ARGUMENTS`:

   **Jira key** — If `$ARGUMENTS` matches a Jira issue key pattern (letters, hyphen, digits like `PROJ-123`):

   Fetch the full ticket and all comments in parallel:
   ```bash
   # Full ticket (description, summary, acceptance criteria, labels, priority)
   jira issue view $ARGUMENTS --raw
   ```
   ```bash
   # All comments (fetch separately to ensure none are missed)
   jira issue view $ARGUMENTS --raw | jq -r '.fields.comment.comments[]? | "**" + .author.displayName + "** (" + .created[:10] + "):\n" + .body + "\n---"'
   ```
   ```bash
   # Linked issues
   jira issue view $ARGUMENTS --raw | jq -r '(.fields.issuelinks[]? | select(.inwardIssue) | .inwardIssue.key + ": " + .inwardIssue.fields.summary), (.fields.issuelinks[]? | select(.outwardIssue) | .outwardIssue.key + ": " + .outwardIssue.fields.summary)'
   ```

   Extract from the full ticket: summary, description, acceptance criteria, labels, priority, and ALL comments.
   Set `<source>` to the Jira key.

   **File path** — If `$ARGUMENTS` is a readable file path, read it. Set `<source>` to `"file"`.

   **Paste mode** — If `$ARGUMENTS` is empty or doesn't match above patterns, ask via `AskUserQuestion`:
   - Question: "Please paste the ticket content."
   - Options: "Ready to paste" (user provides content via Other/free-text)

   Set `<source>` to `"pasted"`.

2. Store raw content as `<raw-ticket>`.

3. **Gather linked context via Glean.** Scan the ticket and comments for URLs and key topics.
   - For each URL found, use the Glean MCP to read it (querying by URL or title). Also run a general Glean search on the ticket summary to surface related internal docs not explicitly linked.
   - Store all gathered content as `<linked-context>` for per-category analysis. If a document cannot be read, note "Could not fetch: <url>" and move on.

4. Display:
   > **Raw ticket:**
   > <raw-ticket content>

   If linked context was gathered, also display:
   > **Context gathered from linked resources:**
   > <brief summary of what was read and key takeaways>

## Process

Walk through each category **in order**. For each:
1. Show what the ticket currently says about it (extract from `<raw-ticket>`, or "Not specified in ticket.")
2. **Provide your analysis:** Identify specific gaps, ambiguities, or missing details based on the ticket content AND any `<linked-context>` gathered. Suggest concrete questions or areas the user might want to clarify. This is the key value-add — don't just parrot the ticket back.
3. Ask **one** question via `AskUserQuestion` that references your specific findings
4. Store the response as refined content for that category

### Category 1: Problem Statement

> **Problem Statement — here's what the ticket says:**
> <extracted or "Not specified in ticket.">

Analyze and present:
- Who specifically is affected? (end users, IaC users, internal teams?)
- Is the "why" clear, or just the "what"?
- Are there details from `<linked-context>` that clarify the motivation?

`AskUserQuestion`:
- Question: "<Specific question based on your analysis, e.g. 'The ticket says IaC is hard but doesn't specify which IaC tools or workflows break. Should we clarify the affected personas?'>"
- Options:
  - "What's in the ticket is sufficient"
  - "Good catch, I'll clarify" (user provides via Other/free-text)

If "sufficient", use existing content. Otherwise use the user's response (combined with existing if relevant).

### Category 2: Scope & Boundaries

> **Scope & Boundaries — here's what the ticket says:**
> <extracted or "Not specified in ticket.">

Analyze and present:
- Is out-of-scope defined, or only in-scope?
- Are there adjacent concerns (backward compatibility, migrations, API versioning) not mentioned?
- Does `<linked-context>` reveal scope decisions not captured in the ticket?

`AskUserQuestion`:
- Question: "<Specific question based on your analysis, e.g. 'The ticket mentions UI changes but not whether existing API consumers need backward compatibility. Should we define out-of-scope items?'>"
- Options:
  - "What's in the ticket is sufficient"
  - "I'll define the boundaries"

### Category 3: Acceptance Criteria

> **Acceptance Criteria — here's what the ticket says:**
> <extracted or "Not specified in ticket.">

Analyze and present:
- Are criteria testable and specific, or vague?
- Are there missing criteria implied by the scope (e.g., tests, documentation, migration)?
- Does `<linked-context>` mention criteria not in the ticket?

`AskUserQuestion`:
- Question: "<Specific question based on your analysis, e.g. 'The criteria say \"change the transition systems\" but don't specify which transitions or how to verify correctness. Should we make these more specific?'>"
- Options:
  - "What's in the ticket is sufficient"
  - "I'll refine the criteria"

### Category 4: Gathered Context

Pre-populate with: linked issues and comments from Setup + all `<linked-context>` gathered from URLs.

> **Gathered Context — here's what we have so far:**
> <linked issues + comments + linked-context summaries, or "No additional context found.">

If context was gathered from linked docs, highlight key takeaways relevant to the work.

`AskUserQuestion`:
- Question: "Are there additional related tickets, CS reports, error logs, docs, or Slack threads that should be included?"
- Options:
  - "What's shown above is sufficient"
  - "I have additional context to add"

## Assembly

After all 4 categories:

1. Assemble the refined ticket using the **exact** Output format below — including YAML frontmatter. Do not invent a different format.
2. Display the complete assembled ticket to the user
3. Ask via `AskUserQuestion`:
   - Question: "Does this refined ticket look good?"
   - Options:
     - "Looks good, save it"
     - "Needs edits" (user provides corrections via Other/free-text, apply them, re-present)

## Output

Write `ticket.md` to the current working directory using the Write tool.

```markdown
---
source: <source>
refined_date: <today YYYY-MM-DD>
---

## Problem Statement
<refined content>

## Scope & Boundaries
<refined content>

## Acceptance Criteria
- [ ] <criterion 1>
- [ ] <criterion 2>

## Gathered Context
### Related Tickets
<if any>

### Comments
<if any>

### Additional Context
<if any>

## Original Ticket
<raw-ticket>
```

Omit empty subsections under Gathered Context rather than leaving them blank.

## Completion

Print: "Refined ticket saved to `ticket.md`."
