# End-of-Implementation Audit Checklist

After all tasks are marked complete, run this audit before declaring implementation done. Assume the work is on the current feature branch. Compare the branch against its merge base with the parent branch.

## Part 1: Re-run success criteria

For each phase in the plan, run its `### Phase N success criteria` automated commands. Record outcomes in a temporary audit table:

```markdown
| Phase | Command | Result |
|-------|---------|--------|
| 1     | `<cmd>` | ✅ / ❌ <stderr summary if failed> |
```

If any command fails, surface immediately. Do not proceed silently.

## Part 2: Plan-vs-diff audit

1. Determine the parent branch/merge base, then run `git diff --stat <merge-base>..HEAD` and inspect `git diff <merge-base>..HEAD` as needed.
2. For each `[x]` row in the Task Completion table, verify the corresponding file changes appear in the diff. Flag:
   - Tasks marked `[x]` with no matching file changes.
   - Files changed but no task in the plan claims them.
   - Task's recorded short SHA not present in `git log <merge-base>..HEAD`.
3. Record findings as **Matches plan** / **Deviation** / **Potential issue**.

## Part 3: Quick-review session pass

Dispatch a fresh Task subagent (`general-purpose`, `model: "sonnet"`) to invoke `/quick-review`:

```text
Invoke the /quick-review skill to review the current feature branch against its parent branch / merge base. The plan is at <ARTIFACT_DIR>/plan.md — use it as the spec when evaluating completeness.
```

## Aggregate and gate

Combine findings from Parts 1, 2, and 3 into a single audit summary categorized as Critical / Significant / Minor.

- **Critical or Significant present:** `AskUserQuestion` listing each finding; ask which to fix; apply fixes through fresh implementer subagents; after fixes, re-run only the affected success-criteria commands and re-verify.
- **Only Minor or none:** proceed to Completion.
