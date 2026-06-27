# Diagram Kit Reference

This file owns the SVG vocabulary every report shares: which diagram types are supported, and which node roles (`default` / `hot` / `store` / `external` / `warn` / `future`) the language can paint. The role taxonomy is the seam between this file and the design-language file: this file uses `class="default"`, the language file says what `.default` looks like. No colors or fonts here — only structure, geometry, and class names.

---

## Role Taxonomy

| Role | Semantic intent | Typical visual treatment |
|------|-----------------|--------------------------|
| `default` | Neutral box. The workhorse — most nodes are default. | Light fill, thin border. |
| `hot` | Active / current focus / hot path / state being traced. | Accent wash fill, accent border. |
| `store` | Persistence / data at rest / cache / DB. | Slightly heavier border, neutral fill. |
| `external` | Third-party API, cross-system boundary, vendor SDK. | Secondary accent. |
| `warn` | Caution / failure path / not-yet-supported. | Warm tint. |
| `future` | Planned work / not yet wired. | Dashed border, ghosted fill. |

Languages map these to palette positions. The role table is the contract.

---

## SVG `<style>` Block Pattern

Every diagram has an inline `<style>` block. The template below uses the **generic accent token names** `--accent`, `--accent-soft`, `--secondary`, `--secondary-soft`. A design language must either:

1. **Alias** these in its `:root` block (e.g. editorial-parchment can add `--accent: var(--teal); --accent-soft: var(--teal-soft); --secondary: var(--terracotta); --secondary-soft: var(--terracotta-soft);`), so the template renders unchanged, OR
2. **Rewrite** the role classes in this template with its concrete palette tokens (e.g. replace `var(--accent)` with `var(--teal)` directly).

Either approach is acceptable; the diagram-kit doesn't care which the language picks, as long as the role-to-color contract is honored.

Template:

```svg
<svg viewBox="0 0 900 350" xmlns="http://www.w3.org/2000/svg">
  <style>
    /* Typography — language sets font-family */
    .txt   { font-size: 14px; fill: var(--ink); }
    .small { font-size: 12px; fill: var(--ink-soft); }
    .mono  { font-size: 12px; fill: var(--ink); font-family: monospace; }
    /* Role classes — language fills colors */
    .default  { fill: var(--bg-card);        stroke: var(--rule); }
    .hot      { fill: var(--accent-soft);    stroke: var(--accent); }
    .store    { fill: var(--bg-soft);        stroke: var(--rule-strong); }
    .external { fill: var(--secondary-soft); stroke: var(--secondary); }
    .warn     { fill: var(--warn-soft);      stroke: var(--warn); }
    .future   { fill: var(--bg);             stroke: var(--ink-ghost); stroke-dasharray: 4 3; }
    /* Geometry and connectors */
    .box        { stroke-width: 1.5; }
    .arrow      { stroke: var(--accent);      stroke-width: 2;   fill: none; marker-end: url(#arrow); }
    .arrow-muted{ stroke: var(--rule-strong); stroke-width: 1.5; fill: none; marker-end: url(#arrow-muted); }
  </style>
  <defs>
    <marker id="arrow"       markerWidth="8"  markerHeight="8"  refX="7"  refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z"   fill="var(--accent)"/>
    </marker>
    <marker id="arrow-muted" markerWidth="8"  markerHeight="8"  refX="7"  refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z"   fill="var(--rule-strong)"/>
    </marker>
    <marker id="arrow-thick" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
      <path d="M0,0 L12,6 L0,12 Z" fill="var(--accent)"/>
    </marker>
  </defs>
  <!-- nodes and arrows go here -->
</svg>
```

The language file may inject `font-family` on `.txt` / `.small`. Three markers: `#arrow` (primary), `#arrow-muted` (secondary/return), `#arrow-thick` (emphasis — use sparingly). Apply via `marker-end="url(#arrow)"`.

---

## Diagram Type Catalog

### a. Linear Flow

**When to use.** Left-to-right pipeline, 3–8 stages. Request lifecycles, job pipelines, data processing chains.

```svg
<svg viewBox="0 0 860 140" xmlns="http://www.w3.org/2000/svg">
  <!-- shared <style> + <defs> -->
  <rect class="box default" x="20"  y="35" width="150" height="70" rx="14"/>
  <text class="txt"   x="40"  y="67">{Trigger}</text>
  <text class="small" x="40"  y="88">{subtitle}</text>
  <path class="arrow" d="M170 70 H210"/>
  <rect class="box hot"     x="210" y="35" width="160" height="70" rx="14"/>
  <text class="txt"   x="230" y="67">{Process}</text>
  <text class="small" x="230" y="88">{subtitle}</text>
  <path class="arrow" d="M370 70 H410"/>
  <rect class="box store"   x="410" y="35" width="160" height="70" rx="14"/>
  <text class="txt"   x="430" y="67">{Store}</text>
  <text class="small" x="430" y="88">{subtitle}</text>
  <path class="arrow" d="M570 70 H610"/>
  <rect class="box default" x="610" y="35" width="160" height="70" rx="14"/>
  <text class="txt"   x="630" y="67">{Notify}</text>
  <text class="small" x="630" y="88">{subtitle}</text>
</svg>
```

Keep `hot` on the step the prose is currently discussing. Use `store` for persistence nodes and `external` for third-party sinks.

---

### b. Swim-Lane

**When to use.** Two or more actors/layers where messages cross a boundary — cloud-agnostic vs. provider-specific, client vs. server vs. DB.

```svg
<svg viewBox="0 0 860 280" xmlns="http://www.w3.org/2000/svg">
  <!-- shared <style> + <defs> -->
  <text class="small" x="10" y="90"  writing-mode="tb" text-anchor="middle">{Layer A}</text>
  <text class="small" x="10" y="210" writing-mode="tb" text-anchor="middle">{Layer B}</text>
  <rect x="32" y="20"  width="810" height="110" rx="8" fill="var(--bg-soft)" opacity="0.5"/>
  <rect x="32" y="150" width="810" height="110" rx="8" fill="var(--bg)"      opacity="0.5"/>
  <line x1="32" y1="140" x2="842" y2="140" stroke="var(--rule)" stroke-width="1" stroke-dasharray="6 4"/>
  <rect class="box default"  x="50"  y="40"  width="150" height="60" rx="12"/>
  <text class="txt"   x="70"  y="68">{A Node 1}</text>
  <path class="arrow" d="M200 70 H260"/>
  <rect class="box hot"      x="260" y="40"  width="150" height="60" rx="12"/>
  <text class="txt"   x="280" y="68">{A Node 2}</text>
  <path class="arrow" d="M335 100 V160"/>
  <rect class="box external" x="260" y="168" width="150" height="60" rx="12"/>
  <text class="txt"   x="280" y="198">{B Node 1}</text>
  <path class="arrow" d="M410 198 H480"/>
  <rect class="box store"    x="480" y="168" width="150" height="60" rx="12"/>
  <text class="txt"   x="500" y="198">{B Node 2}</text>
  <path class="arrow-muted"  d="M555 168 V100"/>
  <rect class="box default"  x="480" y="40"  width="150" height="60" rx="12"/>
  <text class="txt"   x="500" y="68">{A Node 3}</text>
</svg>
```

`writing-mode="tb"` for vertical lane labels. Downward (request) arrows use `arrow`; upward (response) use `arrow-muted` — direction is legible at a glance.

---

### c. Before / After Comparison

**When to use.** Side-by-side comparison of old and new architecture or behavior. Equal node counts make the alignment self-explanatory.

```svg
<svg viewBox="0 0 860 240" xmlns="http://www.w3.org/2000/svg">
  <!-- shared <style> + <defs> -->
  <text class="small" x="200" y="18" text-anchor="middle">Before</text>
  <text class="small" x="640" y="18" text-anchor="middle">After</text>
  <line x1="430" y1="24" x2="430" y2="220" stroke="var(--rule)" stroke-width="1"/>
  <rect class="box default" x="50"  y="40" width="140" height="60" rx="12"/>
  <text class="txt" x="70"  y="70">{Old Step 1}</text>
  <path class="arrow" d="M190 70 H230"/>
  <rect class="box warn"    x="230" y="40" width="140" height="60" rx="12"/>
  <text class="txt" x="250" y="70">{Old Step 2}</text>
  <path class="arrow" d="M140 100 V160"/>
  <rect class="box default" x="50"  y="160" width="310" height="50" rx="12"/>
  <text class="txt" x="120" y="190">{Old Outcome}</text>
  <rect class="box default" x="460" y="40"  width="140" height="60" rx="12"/>
  <text class="txt" x="480" y="70">{New Step 1}</text>
  <path class="arrow" d="M600 70 H640"/>
  <rect class="box hot"     x="640" y="40"  width="140" height="60" rx="12"/>
  <text class="txt" x="660" y="70">{New Step 2}</text>
  <path class="arrow" d="M570 100 V160"/>
  <rect class="box hot"     x="460" y="160" width="310" height="50" rx="12"/>
  <text class="txt" x="530" y="190">{Improved Outcome}</text>
</svg>
```

`warn` on the problematic "before" node. `hot` on the improved "after" equivalent.

---

### d. Sequence Diagram

**When to use.** Actor-to-actor message exchange where order matters — API chains, protocol handshakes, request/response flows.

Lifelines are dashed (lighter); the actor box is the visual anchor. Use `arrow-muted` for return/response paths.

```svg
<svg viewBox="0 0 860 340" xmlns="http://www.w3.org/2000/svg">
  <!-- shared <style> + <defs> -->
  <rect class="box default" x="60"  y="20" width="120" height="50" rx="12"/>
  <text class="txt" x="120" y="52" text-anchor="middle">{Client}</text>
  <rect class="box default" x="360" y="20" width="120" height="50" rx="12"/>
  <text class="txt" x="420" y="52" text-anchor="middle">{Service}</text>
  <rect class="box store"   x="660" y="20" width="120" height="50" rx="12"/>
  <text class="txt" x="720" y="52" text-anchor="middle">{Store}</text>
  <line x1="120" y1="70" x2="120" y2="320" stroke="var(--rule)" stroke-width="1" stroke-dasharray="5 4"/>
  <line x1="420" y1="70" x2="420" y2="320" stroke="var(--rule)" stroke-width="1" stroke-dasharray="5 4"/>
  <line x1="720" y1="70" x2="720" y2="320" stroke="var(--rule)" stroke-width="1" stroke-dasharray="5 4"/>
  <path class="arrow"       d="M120 110 H420"/>
  <text class="small" x="270" y="105" text-anchor="middle">{request}</text>
  <path class="arrow"       d="M420 160 H720"/>
  <text class="small" x="570" y="155" text-anchor="middle">{query}</text>
  <path class="arrow-muted" d="M720 210 H420"/>
  <text class="small" x="570" y="205" text-anchor="middle">{result}</text>
  <path class="arrow-muted" d="M420 260 H120"/>
  <text class="small" x="270" y="255" text-anchor="middle">{response}</text>
  <path class="arrow" d="M420 300 H720" stroke-dasharray="6 3"/>
  <text class="small" x="570" y="295" text-anchor="middle">{async event}</text>
</svg>
```

Async/fire-and-forget: add `stroke-dasharray="6 3"` inline to the arrow path. Return paths: use `arrow-muted`.

---

### e. State Machine

**When to use.** Finite states with labeled transitions — lifecycle modeling, status fields, protocol states.

`hot` marks the current/focus state. Self-loops arc above the box via cubic bezier.

```svg
<svg viewBox="0 0 860 260" xmlns="http://www.w3.org/2000/svg">
  <!-- shared <style> + <defs> -->
  <rect class="box default" x="30"  y="100" width="130" height="60" rx="14"/>
  <text class="txt" x="95"  y="135" text-anchor="middle">PENDING</text>
  <rect class="box hot"     x="240" y="100" width="130" height="60" rx="14"/>
  <text class="txt" x="305" y="135" text-anchor="middle">ACTIVE</text>
  <rect class="box warn"    x="450" y="30"  width="130" height="60" rx="14"/>
  <text class="txt" x="515" y="65"  text-anchor="middle">FAILED</text>
  <rect class="box default" x="450" y="170" width="130" height="60" rx="14"/>
  <text class="txt" x="515" y="205" text-anchor="middle">DELETED</text>
  <path class="arrow" d="M275 100 C275 50, 335 50, 335 100" fill="none"/>
  <text class="small" x="305" y="44" text-anchor="middle">{retry}</text>
  <path class="arrow" d="M160 130 H240"/>
  <text class="small" x="200" y="124" text-anchor="middle">{created}</text>
  <path class="arrow" d="M370 110 H450"/>
  <text class="small" x="410" y="104" text-anchor="middle">{error}</text>
  <path class="arrow" d="M370 150 H450"/>
  <text class="small" x="410" y="172" text-anchor="middle">{delete}</text>
  <path class="arrow" d="M515 90 V170"/>
  <text class="small" x="530" y="135">{cleanup}</text>
</svg>
```

Self-loop: `d="M{left-x} {top-y} C{left-x} {arc-y}, {right-x} {arc-y}, {right-x} {top-y}"`. Adjust arc-y to clear label text.

---

### f. Hypothesis Ledger

**When to use.** Performance reports, experiment outcomes, predicted vs. actual tabular comparisons with a pass/fail signal.

Numbers are right-aligned mono. Rows separated by thin horizontal rules.

```svg
<svg viewBox="0 0 860 240" xmlns="http://www.w3.org/2000/svg">
  <!-- shared <style> + <defs> -->
  <rect x="20" y="20" width="820" height="36" fill="var(--bg-soft)"/>
  <text class="small" x="36"  y="44">Hypothesis</text>
  <text class="small" x="580" y="44" text-anchor="end">Predicted</text>
  <text class="small" x="700" y="44" text-anchor="end">Actual</text>
  <text class="small" x="830" y="44" text-anchor="end">Signal</text>
  <line x1="20" y1="56" x2="840" y2="56" stroke="var(--rule)" stroke-width="1"/>
  <text class="txt"  x="36"  y="84">{Hypothesis description A}</text>
  <text class="mono" x="580" y="84" text-anchor="end">{123 ms}</text>
  <text class="mono" x="700" y="84" text-anchor="end">{118 ms}</text>
  <text class="txt"  x="830" y="84" text-anchor="end" fill="var(--accent)">✓</text>
  <line x1="20" y1="96" x2="840" y2="96" stroke="var(--rule-soft)" stroke-width="1"/>
  <text class="txt"  x="36"  y="124">{Hypothesis description B}</text>
  <text class="mono" x="580" y="124" text-anchor="end">{200 ms}</text>
  <text class="mono" x="700" y="124" text-anchor="end">{310 ms}</text>
  <text class="txt"  x="830" y="124" text-anchor="end" fill="var(--warn)">✗</text>
  <line x1="20" y1="136" x2="840" y2="136" stroke="var(--rule-soft)" stroke-width="1"/>
  <text class="txt"  x="36"  y="164">{Hypothesis description C}</text>
  <text class="mono" x="580" y="164" text-anchor="end">{50 ms}</text>
  <text class="mono" x="700" y="164" text-anchor="end">{54 ms}</text>
  <text class="txt"  x="830" y="164" text-anchor="end" fill="var(--ink-soft)">~</text>
  <line x1="20" y1="176" x2="840" y2="176" stroke="var(--rule-soft)" stroke-width="1"/>
  <text class="txt"  x="36"  y="204" fill="var(--ink-ghost)">{Hypothesis description D — not yet measured}</text>
  <text class="mono" x="580" y="204" text-anchor="end" fill="var(--ink-ghost)">{80 ms}</text>
  <text class="mono" x="700" y="204" text-anchor="end" fill="var(--ink-ghost)">—</text>
  <text class="txt"  x="830" y="204" text-anchor="end" fill="var(--ink-ghost)">—</text>
</svg>
```

Signal: `var(--accent)` for ✓, `var(--warn)` for ✗, `var(--ink-soft)` for ~. Unmeasured rows: inline `fill="var(--ink-ghost)"` on each text element (no box class — there are no boxes).

---

## Caption Pattern

```html
<figure class="card diagram">
  <svg><!-- … --></svg>
  <figcaption class="caption">{One sentence describing what the diagram shows.}</figcaption>
</figure>
```

The wrapper is defined in `content-components.md` §11. The language file styles `.caption`.

---

## Composition Guidance

Compose diagrams that reinforce the prose — don't add diagrams for decoration. A single well-placed swim-lane is worth more than five linear flows. Use `hot` to draw the eye to the current focus; `default` boxes recede. If a diagram needs more than 8–10 boxes, it's probably two diagrams. When in doubt, link adjacent diagrams via shared node labels or positions — visual continuity across figures matters.

---

## What Lives Elsewhere

- Diagram card wrapper `<figure class="card diagram">` → `references/content-components.md` §11
- Role-to-palette mapping (`.default { fill: #...; }`) → `design-languages/{language}.md`
- SVG font-family choice → `design-languages/{language}.md`
- `<figcaption>` text styling → `design-languages/{language}.md`
