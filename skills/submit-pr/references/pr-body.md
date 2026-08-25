# PR body rules

## Gather context

```bash
DEFAULT=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')
git diff origin/$DEFAULT...HEAD --stat && git diff origin/$DEFAULT...HEAD
git log origin/$DEFAULT..HEAD --oneline
git branch --show-current   # usually carries the ticket key
```

Read context files only if the user passed them as arguments.

## Fill the template

| Section | Rule |
|---|---|
| Ticket | Key from branch/commits/argument, formatted as a link if the repo uses links |
| Summary | 2–4 bullets, ≤200 words. Lead with what and why. Call out reviewer hot spots. |
| Open Questions | Only if real questions exist; otherwise delete the section |
| Testing | Exactly what ran (commands, patch links, manual steps) or `Not run: <reason>`; ≤100 words |
| Performance | Only if performance-relevant; otherwise delete the section |
| Everything else | Leave untouched — reviewer checklists, "Carefully Review", merge boilerplate. Never tick boxes. |

Total editable content under ~400 words. Factual tone; no internal phase names ("Phase 5"), no acronyms a reviewer outside the team would not know.

## Hot spots worth a Summary bullet

External API calls (latency, error handling) · schema/migration changes · auth/permission changes · concurrency (locks, goroutines, channels) · caching and invalidation · config or feature-flag changes that need deploy coordination.

## Minimal body when no template exists

```markdown
## Ticket
<key or link>

## Summary
- <what changed>
- <why>
- <reviewer hot spots, if any>

## Testing
- <commands run, patch links | Not run: <reason>>
```
