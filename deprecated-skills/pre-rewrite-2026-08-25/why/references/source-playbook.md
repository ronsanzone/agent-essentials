# Source playbooks

The why skill spawns one investigator per available evidence category, each reading a single source-specific playbook below. The playbooks are concrete examples for common MCPs; adapt them for a different MCP in the same category.

| Category | Playbook | Example MCP it documents |
|---|---|---|
| Source control history | [`code-archaeology.md`](./sources/code-archaeology.md) | git, `gh` |
| Issue / ticket tracker | [`linear.md`](./sources/linear.md) | Linear (adapt for Jira, GitHub Issues, Plane, Shortcut) |
| Long-form documents | [`notion.md`](./sources/notion.md) | Notion (adapt for Confluence, Google Docs, Coda) |
| Real-time team chat | [`slack.md`](./sources/slack.md) | Slack (adapt for Discord, Microsoft Teams, Mattermost) |
| Infrastructure observability | [`datadog.md`](./sources/datadog.md) | Datadog (adapt for New Relic, Honeycomb, Grafana, Splunk) |
| Error / exception tracking | [`sentry.md`](./sources/sentry.md) | Sentry (adapt for Rollbar, Bugsnag, Airbrake) |
| Product analytics warehouse | [`databricks.md`](./sources/databricks.md) | Databricks SQL (adapt for Snowflake, BigQuery, ClickHouse, dbt) |

## This environment (executor connections, catalogued 2026-08-23)

| Category | Playbook | Executor connection |
|---|---|---|
| Source control history | [`code-archaeology.md`](./sources/code-archaeology.md) | git, `gh`; `github.org.githubPullRequestsOauth.search_pull_requests` / `pull_request_read` when `gh` lacks access |
| Issue / ticket tracker | [`jira.md`](./sources/jira.md) | `mongodb_devprod_mcp.org.localmongodbdevprodmcp.jira_search_issues` (JQL) |
| Long-form documents | [`confluence.md`](./sources/confluence.md) | `...confluence_search` (CQL), `...confluence_get_page`; Glean for Google Docs |
| Real-time team chat | [`glean.md`](./sources/glean.md) | `glean-data.user.default.search` (indexes Slack); no direct Slack connection |
| Infrastructure observability | [`grafana.md`](./sources/grafana.md) | `grafana.org.default.*`; see the `observability-mcp-tools` skill |
| Error / exception tracking | [`splunk.md`](./sources/splunk.md) | `splunk.org.default.splunk_run_oneshot_query`; `...bb_search_bfgs` for Build Failure Groups |
| Incident record (cross-cutting) | [`pagerduty.md`](./sources/pagerduty.md) | `pagerduty.user.default.list_incidents` and incident notes/alerts/change events |
| CI history | [`evergreen.md`](./sources/evergreen.md) | `...evg_get_task_history`, `...evg_get_version`, `...bb_search_bfgs` |
| Product analytics warehouse | none | no connection in this environment; report as a gap |

Re-run `tools.search` at the start of every investigation; the live catalog wins over this table.

Cross-cutting:

- [`incident-postmortem.md`](./sources/incident-postmortem.md). Add this if the target code looks defensive (null checks, retry, timeout, rate limit, feature flag, egress guard, OOM handler).
