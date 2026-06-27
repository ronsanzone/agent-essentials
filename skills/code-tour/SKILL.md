---
name: code-tour
description: Use when you need to deeply understand a PR, branch, or system/feature end-to-end. Triggers on "explain this PR", "walk me through", "how does X work", "tour of this change", "help me understand this system", "ramp me up on".
disable-model-invocation: true
---

# Code Tour

Deep end-to-end guided tour of a PR, branch, or system feature. Dispatches 5 parallel research agents to trace flows across the codebase, then compiles findings and delegates HTML rendering to the `html-report` skill — producing a self-contained document with SVG diagrams, syntax-highlighted code, and collapsible sections.

## Usage

```
/code-tour <PR-URL-or-number>          # Tour centered on a PR
/code-tour                             # Tour of current branch diff vs main
/code-tour <topic>                     # Tour of a system/feature (no diff)
```

## Scoping Principle

All research and output is scoped to the specific subsystem under review. Do NOT explain the broader application, build system, or unrelated subsystems. Assume the reader works in this codebase daily.

## Implementation

### Step 1: Parse Input & Determine Mode

Determine mode from arguments:
- **PR mode:** Argument is numeric or contains `github.com`
- **Branch mode:** No arguments and current branch is not main/master
- **Topic mode:** Free-text argument that isn't a PR reference

### Step 2: Gather Raw Material

**PR mode:**
```bash
gh pr view -R <owner/repo> <number>
gh pr diff -R <owner/repo> <number>
```

**Branch mode:**
```bash
git diff main...HEAD
git log main..HEAD --oneline
```

**Topic mode:** The argument text is the scope description. No diff to fetch.

### Step 3: Analyze Scope

Read the diff or topic description and identify:
- Key files and packages touched or relevant
- The subsystem name (used to scope all research agents)
- The central abstraction or entry point
- **Reader profile** — pick one; it drives dimension selection (Step 4), section template (Step 5), and styling brief (Step 6):
  - **Ramp-up tour** — engineer new to the subsystem, will edit code soon. Needs the Lifecycle/Workflow section, dense file:line citation, execution-order walkthrough.
  - **PR review tour** — engineer who knows the subsystem, reviewing a specific change. Skip Lifecycle; focus on what the diff does. Dense file:line citation.
  - **Showcase tour** — external stakeholder, eng leadership, or cross-team reader. Reads once, won't edit. Lower citation density, thematic (not execution-order) sections, outcomes-forward, project-name masthead. No build/install commands.

If the user supplied **scope exclusions** ("leave out X", "don't cover Y", "skip GA-related work"), capture them verbatim — they get forwarded to every agent brief in Step 4.

### Step 4: Dispatch 5 Parallel Research Agents

Launch 5 agents in a single message. Default subagent type is `codebase-analyzer`; some dimensions (noted below) need `general-purpose` because they span docs/git/notes outside the codebase. Each agent gets:
- The diff or topic description for context
- The key files/packages from Step 3
- Any **scope exclusions** the user specified (Step 3) — pasted verbatim into the brief
- This instruction: "Scope your research to this subsystem. Do not explain the broader application. Include file:line citations on every claim. Report findings concisely."

**Pick 5 from the dimension menu below.** This is a menu, not a fixed list — match dimensions to what the tour needs. The first five are the runtime-flow defaults (good for ramp-up and PR review); the bottom four are showcase-friendly and worth promoting when the project has them.

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

### Step 5: Compile Tour

Wait for all 5 agents to complete, then compile findings. Pick a section template based on the reader profile from Step 3. Both templates build incrementally — each section should be understandable given only the sections before it.

#### Template A — Trace template (ramp-up and PR-review tours)

For readers who need to understand code flow well enough to edit. Execution-order, dense citations.

**1. What This System Does** — 1–2 paragraphs of plain English describing the specific subsystem, not the application. End with a short list of "things that make this different / worth tracing carefully" if the research surfaced any.

**2. The Big Picture** — Inline SVG showing the full end-to-end flow from trigger to effect. The "map" everything else refers back to.

**3. Lifecycle / Workflow** — *Required for ramp-up tours; optional for PR review tours.* Conceptual walkthrough across stages, with a stage-by-stage diagram. Make the **shared infrastructure vs. specialization split** explicit (e.g., "stages 1–4 are cloud-agnostic; 5–6 are where Alibaba code lives"). Short paragraph per stage saying what happens and which class owns it. End with a "why this matters when reading X code" anchor.

**4. Step-by-Step Tour** — Numbered collapsible sections walking through the flow in execution order. Each step:
- What happens and why (2–4 paragraphs max)
- Syntax-highlighted code snippets (10–30 lines, with `file:line` references)
- Additional SVG diagrams where they aid understanding
- Connection back to the big picture

After each conceptual section, end with a one-sentence anchor mapping the abstraction to where the reader will encounter it in concrete code.

#### Template B — Showcase template (stakeholder, leadership, cross-team tours)

For readers who won't edit the code. Thematic (not execution-order), outcomes-forward, lower citation density.

**1. Mission / What We Built** — Plain-English framing of the problem and the shape of the solution. Customer-facing pipeline or UX example if relevant. No file:line.

**2. The Big Picture** — Inline SVG, often a before/after comparison or a system-boundary diagram. Same role as Template A's §2.

**3. Context** — Just enough background for an outside reader to follow the rest. Framework primer, sandbox constraints, key constraints. Keep it tight.

**4. Road So Far** — Chronological narrative of how the project got here. Group by milestone (not by ticket). Each milestone: problem → decision → delivery → acceptance signal. Use collapsible chapters for each milestone if there are more than 4–5. *This is usually the centerpiece of a showcase tour.*

**5. Current State / Architecture** — How the system works today. SVG diagrams for the runtime pipeline. Code snippets are optional — include only when they make a point a diagram can't. File:line citation is light, used for navigation, not for proof.

**6. Outcomes** — Hard numbers from the Performance dimension, before/after tables, hypothesis ledger. Often the single most-quoted section after the tour ships.

**7. Where This Leaves Us** — What's done (checklist), what's next (V1 scope or similar). Explicitly close out anything the user excluded ("GA work is out of scope for this document").

In Template B, the "Step-by-Step Tour in execution order" is **downgraded to optional** — showcase readers want thematic sections, not a code walkthrough.

#### Supplementary sections (choose based on research findings)

Promote these three when the research surfaces material — they're frequently the highest-value additions to a tour, not just nice-to-haves:

- **What's Actively Being Built** — themed `git log --since="..."` summary grouped by feature area. Turns the tour into a current-state document, not just a static reference. Especially valuable for ramp-up tours.
- **What's Not Yet Wired / Gaps** — open TODOs, unsupported features, in-flight epics, embedded `// TODO(CLOUDP-...)` comments.
- **Sibling/Comparable Implementations Cheat-Sheet** — when the system is one of N parallel implementations (cloud providers, payment processors, auth flows), a side-by-side terminology + behavior table is high signal.

Other useful sections (include only when the research surfaces something interesting):
- **What The Change Adds/Modifies** — how the diff maps onto the system (PR/branch mode)
- **Key Design Decisions** — why the system works this way, not just how
- **The Data Model** — when persistence is complex enough to warrant its own section
- **Error Handling & Recovery** — when the system has interesting failure modes
- **Testing Strategy** — when the test approach is non-obvious

These are not a checklist. Use judgment — if research surfaced something that doesn't fit these categories, add a section for it.

### Step 6: Render via `html-report`

Invoke the `html-report` skill with:

- **content** — the compiled outline from Step 5
- **audience** — mapped from the Step 3 reader profile:
  - "Ramp-up tour" → `engineer-internal-ramp-up`
  - "PR review tour" → `engineer-internal-pr-review`
  - "Showcase tour" → `stakeholder-external`
- **design-language** — `editorial-parchment` (default; promote others as they ship per `design-languages/README.md`)
- **hero** — title, lede (one italic-serif sentence for showcase tours; omit for engineer tours unless the diff has a clear thesis), eyebrow (project/subsystem name), meta pills (compiled date, branch or PR ref, reading time estimate, scope)
- **output-path** — `~/notes/04_Research/<slug>-tour.html`

Derive the slug from:

- PR mode: ticket ID or PR title (e.g., `CLOUDP-398944-alibaba-capacity-denylist`)
- Branch mode: branch name (e.g., `feature-lcm-update-api`)
- Topic mode: slugified topic (e.g., `capacity-denylist-system`)

`html-report` returns the absolute path to the rendered HTML. Print it and run `open <absolute-path>`. **If `open` fails** (worktree cleanup, sandbox, headless host), just leave the path printed — the user can open it manually. Do not retry.


### Step 7: Iteration is Expected

Tours typically need a second pass — the user may request content additions (e.g. a new high-level section), aesthetic adjustments, or a section reordering. Treat this as a normal part of the flow, not a failure mode.

### Editing tips

- **Renumbering sections:** edit in **reverse order** (last → first) so each search string stays unique mid-edit. Otherwise the first rename collides with later occurrences.
- **Adding a section in the middle:** insert the new section first, then renumber everything after it in reverse order (per above).
- **Swapping diagrams:** SVGs are large; use Edit, not Write, and target the `<svg>...</svg>` block as one unit.
- **Reader-profile pivot mid-iteration:** if the user redirects from engineer to stakeholder framing (or vice versa) after the first pass, that usually means switching templates from Step 5 — don't try to patch one into the other section by section.
