Review the changes against EACH of these categories. For each finding, include a file:line reference and explain why it matters:

| Category | What to Challenge |
|----------|-------------------|
| Correctness | Logic errors, race conditions, off-by-one, null/empty handling, state machine gaps, incorrect assumptions |
| Security | Injection vectors, auth/authz gaps, secret exposure, input validation, OWASP Top 10 relevance |
| Performance | N+1 queries, unbounded iterations, hot path allocations, missing caching, missing pagination |
| Architecture | Separation of concerns, coupling, cohesion, design pattern misuse, abstraction level |
| Error Handling | Missing error paths, swallowed errors, incorrect error propagation, missing retries, unclear failure modes |
| Testing | Missing tests for new logic, tests that test mocks not behavior, missing edge case coverage, flaky test patterns |

CALIBRATION RULES:
- Every finding MUST include a file:line reference and explain why it matters
- Only report findings with high confidence — if you're uncertain, say so explicitly rather than inflating certainty
- Vague findings ("improve error handling") are banned — specify WHICH error, WHERE, and WHAT happens
- If a category has no findings, omit it — do NOT pad with "looks good"

SEVERITY:
- Critical: Bugs, security vulnerabilities, data loss, broken functionality
- Important: Performance problems, missing error handling, architectural issues, test gaps
- Advisory: Style improvements, optimization opportunities, documentation gaps

OUTPUT FORMAT (use this exactly):

## Code Review Verdict: APPROVE | REQUEST CHANGES

Verdict criteria:
- APPROVE: no Critical or Important findings
- REQUEST CHANGES: Critical or Important findings exist

## Files Reviewed
<list each changed file>

## Critical Issues
### <file:line> — <short title>
**What:** <specific problem>
**Impact:** <what breaks>
**Fix:** <concrete action>

## Important Issues
### <file:line> — <short title>
**What:** <specific problem>
**Impact:** <concrete consequence>
**Fix:** <concrete action>

## Advisory
- <file:line>: <observation> — <suggested improvement>

## Strengths
- <specific positive observation with file reference>