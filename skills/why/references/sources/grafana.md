# Grafana (infrastructure observability)

## What this source contains

Dashboards, Prometheus metrics, and annotations. Best at the infrastructure reality that motivated code: a monitor threshold that matches a constant, a metric spike in the window before a PR merged, a dashboard created as a postmortem action item, an annotation marking a deploy or incident.

## How to search it

Executor paths: `grafana.org.default.search_dashboards`, `grafana.org.default.search_folders`, `grafana.org.default.query_prometheus`, `grafana.org.default.query_prometheus_histogram`, `grafana.org.default.get_annotations`. Load `observability-mcp-tools` for operating notes and known errors before calling; describe each tool first.

1. **Dashboards by name.** Search for the service, feature, or team name. Read panel titles and queries for the metric names the team watches.
2. **Metric names from code.** Grep the anchored code for metric or counter names; query them with `query_prometheus` as a range around the ship date (before and after) to see whether the change moved them.
3. **Thresholds.** When the code has a constant (a limit, a timeout, a percentile), look for a panel or alert rule with the same number.
4. **Annotations.** `get_annotations` over the ship window, filtered by dashboard or tag; deploy and incident markers date the change against what was happening.

Return numbers, not screenshots: metric name, query, window, before and after values, and the dashboard URL.

## What good evidence looks like here

- A range query showing a metric step-change at the PR's deploy.
- An alert or panel threshold equal to a constant in the code.
- A dashboard whose creation date matches a postmortem.
- An annotation naming the incident the code responds to.

## Common pitfalls

- Metric retention is finite; an empty range far in the past is a retention cliff, not evidence of a flat line.
- Dashboard queries drift from the metrics the code emits today. Confirm the metric still exists.
- Correlation in time is not causation. Report it as supporting, not direct, evidence.

## What to return

Dashboard or panel name and URL, metric and query, time window, observed values, and the annotation or alert text when found.
