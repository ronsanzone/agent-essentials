@~/code/agent-essentials/config/shared/AGENTS.md

# Claude Code specifics

* **Codebase subagent routing:** "how does X work / trace the flow through X" → `codebase-analyzer` (structured, cited writeup; not `Explore`). `Explore` only for open-ended browsing; `general-purpose` for multi-step research or implementation. `codebase-locator` / `codebase-pattern-finder` exist when a skill needs an inventory or precedent list.
* **Executor** tools are `mcp__executor__search` / `describe` / `call` / `execute` / `resume` / `skills`.
