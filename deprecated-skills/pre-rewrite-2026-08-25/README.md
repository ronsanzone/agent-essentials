# pre-rewrite-2026-08-25

Installed copies replaced on 2026-08-25 when the portfolio-review branch rewrote these skills and switched the
store to symlinks. Kept for diffing against the rewrites; superseded by `skills/<name>` (and `config/claude/agents/`
for the four agent files, which were byte-copies of workflows-v2's Claude variants).

Not installable: `install-claude.sh --prune` only matches top-level `deprecated-skills/<name>` against the store, so
nothing in this folder collides with a live skill.
