---
name: vendor-skills-repo
description: Vendor skills from a GitHub repository into this repo. Use when asked to import, vendor, list, add, or update skills from another skills repository while preserving provenance and detecting local edits.
disable-model-invocation: true
---

# Vendor Skills Repo

Vendor one or more skills from a GitHub repository into this repository for safe, reproducible installation.

This skill copies selected skill directories into this repo's `skills/` directory and maintains `vendor-skills.lock.json` at the repo root with source repo, source commit, source path, and content hashes. It also supports updates by comparing the locked upstream content, current upstream content, and local vendored content to detect local edits that require a merge decision.

## Usage

```text
/vendor-skills-repo <github-url> [ref]
/vendor-skills-repo update [all|<skill-name>]
/vendor-skills-repo list
```

Examples:

```text
/vendor-skills-repo https://github.com/example/agent-skills
/vendor-skills-repo https://github.com/example/agent-skills main
/vendor-skills-repo update all
/vendor-skills-repo update create-prd
/vendor-skills-repo list
```

## Repository paths

- Vendored third-party skills live in: `skills/<skill-name>/`
- Lock file lives at repo root: `vendor-skills.lock.json`
- Temporary clones go under: `/tmp/vendor-skills-repo.<timestamp>.<pid>/`

Never install vendored skills into global locations from this skill. This skill is repository-local only.

## Lock file format

Maintain this JSON file exactly enough to be machine-readable and stable in diffs:

```json
{
  "version": 1,
  "skills": {
    "skill-name": {
      "sourceRepo": "https://github.com/owner/repo.git",
      "sourceRef": "main",
      "sourceCommit": "abcdef1234567890",
      "sourcePath": "skills/skill-name",
      "vendoredPath": "skills/skill-name",
      "contentSha256": "sha256-of-current-vendored-skill-directory",
      "upstreamContentSha256": "sha256-of-source-directory-at-sourceCommit",
      "vendoredAt": "2026-07-05T00:00:00Z",
      "updatedAt": "2026-07-05T00:00:00Z"
    }
  }
}
```

`contentSha256` is the hash of the current vendored directory at the time the lock was written. `upstreamContentSha256` is the hash of the copied source directory at `sourceCommit`. They are normally identical immediately after a clean vendor/update.

## Deterministic helper script

Prefer the checked-in helper for deterministic operations:

```bash
./.agent/skills/vendor-skills-repo/vendor-skills.py discover <cloned-repo>
./.agent/skills/vendor-skills-repo/vendor-skills.py hash-dir <skill-dir>
./.agent/skills/vendor-skills-repo/vendor-skills.py normalize-lock vendor-skills.lock.json
```

The helper is vendored with this skill so the skill remains self-contained. It intentionally does not clone remotes, choose skills, or overwrite files. It only provides deterministic primitives for discovery, content hashing, and lock-file formatting.

## Directory content hash

Use `.agent/skills/vendor-skills-repo/vendor-skills.py hash-dir <dir>` for content hashing. It recursively hashes file paths and file contents in sorted order while ignoring `.DS_Store`.

## Skill discovery

After cloning the source repo, discover skills by finding files named `SKILL.md` or `skill.md`. A skill directory is the parent directory of one of those files.

For each discovered skill:

1. Read frontmatter if present.
2. Determine name:
   - Prefer `name:` from frontmatter.
   - Otherwise use the directory basename.
3. Determine description:
   - Prefer `description:` from frontmatter.
   - Otherwise use the first non-empty markdown paragraph after frontmatter, truncated to one line.
4. Record source path relative to repo root.

Ignore nested skill candidates inside an already discovered skill directory unless the user explicitly asks to include nested skills.

## Import flow

1. Parse `<github-url>` and optional `[ref]`. Default ref is the remote default branch.
2. Clone source into a temp directory:
   ```bash
   git clone --filter=blob:none <github-url> "$tmp/repo"
   cd "$tmp/repo"
   git checkout <ref>   # only if ref provided
   git rev-parse HEAD
   ```
3. Discover skills using the rules above. Prefer:
   ```bash
   .agent/skills/vendor-skills-repo/vendor-skills.py discover "$tmp/repo"
   ```
4. Present a numbered list to the user with:
   - skill name
   - brief description
   - source path
   - destination path under `skills/<skill-name>/`
   - whether destination already exists
5. Ask which skills to vendor. Accept comma-separated numbers, names, ranges, or `all`.
6. For each selected skill:
   - If `skills/<skill-name>/` already exists and is not tracked in the lock file, stop and ask before overwriting.
   - If it exists and is tracked, run the update flow for that skill instead of blindly replacing it.
   - Copy the entire source skill directory to `skills/<skill-name>/`.
   - Preserve all files under the skill directory.
7. Create/update `vendor-skills.lock.json` and normalize it:
   ```bash
   .agent/skills/vendor-skills-repo/vendor-skills.py normalize-lock vendor-skills.lock.json
   ```
8. Show a concise summary of added/updated/skipped skills and lock file changes.

## Update flow

Use this flow for `/vendor-skills-repo update [all|<skill-name>]`.

For each locked skill:

1. Clone/fetch `sourceRepo` at `sourceRef` or the remote default branch if `sourceRef` is empty.
2. Resolve latest `newCommit`.
3. Compute:
   - `lockedUpstreamHash` = lock `upstreamContentSha256`
   - `lockedVendoredHash` = lock `contentSha256`
   - `localHash` = hash of current `skills/<skill-name>/`
   - `newUpstreamHash` = hash of source skill directory at `newCommit`
4. Classify:
   - **No upstream change:** `newUpstreamHash == lockedUpstreamHash`
   - **Clean update:** `localHash == lockedVendoredHash` and `newUpstreamHash != lockedUpstreamHash`
   - **Local-only edit:** `localHash != lockedVendoredHash` and `newUpstreamHash == lockedUpstreamHash`
   - **Merge conflict:** `localHash != lockedVendoredHash` and `newUpstreamHash != lockedUpstreamHash`
5. Actions:
   - No upstream change: leave files as-is; update lock `contentSha256` only if local edit should be acknowledged and the user confirms.
   - Clean update: replace vendored directory with upstream, update lock commit and hashes.
   - Local-only edit: report local modifications and ask whether to keep them as intentional local changes by updating `contentSha256`, or revert to locked upstream.
   - Merge conflict: do not overwrite. Present a summary and ask user to choose one:
     1. keep local version
     2. take upstream version
     3. create a manual merge workspace under `/tmp/vendor-skills-merge/<skill-name>/` with `base/`, `local/`, and `upstream/`

## Merge conflict details

A merge conflict means both local vendored content and upstream content changed since the lock was last written. This is content-hash based, not Git-conflict based.

When reporting a conflict, include:

- skill name
- source repo and path
- old commit and new commit
- local path
- locked upstream hash
- local hash
- new upstream hash
- short file-level diff summary if practical:
  ```bash
  diff -qr <local-dir> <new-upstream-dir>
  ```

Do not discard local edits without explicit user confirmation.

## Implementation notes

- Prefer `.agent/skills/vendor-skills-repo/vendor-skills.py` for deterministic discovery, hashing, and lock normalization.
- Use `python3` for JSON lock file reads/writes when additional custom edits are needed.
- Create parent directories with `mkdir -p skills`.
- Use `rsync -a --delete --exclude='.DS_Store' <src>/ <dest>/` for clean copies after confirmation.
- Keep lock file keys sorted for readable diffs.
- If a selected skill name would collide with an existing vendored skill from another repo/path, ask the user for a destination name override.
- After any successful import or update, run `git status --short skills vendor-skills.lock.json` and show the result.

## Safety rules

- Never run install scripts from the source repo.
- Never copy files outside the selected skill directory.
- Never mutate global skill directories.
- Never overwrite an untracked existing destination without asking.
- Never auto-resolve merge conflicts.
- Always record the exact source commit and content hashes in the lock file.
