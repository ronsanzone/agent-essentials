# PR body rules

## Gather context

```bash
# $UP / $DEFAULT resolved per ship SKILL.md Hard stops (origin is a fork in some repos)
git diff "$UP/$DEFAULT"...HEAD --stat && git diff "$UP/$DEFAULT"...HEAD
git log "$UP/$DEFAULT"..HEAD --oneline
git branch --show-current   # usually carries the ticket key
```

Read context files only if the user passed them as arguments.

## Fill the template

| Section | Rule |
|---|---|
| Ticket | Key from branch/commits/argument, formatted as a link if the repo uses links |
| Summary | 2–4 bullets, ≤200 words. Lead with what and why. Call out reviewer hot spots. |
| Change outline | Visual, not prose — see below. Goes right after Summary; if the template has no slot, add a `## Change outline` heading there |
| Open Questions | Only if real questions exist; otherwise delete the section |
| Testing | Exactly what ran (commands, patch links, manual steps) or `Not run: <reason>`; ≤100 words |
| Performance | Only if performance-relevant; otherwise delete the section |
| Everything else | Leave untouched — reviewer checklists, "Carefully Review", merge boilerplate. Never tick boxes. |

Total editable prose under ~400 words (outline code blocks excluded). Factual tone; no internal phase names ("Phase 5"), no acronyms a reviewer outside the team would not know.

## Evidence attachments

When a change was verified in a UI, attach the screenshots/video rather than describing them — see Attachments below. Put them under Testing, one line of caption each, and never leave the body pointing at a local path the reviewer cannot open.

## Change outline

The reviewer's map of the implementation, drawn with the `show-me` conventions (`../../show-me/SKILL.md`). Pick the smallest set of views that explains the change; skip any that did not change. Order them so the story reads easily — often contract or data shape first, then behavior, then files.

| View | Use when |
|---|---|
| Schema / API contract | Collections, fields, endpoint request/response changed |
| Key types | A new or changed data structure carries the design |
| Pseudocode | Business logic or a control-flow decision changed |
| Call tree | Who calls what changed (new hop, moved responsibility) |
| Shallow file tree | Responsibilities moved or new modules appeared |

- One short sentence above each block saying what it shows.
- `diff` blocks for changes to an existing shape; the full block when it is mostly new or a diff would hide order or ownership.
- Keep only the calls, fields, and files a reviewer needs. Not a file-by-file changelog.
- Mermaid only if the host renders it (GitHub does); no HTML artifacts.

Example:

````markdown
## Change outline

Retries move from the caller into the client.

```diff
 syncPolicy
-  retry(3)
-    client.put
+  client.put
+    retryWithBackoff
```
````

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

## Change outline
<one sentence + diff/tree/pseudocode block per changed shape>

## Testing
- <commands run, patch links | Not run: <reason>>
```

## Attachments (screenshots, video)

`gh pr create/edit --attach <file>#<alt text>` uploads the file and returns a `github.com/user-attachments/...` URL scoped to repo access. It takes up to 50 files.

- **Most reliable path:** `--attach` the files, read the returned URLs with `gh pr view <n> --json body`, inline them as `![alt](url)`, and re-apply with `gh pr edit <n> --body-file`. gh's own reference rewriting matches path strings exactly and leaves dangling refs on any mismatch.
- **Video is a bare URL** on its own line, which GitHub renders as a player. Wrapping it in `![alt](url)` renders broken.
- **Verify:** `gh pr view <n> --json body` shows no leftover local paths, and the asset URLs return 200.
