# Content Components Reference

This file defines the HTML structure of every component a report uses. The CSS class names below are stable contracts — the design-language file styles these classes. No colors, fonts, or specific values here; those live in `design-languages/{language}.md`.

## Components

### 1. Hero

**When to use.** The top of every report, exactly once. Introduces the subject, audience, and key metadata (date, reading time, scope).

**HTML structure**

```html
<header class="hero">
  <div class="hero-inner">
    <div class="eyebrow">
      <span class="dot"></span> {CATEGORY LABEL}
    </div>
    <h1 class="title">{Title}, <em>{italic phrase}</em></h1>
    <p class="lede">{One sentence that captures the report's value.}</p>

    <!-- Option A: key/value pairs -->
    <div class="meta-row">
      <div><span class="k">DATE</span><span class="v">2026-05-23</span></div>
      <div><span class="k">READING</span><span class="v">≈ 20 min</span></div>
      <div><span class="k">SECTIONS</span><span class="v">12</span></div>
    </div>

    <!-- Option B: chip-style pills (simpler reports) -->
    <div class="meta">
      <span class="pill">Compiled 2026-05-23</span>
      <span class="pill">Audience: engineers</span>
    </div>
  </div>
</header>
```

**CSS classes the language must style**
- `.hero` — outer wrapper, typically full-bleed background
- `.hero-inner` — max-width container, centers content
- `.eyebrow` — small caps label above title
- `.dot` — decorative accent dot in eyebrow (optional)
- `.title` — primary heading; `em` inside gets italic treatment
- `.lede` — subtitle / dek line
- `.meta-row` — flex row of key/value pairs
- `.k`, `.v` — label and value spans within `.meta-row`
- `.meta` — chip-style pill container (Option B)
- `.pill` — mono chip (also used standalone; see §11)

**Notes.** Use Option A when keys carry distinct meaning; Option B when all metadata items have equal weight.

---

### 2. Section

**When to use.** Every top-level section in the report body. The `id` must match a `href="#id"` in the TOC; `.num` feeds the marginalia gutter (see `structural-shell.md`).

**HTML structure**

```html
<section id="{section-id}" class="section">
  <span class="num">01</span>
  <h2>{Section Heading}</h2>
  <p>{Body content…}</p>
</section>
```

**CSS classes the language must style**
- `.section` — spacing rhythm, `scroll-margin-top` for sticky-TOC offset
- `.num` — marginalia counter; positioned absolute in the gutter

---

### 3. Card

**When to use.** Self-contained content block — a concept, code path, or feature facet — with a visual boundary. Use `.mini` inside `.grid` for 2-up or 4-up layouts.

**HTML structure**

```html
<!-- Standard card -->
<div class="card">
  <h4>{Card title}</h4>
  <p>{Card body.}</p>
</div>

<!-- Mini variant (inside .grid) -->
<div class="card mini">
  <h4>{Card title}</h4>
  <p>{Card body.}</p>
</div>
```

**CSS classes the language must style**
- `.card` — border, background, padding, radius
- `.card.mini` — reduced padding; shrinks to fit grid columns

---

### 4. Callout

**When to use.** Important aside, warning, or confirmation that must not be missed. Place directly after the paragraph it annotates.

**HTML structure**

```html
<!-- Default callout -->
<div class="callout">
  <strong>Note:</strong> {Body text.}
</div>

<!-- Warning variant -->
<div class="callout warn">
  <strong>Warning:</strong> {Body text.}
</div>

<!-- Success / confirmation variant -->
<div class="callout success">
  <strong>Done:</strong> {Body text.}
</div>
```

**CSS classes the language must style**
- `.callout` — left border accent, background tint, padding
- `.callout.warn` — warm/amber tint and border
- `.callout.success` — green tint and border

**Notes.** `.warn` and `.success` are modifier classes on `.callout`. The `<strong>` label is a convention, not required.

---

### 5. Pull Quote

**When to use.** The stickiest insight in a section — the one sentence a skimming reader must absorb. One per section maximum.

**HTML structure**

```html
<div class="quote">
  {One declarative sentence that stands alone.}
</div>
```

**CSS classes the language must style**
- `.quote` — large serif, generous vertical margin, optional left border or indent

**Notes.** The language picks the font, color, size, and whether to set the quote off with a left rule, top/bottom rules, or pure indent. Avoid using `<blockquote>` — `.quote` is for the single sentence; nested block quotation isn't the intent.

---

### 6. Details Block

**When to use.** Step-by-step tours, FAQ items, and expandable walkthroughs where the reader may want to skip well-understood steps. The first item in a series commonly carries `open` so context is immediately visible.

**HTML structure**

```html
<details open>
  <summary>{Step 1. Short label}</summary>
  <p>{Expanded body content.}</p>
</details>

<details>
  <summary>{Step 2. Short label}</summary>
  <p>{Expanded body content.}</p>
</details>
```

**CSS classes the language must style**
- `details` — spacing between items, border or indent
- `summary` — cursor, marker style, hover state

**Notes.** No wrapper class is required; the language styles native `details`/`summary` elements directly.

---

### 7. Table

**When to use.** Comparative data with clear row/column semantics — provider feature matrices, API action summaries, lifecycle step grids. Do not use for lists with a single column.

**HTML structure**

```html
<table>
  <thead>
    <tr>
      <th>{COLUMN A}</th>
      <th>{COLUMN B}</th>
      <th>{COLUMN C}</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>{value}</td>
      <td>{value}</td>
      <td>{value}</td>
    </tr>
  </tbody>
</table>
```

**CSS classes the language must style**
- `table` — border-collapse, width, spacing
- `th` — mono uppercase treatment, border, background
- `td` — border, padding, vertical align

---

### 8. Code Block

**When to use.** Multi-line code, shell commands, config snippets, or any verbatim text where syntax context matters. Use `<pre>` with manually classified `<span>` children.

**HTML structure**

```html
<pre><span class="kw">def</span> <span class="fn">snapshot</span>(host): <span class="com"># take it</span>
  <span class="kw">return</span> <span class="n">42</span></pre>
```

Span class taxonomy:

| Class | Role | Examples |
|-------|------|---------|
| `kw` | Keyword | `if`, `def`, `class`, `return` |
| `str` | String literal | `"hello"`, `'world'` |
| `com` | Comment | `# note`, `// note` |
| `n` | Numeric literal | `42`, `3.14` |
| `fn` | Function name | `snapshot`, `connect` |
| `type` | Type name | `String`, `Optional` |

**CSS classes the language must style**
- `pre` — monospace font, background, padding, overflow-x scroll
- `pre .kw`, `pre .str`, `pre .com`, `pre .n`, `pre .fn`, `pre .type` — token colors

**Notes.** Span classification is done manually by the report author; no runtime highlighter is involved. Unclassified text inside `<pre>` is the default ink color. The numeric-literal token uses `.n` (not `.num`) so it does not collide with the `.num` marginalia counter from §2.

---

### 9. Inline Code

**When to use.** Type names, method names, field names, and short literals embedded in prose. Use `<pre>` (§8) for anything multi-line.

**HTML structure**

```html
<p>The status moves from <code>PENDING</code> to <code>ACTIVE</code> after the provider step completes.</p>
```

**CSS classes the language must style**
- `code` (inline, i.e. not inside `pre`) — background wash, accent text color, slight padding, rounded corners

---

### 10. Ticket / Identifier Pill

**When to use.** Ticket IDs, feature flags, release labels, and any short opaque identifier that benefits from visual separation from surrounding prose. Can be used inline or grouped in `.meta` (see §1).

**HTML structure**

```html
<!-- Inline in prose -->
<p>Tracked in <span class="pill">SAN-15</span>.</p>

<!-- Grouped in meta area -->
<div class="meta">
  <span class="pill">MVP</span>
  <span class="pill">PROGRAM-173</span>
</div>
```

**CSS classes the language must style**
- `.pill` — mono font, small size, rounded border, colored chip background

---

### 11. Diagram Card

**When to use.** Architecture diagrams, flow charts, and any inline SVG that needs a caption and a card boundary. The SVG itself is inline (no `<img>`); SVG patterns and node role taxonomy belong to `references/diagram-kit.md`.

**HTML structure**

```html
<figure class="card diagram">
  <svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">
    <!-- SVG content; see diagram-kit.md for node patterns -->
  </svg>
  <figcaption class="caption">{One sentence describing what the diagram shows.}</figcaption>
</figure>
```

**CSS classes the language must style**
- `.card.diagram` — inherits `.card` border/padding; may adjust padding-bottom for caption rhythm
- `.caption` — small, muted, centered or left-aligned below the SVG

**Notes.** `<figure>` is block-level; it does not go inside `<p>`. The language file sets SVG text font via a `<style>` block inside the SVG, not from external CSS.

---

### 12. Grid

**When to use.** Two-up "X vs Y" comparisons, four-quadrant explanations, or any set of 2–4 equal-weight `.card.mini` blocks that benefit from side-by-side layout.

**HTML structure**

```html
<div class="grid">
  <div class="card mini">
    <h4>{Left title}</h4>
    <p>{Left body.}</p>
  </div>
  <div class="card mini">
    <h4>{Right title}</h4>
    <p>{Right body.}</p>
  </div>
</div>
```

**CSS classes the language must style**
- `.grid` — `display: grid`, column count (typically 2), gap
- `.card.mini` — see §3

**Notes.** For 4-up layouts, add two more `.card.mini` siblings; the language controls `grid-template-columns`. Avoid using `.grid` for vertically-stacked content — plain `.card` blocks work better there.

---

## What Lives Elsewhere

- **Plumbing** (TOC, scroll-spy, progress bar, marginalia gutter geometry, layout grid) → `references/structural-shell.md`
- **SVG patterns, role taxonomy for diagram nodes** (box classes, arrow markers, label styles) → `references/diagram-kit.md`
- **Colors, fonts, spacing rhythms** (every `var(--...)` value) → `design-languages/{language}.md`
