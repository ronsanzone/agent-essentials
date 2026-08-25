# PagerDuty (incident record)

## What this source contains

Incidents with their alerts, notes, change events, and timelines. Best at the operational forcing function: the page that woke someone, the note that says what was done, the change event that correlates a deploy with recovery. Pair with `incident-postmortem.md` when the anchored code looks defensive.

## How to search it

Executor paths: `pagerduty.user.default.list_incidents` (filter by service, status, and time window), `pagerduty.user.default.list_alerts_from_incident`, `pagerduty.user.default.list_incident_notes`, `pagerduty.user.default.list_incident_change_events`. Describe before calling; do not touch `manage_incidents`.

1. **Window and service.** List incidents on the owning service in the weeks before the ship date.
2. **Match to the code.** For each candidate, read alerts (the triggering condition) and notes (what responders concluded). Keep the ones whose alert or note names the anchored feature, symbol, or error.
3. **Change events.** Correlate the PR's deploy with the incident's resolution.
4. **Follow-ups.** Notes often cite a ticket or postmortem; hand those keys to the Jira and Confluence investigators through the coverage map.

## What good evidence looks like here

- An alert condition that matches the guard or timeout the code adds.
- A responder note that states the root cause or the mitigation that became the fix.
- A change event for the PR's deploy shortly before the incident resolved.

## Common pitfalls

- Service names in PagerDuty differ from repo and team names. Confirm the mapping from a runbook or a ticket.
- Auto-resolved incidents carry no notes; the trigger condition is still evidence.
- One incident can generate many alerts. Cite the incident, not every alert.

## What to return

Incident number and URL, service, created and resolved times, the triggering alert text, note excerpts with author and time, and the change events in the window.
