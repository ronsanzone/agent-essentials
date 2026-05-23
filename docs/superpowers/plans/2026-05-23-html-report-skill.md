# `html-report` Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new `html-report` skill that owns the HTML rendering phase for technical reports (structural shell + visual design language), wire `code-tour` to delegate to it, and ship the first design language (`editorial-parchment`).

**Architecture:** Two-axis split between language-agnostic structure (`references/`) and per-language steering briefs (`design-languages/`). Skill dispatches a fresh `general-purpose` subagent that reads all four reference files plus the chosen language's exemplar HTML, then writes a single self-contained HTML file in one pass. Brand-guidelines philosophy: lock fonts/anchor-palette/anti-patterns, leave composition free.

**Tech Stack:** Markdown skill files (no code), single-file HTML output (inline CSS/SVG, Google Fonts CDN). Verification is end-to-end via running `code-tour` on a real input and inspecting the produced HTML.

**Spec:** [`docs/superpowers/specs/2026-05-23-html-report-skill-design.md`](../specs/2026-05-23-html-report-skill-design.md)

---

## File Structure

**To create:**

```
~/.claude/skills/html-report/
├── SKILL.md                         # ~80-120 lines. Skill identity + process.
├── references/
│   ├── structural-shell.md          # ~150 lines. Canonical TOC/scroll-spy/progress-bar HTML+JS.
│   ├── content-components.md        # ~200 lines. Generic HTML for hero/section/card/etc.
│   └── diagram-kit.md               # ~180 lines. SVG patterns + role taxonomy.
└── design-languages/
    ├── README.md                    # ~40 lines. Index + selection guide.
    └── editorial-parchment.md       # ~250 lines. Locked stack + anchor palette + diagram role map.
```

**To modify:**

- `~/.claude/skills/code-tour/SKILL.md` — replace Step 6 (lines 142–173, the prose brief block) with a thin delegation to `html-report`. Remove the `frontend-design` reference.

**Test artifact (not committed):**

- Run `code-tour` on a representative target after the wiring is done. Inspect the produced HTML in a browser. The smoke-test target is selected in Task 9.

Each file in `references/` and `design-languages/` is self-contained and read independently by the rendering subagent. Splitting by responsibility (structural vs. visual, plumbing vs. components vs. diagrams) keeps each file focused and easy to update without ripple effects.

---

## Task 1: Create the skill directory and stub SKILL.md

**Files:**
- Create: `~/.claude/skills/html-report/SKILL.md`

- [ ] **Step 1: Create the directory structure**

```bash
mkdir -p ~/.claude/skills/html-report/references
mkdir -p ~/.claude/skills/html-report/design-languages
```

- [ ] **Step 2: Write the stub SKILL.md**

Write `~/.claude/skills/html-report/SKILL.md` with frontmatter and a placeholder body. The full process content lands in Task 7 once references are written and we know exactly what to point at.

```markdown
---
name: html-report
description: Use when a caller has compiled content (sections, prose, code, diagrams) and needs to render it as a self-contained HTML technical report. Owns structural UX (TOC, scroll-spy, progress bar, marginalia, collapsible sections, SVG diagram cards) and visual design languages. Used by code-tour; intended for future report-producing skills.
---

# html-report

Render a self-contained HTML report from compiled content, applying a curated design language. Brand-guidelines philosophy: locked font stack and anchor palette per language; free composition within.

## Usage

Invoked by a calling skill (e.g. `code-tour`) with:

- **content** — compiled outline (sections, prose, code with `file:line` citations, tables, callouts, diagram briefs)
- **audience** — one of: `engineer-internal-ramp-up`, `engineer-internal-pr-review`, `stakeholder-external`
- **design-language** — identifier matching a file in `design-languages/` (e.g. `editorial-parchment`)
- **hero** — title, lede, eyebrow text, meta pills
- **output-path** — absolute path for the resulting HTML file

## Process

(See Task 7 — finalized after references are written.)
```

- [ ] **Step 3: Verify the directory structure**

```bash
ls -la ~/.claude/skills/html-report/
```

Expected output includes `SKILL.md`, `references/` (empty), `design-languages/` (empty).

- [ ] **Step 4: Commit**

```bash
cd ~/code/claude-essentials
# These files live in ~/.claude which IS this repo
git add skills/html-report/SKILL.md
git commit -m "feat(html-report): scaffold skill directory and stub SKILL.md"
```

Note: `~/.claude` is the `claude-essentials` repo (confirmed in project memory). The relative path inside the repo is `skills/html-report/`.

---

## Task 2: Write `references/structural-shell.md` (canonical plumbing)

**Files:**
- Create: `~/.claude/skills/html-report/references/structural-shell.md`

The structural shell is **locked plumbing**: scroll-spy JS, sticky-TOC HTML pattern, progress-bar wiring, skip-link, marginalia gutter pattern, document `<head>` boilerplate. CSS that *paints* these elements belongs to the design-language file.

- [ ] **Step 1: Extract canonical patterns from the two `editorial-parchment` exemplars**

Read both exemplar files to extract the shared structural patterns. Use Read with explicit byte ranges to keep context tight.

```bash
# Files to reference (do not edit):
# ~/notes/04_Research/atlas-on-alibaba-cloud-tour.html  (lines 1-250 head/CSS, lines 1700+ scroll-spy JS)
# ~/notes/04_Research/admin-backup-snapshots-overview.html  (one-line minified, line 69 has the JS)
```

- [ ] **Step 2: Write `structural-shell.md`**

Contents (in this order):

1. **Purpose statement** — 3-4 sentences. "This file is canon, not steering. Every report uses the same plumbing. CSS painting belongs to the design-language file."

2. **Document head boilerplate** — the exact `<head>` block: charset, viewport, title slot, font preconnect, Google Fonts link slot (filled by the language), `<style>` opening.

3. **Layout grid** — default 2-column (TOC + main), with the CSS variable seam (`--grid-template`) that languages can override. Show the media-query single-column collapse. Roughly 30 lines of CSS.

4. **Sticky TOC HTML pattern** — `<aside class="toc">` containing a heading and `<ol>` of anchored links. Note the `data-section` attribute on each link that scroll-spy reads.

5. **Reading-progress bar** — fixed `<div class="progress"></div>` at top. CSS uses `--scroll` custom property updated by JS.

6. **Marginalia gutter pattern** — `.section { position: relative; }` plus `.num { position: absolute; left: -64px; ... }`. Note that the number's color/font come from the language.

7. **Skip-link** — `<a class="skip-link" href="#main">Skip to content</a>` with visually-hidden-until-focused CSS.

8. **Scroll-spy JS** — copy-paste exactly. Vanilla, no dependencies. Updates `--scroll` for the progress bar AND toggles `.active` on TOC links as sections cross the viewport midline. Roughly 25 lines.

```javascript
const root = document.documentElement;
const tocLinks = document.querySelectorAll('aside.toc a[href^="#"]');
const sections = Array.from(tocLinks).map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);

function updateProgress() {
  const h = document.body.scrollHeight - innerHeight;
  root.style.setProperty('--scroll', h > 0 ? (scrollY / h * 100) + '%' : '0%');
}

function updateActive() {
  const mid = scrollY + innerHeight / 2;
  let current = sections[0];
  for (const s of sections) {
    if (s.offsetTop <= mid) current = s;
  }
  tocLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + current.id));
}

addEventListener('scroll', () => { updateProgress(); updateActive(); }, { passive: true });
updateProgress(); updateActive();
```

9. **What the rendering subagent must NOT vary** — explicit list: scroll-spy JS verbatim, sticky-TOC HTML structure, skip-link presence, progress bar wiring, marginalia gutter geometry (`left: -64px` is fine to tune per language but the absolute-positioning pattern is locked).

10. **What the rendering subagent IS free to vary** — TOC link styling (color, hover, active indicator), progress bar color/height, marginalia number font/color/format.

- [ ] **Step 3: Verify file size and content**

```bash
wc -l ~/.claude/skills/html-report/references/structural-shell.md
```

Expected: roughly 140–180 lines. If <100, content is thin. If >250, prune.

- [ ] **Step 4: Commit**

```bash
cd ~/code/claude-essentials
git add skills/html-report/references/structural-shell.md
git commit -m "feat(html-report): canonical structural shell (TOC, scroll-spy, progress bar, marginalia)"
```

---

## Task 3: Write `references/content-components.md` (generic HTML structure)

**Files:**
- Create: `~/.claude/skills/html-report/references/content-components.md`

Generic HTML structure for each report component. Language-agnostic — no colors, no specific fonts. The language file fills the CSS.

- [ ] **Step 1: Write `content-components.md`**

For each component, show: (a) the HTML structure, (b) the slots and what fills them, (c) CSS class names the language is expected to style, (d) when to use it.

Components covered:

1. **Hero** — `<header class="hero">` wrapping `.hero-inner` with `.eyebrow` (mono caps, optional dot accent), `<h1 class="title">` (with optional `<em>` for italic phrase), `<p class="lede">`, `.meta-row` with mono key/value pairs.

2. **Section** — `<section id="..." class="section">` with `<span class="num">01</span>` (marginalia), `<h2>`, body content.

3. **Card** — `<div class="card">` with optional `mini` variant (smaller, used in `.grid` layouts).

4. **Callout** — `<div class="callout">` for default; `.callout.warn` and `.callout.success` variants. Inside: `<strong>Label:</strong>` prefix is a common pattern.

5. **Pull quote** — `<div class="quote">` containing a single sentence. Large serif. One per section max.

6. **Details block** — `<details>` `<summary>` `<p>` pattern. Used for step-by-step tours and FAQ-style content. The first one in a section often has `open` attribute.

7. **Table** — `<table>` with `<thead>` and `<tbody>`. Tight technical-doc styling. Mono headers in caps.

8. **Code block** — `<pre>` containing manually span-classified content. Span class names: `kw` (keyword), `str` (string), `com` (comment), `num` (number), `fn` (function), `type` (type). The language file colors them.

9. **Inline code** — `<code>` inside prose. Background wash. The language colors it.

10. **Ticket/identifier pill** — `<span class="pill">SAN-15</span>`. Mono font, rounded border, colored chip. Used for ticket IDs and other identifiers.

11. **Diagram card** — `<figure class="card diagram">` wrapping inline `<svg>` plus `<figcaption class="caption">` (italic serif). See `diagram-kit.md` for the SVG patterns.

12. **Grid** — `<div class="grid">` wrapping 2-up `.card.mini` blocks. Used for "X vs Y" or "four things you can do" layouts.

For each component, include a short "when to use" note. Example:

```markdown
### Pull quote

Use for the 1-2 stickiest insights in the whole report. One per section maximum.
Often used near the end of a section to leave the reader with a takeaway.

\`\`\`html
<div class="quote">Admin backup snapshots are emergency operator safety nets: capture this host's cloud disk now, keep it briefly, and make sure cleanup is tracked.</div>
\`\`\`

The language file colors the quote text, sets the font (typically large serif italic),
and chooses whether to set it off with a rule or border.
```

- [ ] **Step 2: Verify file size and content**

```bash
wc -l ~/.claude/skills/html-report/references/content-components.md
```

Expected: roughly 180–230 lines.

- [ ] **Step 3: Commit**

```bash
cd ~/code/claude-essentials
git add skills/html-report/references/content-components.md
git commit -m "feat(html-report): generic content component HTML structure"
```

---

## Task 4: Write `references/diagram-kit.md` (SVG patterns + role taxonomy)

**Files:**
- Create: `~/.claude/skills/html-report/references/diagram-kit.md`

Generic SVG patterns plus the **role taxonomy** that languages map to colors.

- [ ] **Step 1: Write `diagram-kit.md`**

Sections:

1. **Purpose** — "This file owns *which* diagrams (the types) and *which slots* (the role taxonomy). The language file maps slots to colors."

2. **Role taxonomy** — six roles, each with a 1-line semantic intent. Languages fill these slots with palette positions.

| Role | Intent |
|------|--------|
| `default` | Neutral box. The workhorse — most nodes are default. |
| `hot` | Active / current focus / hot path / state being traced. |
| `store` | Persistence / data at rest / cache / DB. |
| `external` | Third-party API, cross-system boundary, vendor SDK. |
| `warn` | Caution / failure path / not-yet-supported. |
| `future` | Planned work / not yet wired / dashed outline. |

3. **Diagram types** — for each type, show the SVG skeleton with `class` attributes from the role taxonomy. The language colors the classes.

   Types covered:

   a. **Linear flow** — left-to-right boxes with arrows. Used for happy-path traces. Show 4-node example.

   b. **Swim-lane** — horizontal lanes for separate actors/layers (e.g. "cloud-agnostic" vs "provider-specific"). Show 2-lane example.

   c. **Before/after comparison** — two side-by-side flows. Used for refactors and migrations.

   d. **Sequence diagram** — vertical actor lifelines + horizontal messages. Used for request/response flows.

   e. **State machine** — boxes (states) + arrows (transitions). Used for lifecycle docs.

   f. **Hypothesis ledger** — table-as-diagram for outcomes/perf reports. Each row: hypothesis, predicted, actual, signal.

4. **Arrow markers** — `<defs><marker>` patterns. Default arrow, optional thick arrow for emphasis. Color comes from the language via `currentColor` or class.

5. **SVG `<style>` block pattern** — inside every `<svg>`, an inline `<style>` block sets typography. The language specifies the exact font-family and sizes. Show the template:

```svg
<svg viewBox="0 0 900 350" xmlns="http://www.w3.org/2000/svg">
  <style>
    .txt   { font: 14px var(--sans-or-serif); fill: var(--ink); }
    .small { font: 12px var(--sans-or-serif); fill: var(--ink-soft); }
    /* Role classes — colors filled by language */
    .default { fill: ...; stroke: ...; }
    .hot     { fill: ...; stroke: ...; }
    .store   { fill: ...; stroke: ...; }
    .external { fill: ...; stroke: ...; }
    .warn    { fill: ...; stroke: ...; }
    .future  { fill: ...; stroke: ...; stroke-dasharray: 4 3; }
  </style>
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z"/>
    </marker>
  </defs>
  <!-- nodes and arrows -->
</svg>
```

6. **Caption pattern** — `<figcaption class="caption">` styled by the language (italic serif is the default register).

7. **Composition guidance** — short paragraph: "Compose diagrams that reinforce the prose. Don't add diagrams for decoration. A single well-placed swim-lane is worth more than five linear flows."

- [ ] **Step 2: Verify file size and content**

```bash
wc -l ~/.claude/skills/html-report/references/diagram-kit.md
```

Expected: roughly 150–200 lines.

- [ ] **Step 3: Commit**

```bash
cd ~/code/claude-essentials
git add skills/html-report/references/diagram-kit.md
git commit -m "feat(html-report): diagram kit with role taxonomy and SVG patterns"
```

---

## Task 5: Write `design-languages/editorial-parchment.md`

**Files:**
- Create: `~/.claude/skills/html-report/design-languages/editorial-parchment.md`

The first design language. Built from the two existing reports. **Steering brief**, not a template. Locks the brand stack and anchor palette; leaves composition free.

- [ ] **Step 1: Write `editorial-parchment.md`**

Sections (in this order):

1. **Personality + when to pick**

   ```markdown
   ## Personality

   Editorial Parchment feels like a long-form New York Review of Books essay set
   with a tasteful technical accent. Warm parchment paper, distinctive serif
   display, clean sans body, characterful mono for code and marginalia. Teal as
   primary accent (links, italic-em in titles, active TOC); terracotta as
   secondary (eyebrow dot, marginalia number, ticket pills).

   ## Pick this when

   - Dense ramp-up tours that engineers will read for 20+ minutes.
   - Operator reference docs that get re-read across incidents.
   - PR review tours with file:line citation density.
   - Any technical document where the reader will sit and read sequentially.

   ## Don't pick this when

   - The report is outcomes-forward and feels more like a field report or
     postmortem (use a future `field-report` language instead).
   - The report is short (under ~5 minutes reading time) and would feel
     overdressed in this register.
   ```

2. **Locked brand stack** — exact Google Fonts URL, exact font stack with fallbacks for `--serif`, `--sans`, `--mono`. Body font: Geist sans. Voice rules.

   ```markdown
   ## Locked brand stack

   **Google Fonts URL** (use exactly this):

   \`\`\`html
   <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,400&family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
   \`\`\`

   **Font stack:**

   \`\`\`css
   --serif: "Fraunces", "Iowan Old Style", "Charter", Georgia, serif;
   --sans:  "Geist", "Söhne", "Helvetica Neue", -apple-system, sans-serif;
   --mono:  "JetBrains Mono", "SF Mono", "IBM Plex Mono", Menlo, monospace;
   \`\`\`

   **Body font:** Geist sans (`var(--sans)`).
   **Display font:** Fraunces (`var(--serif)`). Use `opsz` variation: 144 for h1, 60 for h2, 32 for ledes.
   **Mono:** JetBrains Mono for code, eyebrows, marginalia, ticket pills, meta-row keys.

   **Voice rules:**

   - Italic serif for ledes, pull quotes, and the italic-em phrase inside h1 titles (`<h1>Title, <em>italic phrase</em></h1>`).
   - Mono caps with letter-spacing for eyebrows and meta-row labels.
   - Never bold body prose for emphasis; use italic instead.
   - Pull quotes are large (≥24px), serif, italicized, set off by a thin left rule or top/bottom rule.
   ```

3. **Anchor palette** — the 4-6 colors that MUST be used. Each with hex + semantic name + "use for."

   ```markdown
   ## Anchor palette

   These tokens are mandatory. Use them as the foundation.

   \`\`\`css
   :root {
     /* Surfaces — warm parchment */
     --bg:        #faf7f0;  /* body background */
     --bg-soft:   #f4efe2;  /* hero gradient, table headers */
     --bg-card:   #fdfcf8;  /* cards, callouts, code blocks */
     --bg-code:   #f1ece0;  /* code background */

     /* Ink */
     --ink:       #1c1a17;  /* body text */
     --ink-soft:  #4d4842;  /* lede, secondary text */
     --ink-faint: #8a8175;  /* meta-row, captions */
     --ink-ghost: #b4ac9e;  /* marginalia background, ghost numbers */

     /* Rules */
     --rule:        #d9d2c1;  /* borders */
     --rule-soft:   #e8e2d2;  /* hairline separators */

     /* Accents */
     --teal:           #0a5c4f;  /* primary: links, h1 italic-em, active TOC, primary diagram nodes */
     --teal-soft:      #dae5e0;  /* teal wash for callouts */
     --terracotta:     #a84e1a;  /* secondary: eyebrow dot, marginalia number, ticket pills */
     --terracotta-soft: #f3e3d2; /* terracotta wash */
   }
   \`\`\`

   ## Permitted additional accents

   Introduce one or two of these only if the content calls for them:

   - `--warn: #9a6300` + `--warn-soft: #f8ecd5` — for deprecation, failure path, "known gaps."
   - A success green from the same warm family if outcomes need positive signaling (suggest `#3a6634` + wash `#d8e3d3` — borrowed from the field-report language; honor the warmth).

   Do not add a third primary accent. The teal/terracotta duo is load-bearing for the language's identity.
   ```

4. **Anti-patterns**

   ```markdown
   ## Anti-patterns

   - No Inter, Roboto, Arial, or system-font defaults.
   - No purple gradients on white backgrounds.
   - No dark themes — this language is light-only.
   - No shadows heavier than `0 10px 30px rgba(60, 45, 20, 0.04)`. Heavier shadows kill the paper feel.
   - No full-bleed photographs. This is a typographic language.
   - No emoji in headings or callouts.
   - No bright/saturated accents outside the warm palette (no electric blue, no neon green).
   - Don't decorate empty space with patterns or gradients other than the subtle paper grain (radial-gradient at very low opacity).
   ```

5. **Patterns to draw from** — brief CSS sketches showing the flavor of each component. Not copy-paste blocks. The renderer writes its own CSS, but in the right register.

   Cover: hero, section header with marginalia, card, callout (default/warn/success), pull quote, code block, table, ticket pill, details block. Each ~5-10 lines of indicative CSS.

   Example for the pull quote:

   ```markdown
   ### Pull quote — in this language

   Large Fraunces serif (about 25px), teal color, set off by a thin left rule
   (1px `var(--rule)`) with generous left padding. Italic optional but
   characteristic.

   \`\`\`css
   .quote {
     font-family: var(--serif);
     font-size: 25px;
     line-height: 1.35;
     color: var(--teal);
     border-left: 1px solid var(--rule);
     padding-left: 24px;
     margin: 30px 0;
   }
   \`\`\`

   The renderer may vary the rule weight, color, or padding. Don't change
   the serif font, the teal color, or the larger-than-body size.
   ```

6. **Diagram philosophy** — fill in the role taxonomy with this language's palette positions.

   ```markdown
   ## Diagram philosophy

   Diagrams in this language are quiet and precise — not decorative. Boxes have
   thin borders, generous padding, and use the parchment surface. Arrows are
   teal. Text inside diagrams uses Geist sans (matching body).

   ### Role-to-palette map

   | Role | Fill | Stroke | Notes |
   |------|------|--------|-------|
   | default | `var(--bg-card)` | `var(--rule)` | 1.5px stroke, rounded corners (rx=14) |
   | hot | `var(--teal-soft)` | `var(--teal)` | Same geometry, teal accents |
   | store | `var(--bg-soft)` | `var(--rule-strong)` (#b9b09c) | Slightly heavier stroke |
   | external | `var(--terracotta-soft)` | `var(--terracotta)` | Terracotta family |
   | warn | `var(--warn-soft)` | `var(--warn)` | Only when warn palette is permitted |
   | future | `var(--bg)` | `var(--ink-ghost)`, dashed | `stroke-dasharray: 4 3` |

   ### SVG typography

   \`\`\`svg
   <style>
     .txt   { font: 14px "Geist", sans-serif; fill: var(--ink); }
     .small { font: 12px "Geist", sans-serif; fill: var(--ink-soft); }
   </style>
   \`\`\`

   ### Arrow color

   Default arrows: `var(--teal)`. Use thicker (2px) strokes for primary flow,
   1px for secondary references.

   ### Caption

   Italic Fraunces serif, `var(--ink-faint)`, 14px, centered under the
   diagram with `margin-top: 8px`.
   ```

7. **Exemplar reports**

   ```markdown
   ## Exemplar reports

   Read at least one of these before writing. They are evidence of the language,
   not templates to clone.

   - `~/notes/04_Research/atlas-on-alibaba-cloud-tour.html` — dense ramp-up tour
     with full set of components (hero, marginalia, cards, callouts, pull quotes,
     SVG diagrams in cards, ticket pills). The reference exemplar for "everything
     this language can do."

   - `~/notes/04_Research/admin-backup-snapshots-overview.html` — shorter operator
     reference. Demonstrates the same language at smaller scale. Useful when the
     report is mid-length.

   The two reports are visibly different in composition (one is ~1800 lines, the
   other is ~70 lines minified into one file) but instantly recognizable as the
   same language. That's the goal.
   ```

- [ ] **Step 2: Verify file size and content**

```bash
wc -l ~/.claude/skills/html-report/design-languages/editorial-parchment.md
```

Expected: roughly 230–280 lines.

- [ ] **Step 3: Commit**

```bash
cd ~/code/claude-essentials
git add skills/html-report/design-languages/editorial-parchment.md
git commit -m "feat(html-report): first design language — editorial-parchment"
```

---

## Task 6: Write `design-languages/README.md` (index + selector)

**Files:**
- Create: `~/.claude/skills/html-report/design-languages/README.md`

The picker guide. Lets `SKILL.md` (or a caller that didn't specify a language) pick one based on audience.

- [ ] **Step 1: Write `README.md`**

```markdown
# Design Languages

A design language is a steering brief that locks the brand stack (fonts, anchor
palette, anti-patterns) for a class of reports while leaving composition free.

## Available

| Language | When to pick | Status |
|----------|-------------|--------|
| `editorial-parchment` | Ramp-up tours, PR review tours, operator reference docs. Engineer-internal audience reading sequentially for 20+ minutes. | Shipped |
| `field-report` | Outcomes-forward reports, postmortems, journey narratives. Newsreader serif body, burnt-clay accent. | Planned |
| `library-doc` | Scholarly technical docs with Playfair Display + saddle-brown + fixed sidebar. | Planned |

## Selection heuristic

If the caller did not specify a language, pick based on audience:

| Audience signal | Default language |
|-----------------|------------------|
| `engineer-internal-ramp-up` | `editorial-parchment` |
| `engineer-internal-pr-review` | `editorial-parchment` |
| `stakeholder-external` | `editorial-parchment` (until `field-report` ships) |

## Adding a new language

1. Pick 1-2 exemplar reports that already feel like the language.
2. Write `design-languages/<name>.md` following the structure in
   `editorial-parchment.md`: personality + locked stack + anchor palette +
   anti-patterns + patterns to draw from + diagram philosophy + exemplars.
3. Add a row to the table above.
4. No changes needed in `SKILL.md` or `references/`.
```

- [ ] **Step 2: Commit**

```bash
cd ~/code/claude-essentials
git add skills/html-report/design-languages/README.md
git commit -m "feat(html-report): design language index and selection heuristic"
```

---

## Task 7: Finalize `SKILL.md` process

**Files:**
- Modify: `~/.claude/skills/html-report/SKILL.md`

Replace the placeholder process section with the full process now that all references exist.

- [ ] **Step 1: Read the current stub SKILL.md**

Just to confirm the frontmatter and header are intact. Don't change them.

- [ ] **Step 2: Replace the `## Process` section**

The full process block, replacing the "(See Task 7 ...)" placeholder:

```markdown
## Process

### Step 1: Validate inputs

Confirm the caller supplied:

- `content` — non-empty compiled outline
- `audience` — one of the three known values
- `design-language` — exists as a file in `design-languages/`
- `hero` — at minimum a title; lede/eyebrow/meta-row are optional
- `output-path` — absolute path, parent directory exists

If `design-language` is not supplied, fall back using the heuristic in
`design-languages/README.md`.

### Step 2: Load references

Read all of these in parallel (single message, multiple Read calls):

- `references/structural-shell.md`
- `references/content-components.md`
- `references/diagram-kit.md`
- `design-languages/<chosen>.md`

### Step 3: Absorb the exemplar

Read at least one of the exemplar reports listed in the chosen design language
file. The exemplar is evidence of the language, not a template — absorb the
composition, the rhythm, the level of detail, then close it and write fresh
HTML. Do not clone it.

### Step 4: Dispatch a fresh `general-purpose` subagent for rendering

The rendering work is composition (writing HTML/CSS/SVG informed by provided
references), not codebase analysis. Dispatch a fresh subagent so it commits
cleanly to the aesthetic without context bleed from the caller's research
phase.

The subagent prompt must include:

1. The chosen design language file (full content).
2. All three reference files (full content).
3. At least one exemplar's content (as a context reference — *not* as a file
   to clone).
4. The compiled content payload.
5. The audience and hero metadata.
6. The output path.
7. Explicit instructions:
   - Write one self-contained HTML file (all CSS/SVG inline, fonts via Google
     Fonts CDN, no external dependencies).
   - Honor every locked element in the design language (font stack, anchor
     palette, anti-patterns).
   - Compose freely within the language. Vary per report so two reports in
     the same language don't feel xeroxed.
   - Use the canonical scroll-spy JS and TOC HTML structure from
     `structural-shell.md` verbatim.
   - Apply the role-to-palette map from the design language file for all
     diagram nodes.
   - Return the absolute path on completion.

### Step 5: Return the output path

Print the absolute path to the rendered HTML. Do not invoke `open` — the
caller decides whether to.

## What this skill does NOT do

- Research, content compilation, dimension selection — the caller owns these.
- Open the resulting file in a browser — the caller decides.
- Iterate on the report after the first pass — the caller (or the user)
  drives iteration by re-invoking with adjusted content or a different
  language.
```

- [ ] **Step 3: Verify SKILL.md is complete**

```bash
wc -l ~/.claude/skills/html-report/SKILL.md
```

Expected: roughly 90–130 lines.

```bash
grep -c "TODO\|TBD\|placeholder\|See Task" ~/.claude/skills/html-report/SKILL.md
```

Expected: 0.

- [ ] **Step 4: Commit**

```bash
cd ~/code/claude-essentials
git add skills/html-report/SKILL.md
git commit -m "feat(html-report): finalize SKILL.md process"
```

---

## Task 8: Wire `code-tour` to delegate to `html-report`

**Files:**
- Modify: `~/.claude/skills/code-tour/SKILL.md` (lines 142–173, the Step 6 block)

Replace `code-tour`'s prose-brief Step 6 with a thin delegation. Remove the `frontend-design` reference.

- [ ] **Step 1: Read the current Step 6 block**

```bash
# Already confirmed during brainstorming: lines 142-173 of code-tour SKILL.md
# contain the Step 6 "Style and Write Output" prose brief.
```

Use Read on `~/.claude/skills/code-tour/SKILL.md` lines 142–173 to confirm the exact content before editing.

- [ ] **Step 2: Replace Step 6 with the delegation**

Use Edit to replace the entire Step 6 block. The old `old_string` is the section starting at `### Step 6: Style and Write Output` and ending right before `### Step 7: Iteration is Expected`.

New content:

```markdown
### Step 6: Render via `html-report`

Invoke the `html-report` skill with:

- **content** — the compiled outline from Step 5
- **audience** — mapped from the Step 3 reader profile:
  - "Ramp-up tour" → `engineer-internal-ramp-up`
  - "PR review tour" → `engineer-internal-pr-review`
  - "Showcase tour" → `stakeholder-external`
- **design-language** — `editorial-parchment` (default; promote others as they ship)
- **hero** — title, lede (one italic-serif sentence for showcase tours; omit for engineer tours unless the diff has a clear thesis), eyebrow (project/subsystem name), meta pills (compiled date, branch or PR ref, reading time estimate, scope)
- **output-path** — `~/notes/04_Research/<slug>-tour.html` (slug per the rules below)

Derive the slug from:

- PR mode: ticket ID or PR title (e.g., `CLOUDP-398944-alibaba-capacity-denylist`)
- Branch mode: branch name (e.g., `feature-lcm-update-api`)
- Topic mode: slugified topic (e.g., `capacity-denylist-system`)

`html-report` returns the absolute path. Print it and run `open <absolute-path>`.
**If `open` fails** (worktree cleanup, sandbox, headless host), leave the path
printed — the user can open it manually. Do not retry.
```

- [ ] **Step 3: Verify the edit**

```bash
grep -n "frontend-design" ~/.claude/skills/code-tour/SKILL.md
```

Expected: no matches. The `frontend-design` reference is gone.

```bash
grep -n "html-report" ~/.claude/skills/code-tour/SKILL.md
```

Expected: at least 2 matches (the section header and the invocation).

```bash
grep -n "^### Step" ~/.claude/skills/code-tour/SKILL.md
```

Expected: 7 step headers (Steps 1–7). The Step 6 rename is fine ("Render via `html-report`" instead of "Style and Write Output").

- [ ] **Step 4: Commit**

```bash
cd ~/code/claude-essentials
git add skills/code-tour/SKILL.md
git commit -m "refactor(code-tour): delegate HTML rendering to html-report skill"
```

---

## Task 9: End-to-end smoke test

The skill files are all markdown; correctness is verified by actually running `code-tour` and inspecting the output.

- [ ] **Step 1: Pick a smoke-test target**

Three options, in order of preference:

1. **Re-render an existing report's content** — pick `admin-backup-snapshots-overview.html` as the target (smaller, more constrained scope). Use its content as the input. Compare the new output to the existing file: they should be visibly the same language, visibly not byte-identical. This is the cleanest test.

2. **Run `code-tour` on a real PR/topic** — pick a small PR or a narrow topic. Higher cost (5 research agents) but tests the full integration.

3. **Synthetic test** — hand-write a small content payload and invoke `html-report` directly. Fastest but least realistic.

**Recommendation:** start with option 1 to isolate the html-report skill from code-tour's research pipeline. If that passes, do option 2 as the true integration test.

- [ ] **Step 2: Execute the chosen smoke-test**

For option 1:

Invoke `html-report` directly (in this conversation, as a manual test) with:

- content: the section list from `admin-backup-snapshots-overview.html` (12 sections, from "What admin backup snapshots are" through "Known gaps and follow-up")
- audience: `engineer-internal-ramp-up`
- design-language: `editorial-parchment`
- hero: title "Admin Backup Snapshots — Purpose, Flow, and Operator Use", lede from the existing report, eyebrow "MMS / NDS operator tooling"
- output-path: `/tmp/html-report-smoke-test.html`

For option 2:

```bash
# In a fresh Claude Code session:
/code-tour <PR-number-or-topic>
```

- [ ] **Step 3: Inspect the output**

Open the produced HTML in a browser:

```bash
open /tmp/html-report-smoke-test.html   # or the produced path
```

Verify:

- [ ] Hero renders with eyebrow + dot + title + lede + meta-row
- [ ] Sticky TOC is on the left, scroll-spy highlights the active section as you scroll
- [ ] Reading-progress bar fills at the top as you scroll
- [ ] Marginalia numbers (01, 02, ...) appear in the left gutter, terracotta color
- [ ] Body is in Geist sans, headings in Fraunces serif
- [ ] At least one inline SVG diagram renders correctly with arrow markers and role coloring
- [ ] Callouts use teal-wash (or warn-wash for `.warn` variants) with 4px left border
- [ ] Pull quotes are large serif teal with thin left rule
- [ ] Code blocks have syntax highlighting via span classes (kw/str/com/num/fn/type)
- [ ] Tables have mono-caps headers and the warm parchment background
- [ ] On viewport < 980px, TOC collapses above the content (single-column layout)
- [ ] No external dependencies — the file works offline except for Google Fonts CDN

- [ ] **Step 4: Fix any issues**

If anything fails, the most likely culprits and where to fix:

| Symptom | Likely fix-in |
|---------|---------------|
| Scroll-spy doesn't highlight active link | `references/structural-shell.md` JS section |
| Wrong fonts loaded | `design-languages/editorial-parchment.md` locked-stack section |
| Wrong colors | `design-languages/editorial-parchment.md` anchor-palette section |
| Diagram nodes uncolored | `design-languages/editorial-parchment.md` diagram role-to-palette map |
| Layout breaks at narrow width | `references/structural-shell.md` layout-grid section |
| Component HTML structure wrong | `references/content-components.md` |

Iterate: edit the relevant reference file, re-run the smoke test, re-inspect.

- [ ] **Step 5: Commit any fixes**

```bash
cd ~/code/claude-essentials
git add skills/html-report/
git commit -m "fix(html-report): <specific issue> from smoke test"
```

- [ ] **Step 6: Open a PR**

Use the `submit-pr` skill or `gh pr create` directly:

```bash
gh pr create --title "Extract html-report skill from code-tour" --body "$(cat <<'EOF'
## Summary

- New `html-report` skill owns HTML rendering for technical reports (structural
  shell + visual design languages).
- First design language `editorial-parchment` built from existing reports.
- `code-tour` Step 6 now delegates to `html-report` instead of inlining a
  prose brief + `frontend-design` reference.

## Test plan

- [x] Smoke-tested `html-report` on existing report content; output matches the
      editorial-parchment language without being byte-identical to the source.
- [ ] Run `/code-tour` on a real PR after merge; verify produced HTML.

See spec: `docs/superpowers/specs/2026-05-23-html-report-skill-design.md`
EOF
)"
```

---

## Self-Review

Spec coverage check (run through the spec sections):

- ✅ **Motivation** — addressed by extracting Step 6 from code-tour into html-report.
- ✅ **Philosophy: brand guidelines, not page templates** — encoded in design-language file structure (locked vs. steered), reinforced in SKILL.md Step 4 instructions.
- ✅ **Skill identity** — Task 1 creates SKILL.md with the trigger description from the spec.
- ✅ **Caller contract** — Task 7 SKILL.md Step 1 validates the five inputs; Task 8 code-tour rewrite supplies them.
- ✅ **Directory layout** — Tasks 1–6 create the exact tree from the spec.
- ✅ **`SKILL.md` process** — Task 7.
- ✅ **`references/structural-shell.md`** — Task 2.
- ✅ **`references/content-components.md`** — Task 3.
- ✅ **`references/diagram-kit.md`** — Task 4 (including the role taxonomy table).
- ✅ **`design-languages/<name>.md` structure (six sections)** — Task 5 covers all six (personality, locked stack, anchor palette, anti-patterns, patterns to draw from, diagram philosophy, exemplars).
- ✅ **First language: `editorial-parchment`** — Task 5.
- ✅ **Integration with `code-tour`** — Task 8.
- ✅ **Out of scope (field-report, library-doc)** — explicitly noted as "Planned" in Task 6's README.md, not built.

Placeholder scan: no TODO/TBD/"implement later" in any task. The "(See Task 7)" string appears in Task 1's stub SKILL.md, which is the intentional placeholder that Task 7 replaces — flagged so the engineer knows where to look.

Type/name consistency:

- `design-language` (kebab-case identifier in caller contract) — consistent across Tasks 7, 8.
- Audience values `engineer-internal-ramp-up` / `engineer-internal-pr-review` / `stakeholder-external` — consistent in spec, Task 6 README, Task 7 SKILL.md, Task 8 code-tour wiring.
- Span class names for syntax highlighting (`kw`/`str`/`com`/`num`/`fn`/`type`) — consistent across Task 3 components and Task 5 language.
- Role taxonomy (`default`/`hot`/`store`/`external`/`warn`/`future`) — consistent across Task 4 diagram-kit and Task 5 editorial-parchment role-to-palette map.

One thing worth noting in passing: this plan is markdown-heavy. There are no automated tests because skill files aren't testable that way. The Task 9 smoke test is the only verification gate, and it's a visual one. If you'd prefer a more rigorous verification (e.g. an HTML validator, a Lighthouse run, or a diff against a golden snapshot), add it as Task 9 Step 3.5 before committing.
