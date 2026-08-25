# Confluence (devprod-gateway)

## What this source contains

Design docs, RFCs, runbooks, postmortems, team pages, meeting notes. Best at long-form rationale: problem statements, "alternatives considered", decisions with owners, postmortem action items that became code.

## How to search it

Executor path: `mongodb_devprod_mcp.org.localmongodbdevprodmcp.confluence_search` (CQL), then `confluence_get_page` for full content (or `confluence_get_page_by_title` when a title is known). Describe before calling. Glean's `search` (`glean.md`) also indexes Confluence and Google Docs and is the better first net when the space is unknown.

1. **Feature and symbol text.** `text ~ "<feature name>"`, `text ~ "<symbol>"`. Add `AND type = page` to drop comments and attachments.
2. **Ticket and PR references.** `text ~ "<ticket key>"`, `text ~ "<PR number>"`.
3. **Space scoping.** When the owning team is known, `space = <KEY> AND text ~ "..."`. Team space keys appear in links from tickets and PR descriptions.
4. **Document types.** `title ~ "RFC"`, `title ~ "Design"`, `title ~ "Postmortem"`, `title ~ "Decision"` combined with the feature text.
5. **Time window.** `lastmodified >= "<ship date minus 6 months>"` when the question is about a specific change.

Fetch each page once. Extract the sections that carry rationale (problem, goals, non-goals, alternatives, decision, open questions) and return those with the page URL and last-modified date.

## What good evidence looks like here

- An "Alternatives considered" section that rejects the option the user is asking about.
- A decision record with date and owner.
- A postmortem action item that names the code path or the guard that was added.
- A runbook step that explains why an operational constraint exists.

## Common pitfalls

- Docs describe the plan, not what shipped. Check the design against the diff; note divergence as a finding.
- Stale pages outrank current ones in search. Read last-modified dates.
- Draft and template pages match broad text queries. Skip pages with no owner or content.

## What to return

Page title, URL, space, last-modified date, author when visible, verbatim quotes of the rationale with section names, and the CQL that found it.
