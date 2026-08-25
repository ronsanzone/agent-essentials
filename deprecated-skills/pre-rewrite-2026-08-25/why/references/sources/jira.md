# Jira (devprod-gateway)

## What this source contains

Tickets, epics, linked issues, comments, status history, and custom fields. Best at the product or business forcing function: the customer ask, the compliance deadline, the incident follow-up, the parent initiative. Project keys come from the code anchor (commit subjects and PR titles carry them, for example `CLOUDP-`, `SERVER-`).

## How to search it

Executor path: `mongodb_devprod_mcp.org.localmongodbdevprodmcp.jira_search_issues` (JQL). Describe it before calling. Related: `jira_get_fields` when a custom field is needed, and any `jira_get_issue*` tool for one ticket's full comments and links.

1. **Keys first.** `key in (<every ticket ID from the anchor>)`. Read summary, description, comments, linked issues, and the epic.
2. **Symbol and feature text.** `text ~ "<symbol or feature name>"`, optionally scoped with `project = <key from the anchor> AND created >= -2y`. Include the casual names the team uses, not only the code identifier.
3. **PR and commit references.** `text ~ "<PR number>"` and `text ~ "<short SHA>"`. Tickets often quote the PR URL in a comment.
4. **Neighbours.** For a hit, follow `issuelinks` (blocks, relates to, caused by) and the epic; the rationale is often one hop away.
5. **Labels and components.** `labels in (incident-followup, compliance, perf-regression)` or `component = <area>` when the question is why a class of change happened.

Run all queries in one `execute`, fetch each issue once, and return trimmed fields: key, summary, status, created, resolved, assignee, labels, the comment excerpts that carry rationale, and linked keys.

## What good evidence looks like here

- A description that states the problem in the customer's or operator's words.
- A comment that records a decision or a rejected alternative, with the author.
- A link to an incident ticket or a Build Failure Group that names the trigger.
- Status history showing the ticket was reopened (the first fix did not hold).

## Common pitfalls

- Ticket summaries restate the change, not the reason. Read the description and comments.
- Closed-as-duplicate tickets point at the real one; follow the link.
- `text ~` is fuzzy. Confirm a hit actually concerns the anchored code before citing it.
- No hit for a symbol is a finding (the change was not ticketed under that name), not a reason to widen until something matches.

## What to return

For each relevant ticket: key, summary, created and resolved dates, reporter and assignee, verbatim quotes with attribution, linked keys, and the query that found it.
