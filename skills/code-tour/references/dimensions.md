# Research dimension menu

Pick five. The first five are the runtime-flow defaults (ramp-up, PR review); the last four suit showcase tours.

| Dimension | When to pick | Agent type | Key questions |
|-----------|--------------|------------|---------------|
| **Framework / Contract** | Always useful | codebase-analyzer | What contract does it implement? What are the abstractions and extension points? What must subclasses provide? |
| **Upstream / Triggers** | Runtime-flow tours | codebase-analyzer | What events, actions, or callers trigger this code? What's the entry point? |
| **Downstream / Consumers** | Runtime-flow tours | codebase-analyzer | Where does the data flow next? What decisions or behaviors does it affect? |
| **Model / Persistence** | CRUD-shaped systems | codebase-analyzer | How is state stored and queried? What are the key fields and their semantics? |
| **The Change / System Overview** | Always (PR/branch → Change; topic → Overview) | codebase-analyzer | What specifically changed and why? Or: what are the components and boundaries? |
| **History / Road So Far** | **Showcase tours, multi-month projects** | **general-purpose** | Chronological narrative from git log + ticket docs + decision logs + skunkworks notes. Group commits by milestone, not by ticket. Highlight decisions and their motivation. |
| **Performance / Outcomes** | **When perf docs or benchmarks exist** | codebase-analyzer | Before/after numbers, hypothesis-by-hypothesis ledger, what moved the needle, what didn't. Often the single highest-signal section in showcase tours. |
| **External Integrations** | When the system talks to third-party APIs/SDKs | codebase-analyzer | Wire protocol, auth, lifecycle, credentials, error semantics. Fills the slot Model/Persistence usually fills for CRUD systems. |
| **Recent Activity** | Ramp-up tours on active codebases | general-purpose | `git log --since` grouped by ticket/theme. Powers the "What's Actively Being Built" section. |
