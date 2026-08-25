# React Ruleset

Domain-specific review rules for React changes. Loaded by local-code-review when the diff touches React files.

## React Doctor Analysis

Run `react-doctor` against the diff to get automated findings. This output should be merged into your review — it catches issues that are hard to spot in a manual diff review.

```bash
# Try running react-doctor from project root
npx -y react-doctor@latest . --diff master --verbose
```

If it fails due to Node version incompatibility:

```bash
# Set a compatible Node version via asdf, then retry
asdf set nodejs 22.17.1
npx -y react-doctor@latest . --diff master --verbose
```

**Using react-doctor output:**
- Treat react-doctor findings as additional evidence, not the final word — cross-reference with the diff
- Escalate react-doctor errors to Critical or High when they overlap with issues you found manually
- If react-doctor reports no issues, don't skip your own review — it doesn't catch everything

## Folding react-doctor Findings into the Review

Every react-doctor warning must appear in the final review — none may be silently dropped.

- **Assess each warning** against the diff and surrounding code context
- **Assign severity** (Critical/High/Medium/Low) based on actual impact, not react-doctor's framing
- **Tag the finding** with `[react-doctor]` in the title so the source is clear
- **Dismissed warnings** still appear as Low bullets with rationale: `L3. [react-doctor] Array index key — dismissed, stable list with no reordering`
- If a react-doctor warning overlaps with a manual finding, merge them into one finding and tag both sources

## React Best Practices Checklist

Apply these to all changed React code, in addition to the general analysis framework:

### Correctness & Hooks
- Hooks called unconditionally and in consistent order (no hooks inside conditionals, loops, or early returns)
- `useEffect` dependencies are complete and correct — missing deps cause stale closures, extra deps cause unnecessary re-runs
- Cleanup functions returned from `useEffect` for subscriptions, timers, and event listeners
- State updates that depend on previous state use the functional form: `setState(prev => ...)`

### Performance
- Components don't create new objects/arrays/functions in render that cause unnecessary child re-renders
- Expensive computations wrapped in `useMemo`, expensive callbacks in `useCallback` — but only when there's a measured or obvious need (premature memoization adds complexity)
- Lists rendered with stable, unique `key` props — never array index unless the list is static

### Component Design
- Components have a single responsibility — split when a component handles unrelated concerns
- Props are specific rather than passing entire objects when only one field is used
- Derived state is computed during render, not synced via `useEffect` (the "you might not need an effect" pattern)
- Controlled vs uncontrolled inputs are consistent — no switching between modes

### State Management
- State lives at the lowest common ancestor that needs it — not hoisted unnecessarily
- Related state that always updates together is grouped into a single `useState` or `useReducer`
- No redundant state that can be derived from other state or props

### Error Handling
- Error boundaries around independently-failing UI sections
- Async operations handle unmount (abort controllers, cleanup flags)
