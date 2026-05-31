Review the plan against EACH of these categories. For each finding, reference the specific task number (e.g., "Task 2.3") and explain the concrete impact:

| Category | What to Challenge |
|----------|-------------------|
| Completeness | No TODOs, placeholders, or incomplete tasks. No implicit "the implementer will figure it out" gaps. |
| Spec Alignment | Plan implements what the spec and design decisions ask for — not a subset, not a superset. |
| Task Decomposition | Tasks have clear boundaries. Steps are actionable. Each task is independently executable. Dependencies are explicit. |
| Buildability | Could an engineer with zero codebase context follow this plan without getting stuck? Are file paths, signatures, and commands correct? |
| Logic Correctness | Race conditions, ordering bugs, state machine gaps, off-by-one errors, null/empty handling, error propagation paths. |
| Security | Input validation, auth/authz checks, injection vectors, secret handling, OWASP Top 10 relevance, trust boundary violations. |
| Performance | N+1 queries, unbounded iterations, missing indexes, large payload handling, hot path allocations, missing pagination. |
| Availability & Resilience | Failure modes, retry/backoff strategy, graceful degradation, timeout handling, dependency failure cascading. |
| Durability & Data Integrity | Transaction boundaries, idempotency, data migration safety, rollback path, schema evolution strategy. |
| Stability & Regression Risk | Existing tests preserved, breaking changes identified, backward compatibility, shared module impact. |
| Code Best Practices | DRY violations across tasks. Separation of concerns. Error handling consistency. |
| Testability | Planned tests cover the right invariants. Missing edge case tests. Integration test coverage for failure modes. Test isolation. |

CALIBRATION RULES:
- Every finding MUST reference a specific task/step and explain concrete impact
- "Could be a problem" without specifics is not a finding — cut it
- "Consider adding error handling" is banned — specify WHICH error, WHERE, and WHAT happens if unhandled
- If a category has no findings, omit it from the report — do NOT pad with "looks good"
- Do NOT re-litigate design decisions from 03-design-discussion.md — those are settled

SEVERITY:
- Critical: Would cause a bug, security vulnerability, data loss, or failure to meet a requirement
- Important: Would cause performance issues, maintenance burden, fragility, or missing edge case coverage
- Advisory: Would improve quality but absence won't cause failures

OUTPUT FORMAT (use this exactly):

## Plan Review Verdict: APPROVED | APPROVED WITH CONDITIONS | REVISE

Verdict criteria:
- APPROVED: no Critical or Important findings
- APPROVED WITH CONDITIONS: Important findings only, implementable with noted fixes
- REVISE: Critical findings that require plan changes before implementation

## Requirements Traceability
- [x] Requirement 1 → Task X.Y
- [ ] Requirement 3 → MISSING — no task covers <specific gap>

## Critical Issues
### [CATEGORY] Task X.Y: <short title>
**What:** <specific problem>
**Impact:** <what breaks, what's vulnerable, what data is lost>
**Fix:** <concrete action — add step, modify task, add test case>

## Important Issues
### [CATEGORY] Task X.Y: <short title>
**What:** <specific problem>
**Impact:** <concrete consequence>
**Fix:** <concrete action>

## Advisory
- [CATEGORY] Task X.Y: <observation> — <suggested improvement>

## Strengths
- <specific positive observation with task reference>