# Deep Work Pipeline — Phase Configuration

## Gate Mode Matrix

Each mode automates a strictly larger prefix of phases. The gate name indicates where automation **stops** — everything after is human-gated.

Modes form a progression: `full` < `research-gate` < `design-gate` < `auto`.

| Phase | Skill | Artifact | Model | Interaction | full | research-gate | design-gate | auto |
|-------|-------|----------|-------|-------------|------|---------------|-------------|------|
| 1 | dw-01-research-questions | 00-ticket.md, 01-research-questions.md | opus | none | human | auto | auto | auto |
| 2 | dw-02-research | 02-research.md | opus | none | human | human | auto | auto |
| 3 | dw-03-design-discussion | 03-design-discussion.md | opus | batch-qa | human | human | human | accept-recs |
| 4 | dw-04-outline | 04-structure-outline.md | opus | none | human | human | human | auto |
| 5 | dw-05-plan | 05-plan.md | opus | none | human | human | human | auto |
| 6 | dw-06-implement | 06-completion.md | opus | none | human | human | human | human |

## Gate Types

- **human** — Present artifact summary + path to user. Offer: Approve / Revise / Take over / Abort.
- **auto** — Check `.state.json` updated after teammate completes. Advance immediately. Stop on `STATUS: error`.
- **accept-recs** — Send "Accept all recommendations" to Phase 3 teammate for design question resolution, then auto-advance.

## Mode Descriptions

| Mode | Automates | Human from | Use case |
|------|-----------|------------|----------|
| `full` | Nothing | Phase 1 | Unfamiliar codebase, high-stakes. Review everything. |
| `research-gate` | Phase 1 | Phase 2 | Trust question generation. Review research, then manual through design/outline/plan/implementation. |
| `design-gate` | Phases 1-2 | Phase 3 | Trust research. Review design decisions, then manual through outline/plan/implementation. |
| `auto` | Phases 1-5 | Phase 6 | Re-runs, well-understood features. Auto-advance everything except implementation. |

## Artifact Dependencies

| Phase | Reads | Writes |
|-------|-------|--------|
| 1 | — | 00-ticket.md, 01-research-questions.md |
| 2 | 01-research-questions.md (questions section only) | 02-research.md |
| 3 | 00-ticket.md, 02-research.md | 03-design-discussion.md |
| 4 | 00-ticket.md, 02-research.md, 03-design-discussion.md | 04-structure-outline.md |
| 5 | all prior artifacts | 05-plan.md |
| 6 | 05-plan.md | 06-completion.md |

## Firewall Constraint (Phase 2)

Phase 2 MUST NOT receive the original prompt or read 00-ticket.md.
The Phase 2 skill handles extraction internally via `extract-research-questions.sh` —
the pipeline orchestrator does not need to embed questions in the teammate prompt.
This ensures research objectivity before the prompt re-enters in Phase 3.
