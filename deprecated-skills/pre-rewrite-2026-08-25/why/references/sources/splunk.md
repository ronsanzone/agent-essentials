# Splunk (logs and errors) and Build Failure Groups

## What this source contains

Application and infrastructure logs, error strings, stack traces, and (via devprod-gateway) Evergreen Build Failure Groups. In this environment this is the error-tracking category: the specific exceptions and failure trajectories that motivated defensive or corrective code.

## How to search it

Executor paths: `splunk.org.default.splunk_run_oneshot_query` (default, single response) and `splunk.org.default.splunk_run_job_query` (paged, for large results). Load `observability-mcp-tools` for index names, time-range syntax, and known errors before writing SPL; describe the tool first. For CI failures the code may be reacting to, `mongodb_devprod_mcp.org.localmongodbdevprodmcp.bb_search_bfgs` searches Build Failure Groups by test, task, or text.

1. **Error strings from the code.** Grep the anchored code for log messages, exception names, and error codes; search those verbatim over the window around the ship date.
2. **Before and after.** Count the error in the weeks before and after the PR's deploy. A drop to near zero is supporting evidence the code targets it.
3. **Callers and symbols.** Search the function or class name when logs include stack frames.
4. **Build Failure Groups.** `bb_search_bfgs` for the test or task names near the anchored code; a BFG ticket often names the flake or failure a retry or skip was added for.

Keep SPL read-only, bound the time range, and aggregate in the query (`stats count by ...`); return counts and a few verbatim sample events, never raw dumps.

## What good evidence looks like here

- An error whose first-seen and last-seen bracket the PR's ship date.
- A stack trace through the anchored function before the fix.
- A BFG whose description matches a guard, retry, or skip in the diff.
- A volume drop after deploy with the query that shows it.

## Common pitfalls

- Index and retention limits: a null result for an old window is a cliff, not absence. Name the window searched.
- Log messages get reworded; search the old wording from the pre-change code too (`git show <sha>:<path>`).
- Counting noisy duplicates inflates severity. Aggregate per host or per request where the data allows.

## What to return

The SPL or BFG query, time window, counts before and after, two or three verbatim sample events with timestamps, and the BFG keys with their summaries.
