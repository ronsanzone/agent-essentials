# Incident & postmortem angle (cross-cutting)

Not a separate source — an angle every investigator adds when the target looks defensive (null checks, retries, timeouts, rate limits, feature flags, egress guards, OOM handling). Incidents motivate defensive code ("we added this after the X outage"); hunt for that history in each source:

- **git / `gh`**: commits like "fix for incident", "add defensive check", a `revert` followed by "re-apply with…"; PRs linking a PagerDuty incident, a Jira `incident-followup`, or a Confluence postmortem.
- **Jira**: labels/components such as `incident`, `sev*`, `postmortem-action-item`, `reliability`, `hotfix`; tickets created in the days after a spike whose description cites the error string.
- **Confluence**: postmortem pages mentioning the file, feature, error string, or ticket; the "Action Items" section ties directly to code changes.
- **Glean (Slack)**: `#sev-*`, `#incident-*`, team channels around the date the target landed; threads quoting the error string or linking the PR.
- **Grafana**: alert rules whose thresholds match code constants; dashboards created as postmortem action items; metric spikes in the window before the merge.
- **Splunk**: the error string or stack frames through the target, with first-seen/last-seen windows bracketing the ship date; an error that stops at a release version; Build Failure Groups referencing the test.
- **PagerDuty**: incidents whose window brackets the PR date; incident notes and change events referencing the service or ticket.
- **Evergreen**: task history showing when a test started failing and the patch/version that made it pass again.

If you find an incident link, fetch the full postmortem. Corroboration across sources (PagerDuty incident → Jira ticket → Confluence postmortem → Slack thread → target PR) is the strongest evidence this skill produces. Skip this angle for code that does not look defensive.
