# Glean (company-wide index: chat, docs, tickets, mail)

## What this source contains

Glean indexes Slack, Google Docs, Confluence, Jira, and email. In this environment it is the only route into real-time chat, so it owns the "real-time team chat" category and doubles as a cross-source net for long-form docs. Best at the decisions that never reached a doc: incident threads, reviewer questions answered by the author, "we decided X because Y" messages.

## How to search it

Executor paths: `glean-data.user.default.search` (primary), `glean-data.user.default.read_document` (full content of a hit), `glean-data.user.default.employee_search` (find the PR author or the team), `glean-data.user.default.code_search` (top code matches across repos). Describe `search` before calling; it accepts natural-language queries and may accept datasource filters.

1. **Author-bounded.** The PR author's name plus the feature name, around the merge date. Ask `employee_search` for the author's team and channels when the name alone is ambiguous.
2. **Feature, symbol, and error strings.** Casual phrasings too; chat does not use code identifiers.
3. **PR and ticket references.** The PR URL, `/pull/<n>`, and the ticket key. Reviews and incident threads link them.
4. **Incident vocabulary.** "sev", "incident", "rollback", "hotfix" with the feature name, in the weeks before the ship date.
5. **Thread traversal.** For any chat hit, `read_document` the thread, not the single message. The decision lives in the replies.

Run the sweep in one `execute`; read only the hits whose snippet mentions the anchored code; return trimmed findings.

## What good evidence looks like here

- A thread where tradeoffs were debated, with the author's stated reason for the pick.
- A reviewer question and the authoritative answer.
- An incident thread describing the failure the code now prevents.
- A product or support message explaining a customer ask.

## Common pitfalls

- Retention and permissions: a null result may mean "not indexed" rather than "never said". Say which.
- Single messages without their thread read differently in context. Always fetch the thread.
- Jokes and speculation are not decisions. Cite considered discussion.
- Glean returns Confluence and Jira hits too; hand those to the matching investigator's category in the coverage map rather than double-citing.

## What to return

Source type (Slack channel, doc, mail), permalink, participants, date range, verbatim quotes with attribution, and the query that found it.
