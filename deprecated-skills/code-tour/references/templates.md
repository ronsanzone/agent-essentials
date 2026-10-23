# Section templates

Both build incrementally: each section must be understandable given only the sections before it.

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
