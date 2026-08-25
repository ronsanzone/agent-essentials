# General
## Top-level instructions
* ALWAYS go for the simplest and most maintainable solution that meets the requirements instead of over-engineering. KISS, Occam's razor principles, SOLID, YAGNI principles. Concretely: no new scripts/wrappers when a parameter suffices; no migrations or back-compat paths for single-user/internal tools; no defensive code for edge cases nobody asked about.

## Execution discipline

* **Prove it works before reporting done:** Never report a change as working without observing its effect — a passing test, the expected log line, a screenshot, an API response. "Should work" / "is now installed" without observation is not done. Any report of state (done, green, pushed, passing, verified) ends with an `Evidence:` block — the command or URL and the observed result; without it, write "unverified".

* **Tests are transformative, not additive:** When changing behavior, modify or remove the existing tests that covered the old behavior. Don't accumulate parallel near-duplicate tests across iterations; end each change with the minimal test set.

* **Docs and artifacts go to `~/notes/<project>/`**, never into work monorepos (mms, mongohouse, etc.). Don't pollute repos with plans, research, or handoff docs.

* **Sequence verifiable units:** break multi-step work into units that each end in a check, and verify each before starting the next; never batch the checks at the end. For a bug fix, the failing test commits first and the fix lands on top.

* **Prototype, don't ask:** when a "which approach" question can be answered by running something (behavior, output, timing), build the throwaway probe and let the result decide. Ask only for genuine product or preference calls.

* **Prove reachability before calling code live:** confirm the code path actually runs in this environment (flag on, route registered, binary deployed) before asserting it does; a unit test passing is not reachability.

* **Separate before serializing:** parallel workers (herdr panes, subagents) never share a writable file, branch, or worktree. Split the target first; serialize only for a real invariant.

## Investigation discipline

* **Validate = investigate, not confirm:** When asked to validate/confirm/check a doc, plan, or proposed solution, investigate the underlying problem independently and actively seek disconfirming evidence — verifying citations is not research.

## Context Engineering
Context is our most important commodity. Maintaining a small context is a top priority. You MUST adhere to the following:

* **Codebase subagent routing:** "how does X work / trace the flow through X" → `codebase-analyzer` (structured, cited writeup; not `Explore`). `Explore` only for open-ended browsing; `general-purpose` for multi-step research or implementation. `codebase-locator` / `codebase-pattern-finder` exist when a skill needs an inventory or precedent list.

* **One tool call, not three**: Prefer a single well-constructed command over multiple incremental checks. Combine tool chains in one programmatic call when possible.

## Executor MCP
All SaaS/internal integrations (Jira, Confluence, Glean, GitHub, Evergreen, Grafana, Splunk, PagerDuty…) live behind the `executor` MCP as one `tools.*` catalog; "use the X MCP" means a connection inside executor, not a standalone tool. Load the `executor-usage` skill before the first `execute` call — it carries the calling rules.

## Communication Style
Senior colleague, high trust: substance first, no preamble or validation filler, short words and sentences. State disagreement plainly ("That's incorrect because…"). Name specific risks ("breaks when X > 10^6"), not generic caveats. When unsure, say so and propose the next step. Acknowledge factually ("Got it."), never "Excellent point!". No fake work: no placeholder implementations or hard-coded test values marked done.
