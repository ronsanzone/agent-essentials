# Design Language: Editorial Parchment

_Steering brief, not a template. Locks font stack, anchor palette, and anti-patterns. Composition is free._

## Personality

Editorial Parchment feels like a long-form New York Review of Books essay set with a tasteful technical accent. Warm parchment paper, distinctive Fraunces serif display, clean Geist sans body, characterful JetBrains Mono for code and marginalia. Teal as primary accent (links, italic-em in titles, active TOC, primary diagram nodes); terracotta as secondary (eyebrow dot, marginalia number, ticket pills).

## Pick this when

- Dense ramp-up tours that engineers will read for 20+ minutes
- Operator reference docs that get re-read across incidents
- PR review tours with `file:line` citation density
- Technical documents where the reader will sit and read sequentially

## Don't pick this when

- The report is outcomes-forward and feels more like a field report or postmortem (use a future `field-report` language)
- The report is short (under ~5 minutes reading time) and would feel overdressed in this register

## Locked brand stack

### Google Fonts URL

Load exactly this URL — the weight and axis ranges are part of the brand:

```
https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,400&family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap
```

### Font stack CSS variables

```css
--serif: "Fraunces", "Iowan Old Style", "Charter", Georgia, serif;
--sans:  "Geist", "Söhne", "Helvetica Neue", -apple-system, sans-serif;
--mono:  "JetBrains Mono", "SF Mono", "IBM Plex Mono", Menlo, monospace;
```

### Font role assignments

| Role | Font | Notes |
|------|------|-------|
| Body prose | `var(--sans)` — Geist | 16px, line-height 1.65 |
| Display / headings | `var(--serif)` — Fraunces | Use `opsz` variation axis |
| Code, eyebrows, marginalia, pills, meta keys | `var(--mono)` — JetBrains Mono | |

### Optical-size settings (locked)

- `h1`: `font-variation-settings: "opsz" 144` — maximum optical size, most refined letterforms
- `h2`: `font-variation-settings: "opsz" 60` (approximate; renderer may tune ±10)
- Ledes and pull quotes: `font-variation-settings: "opsz" 32`

### Voice rules (locked)

- Italic serif for ledes, pull quotes, and italic-em phrases inside `h1` titles (`<h1>Title, <em>italic phrase</em></h1>`)
- Mono caps with letter-spacing for eyebrows and meta-row labels
- **Never bold body prose for emphasis** — use italic instead
- Pull quotes are large (≥24px), serif, italicized, set off by a thin left rule
- The eyebrow dot is always `var(--terracotta)` — it is the brand's smallest terracotta touch

---

## Anchor palette

These hex values are the brand. Do not approximate; extract and paste verbatim.

```css
:root {
  /* Surfaces — warm parchment */
  --bg:        #faf7f0;  /* body background */
  --bg-soft:   #f4efe2;  /* hero gradient start, table headers */
  --bg-card:   #fdfcf8;  /* cards, callouts, code blocks */
  --bg-code:   #f1ece0;  /* code background, inline code wash */

  /* Ink */
  --ink:       #1c1a17;  /* body text */
  --ink-soft:  #4d4842;  /* lede, secondary text */
  --ink-faint: #8a8175;  /* meta-row, captions, eyebrow text */
  --ink-ghost: #b4ac9e;  /* ghost numbers, future-state diagrams */

  /* Rules */
  --rule:        #d9d2c1;  /* borders */
  --rule-soft:   #e8e2d2;  /* hairline separators */
  --rule-strong: #b9b09c;  /* heavier borders, store-role diagrams */

  /* Accents */
  --teal:            #0a5c4f;  /* primary: links, h1 italic-em, active TOC, primary diagram nodes */
  --teal-soft:       #dae5e0;  /* teal wash: callouts, hot diagram fills */
  --teal-deep:       #064038;  /* hover state for teal elements */
  --terracotta:      #a84e1a;  /* secondary: eyebrow dot, marginalia number, ticket pills */
  --terracotta-soft: #f3e3d2;  /* terracotta wash: external diagram fills */

  /* Aliases for the diagram-kit generic SVG style block */
  --accent:          var(--teal);
  --accent-soft:     var(--teal-soft);
  --secondary:       var(--terracotta);
  --secondary-soft:  var(--terracotta-soft);
}
```

The four `--accent` / `--secondary` aliases let the canonical SVG `<style>` block from `references/diagram-kit.md` render without modification. If a future component or report wants direct access to teal/terracotta, the concrete tokens are still there.

### Permitted additional accents

Introduce this pair only if the content calls for it:

- `--warn: #9a6300` + `--warn-soft: #f8ecd5` — for deprecation, failure path, "known gaps" sections, warn diagram fills.

A success palette (`--success` + `--success-wash`) does not belong to this language — that's `field-report` territory. If positive-outcome signaling is heavy enough to need its own color, the report is in the wrong language.

Do not add a third primary accent. The teal/terracotta duo is load-bearing for the language's identity.

## Anti-patterns (do not do)

- No Inter, Roboto, Arial, or system-font defaults
- No purple gradients on white backgrounds
- No dark themes — this language is light-only
- No shadows heavier than `0 10px 30px rgba(60, 45, 20, 0.04)`. Heavier shadows kill the paper feel.
- No full-bleed photographs. This is a typographic language.
- No emoji in headings or callouts
- No bright/saturated accents outside the warm palette (no electric blue, no neon green)
- No decorative gradients or patterns beyond the subtle paper grain (radial-gradient at very low opacity)

## Patterns to draw from

These are flavor sketches, not copy-paste blocks. The renderer writes its own CSS in this register.

### Hero — in this language

Fraunces h1 with `clamp(44px, 6vw, 78px)`, opsz 144. Optional `<em>` inside h1 is italic weight-300 teal. Fraunces italic lede in ink-soft at opsz 32. Mono caps eyebrow with 6px terracotta dot. Background is `linear-gradient(180deg, var(--bg-soft) 0%, var(--bg) 100%)`.

```css
h1.title {
  font-family: var(--serif); font-weight: 400;
  font-size: clamp(44px, 6vw, 78px); line-height: 1.02;
  letter-spacing: -0.025em; font-variation-settings: "opsz" 144;
}
h1.title em { font-style: italic; font-weight: 300; color: var(--teal); }
.lede {
  font-family: var(--serif); font-style: italic;
  font-size: clamp(19px, 2vw, 23px); color: var(--ink-soft);
  font-variation-settings: "opsz" 32;
}
.eyebrow { font-family: var(--mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; }
.eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--terracotta); }
```

**Locked:** Fraunces h1, teal `<em>`, Fraunces italic lede, mono eyebrow, terracotta dot, bg-soft gradient.
**Free to vary:** padding, lede max-width, meta-row vs. pill layout for hero footer.

---

### Section header with marginalia — in this language

Fraunces h2 at 36px, opsz 60. Mono terracotta section number (`01`, `02`…) absolutely positioned in left gutter at `left: -64px, top: 7px`.

```css
.section { position: relative; margin: 0 0 68px; }
.num { position: absolute; left: -64px; top: 7px; font-family: var(--mono); font-size: 12px; color: var(--terracotta); letter-spacing: 0.12em; }
h2 { font-family: var(--serif); font-size: 36px; font-weight: 450; line-height: 1.12; font-variation-settings: "opsz" 60; }
```

**Locked:** serif h2, terracotta mono number, left-gutter position.
**Free to vary:** exact `left` offset (adjust when layout column changes), font-weight.

---

### Card — in this language

bg-card surface, 1px rule border, generous corner radius (16–24px), minimal shadow at ceiling. Cards nest any prose or sub-components.

```css
.card { border: 1px solid var(--rule); background: var(--bg-card); border-radius: 20px; padding: 22px 24px; margin: 22px 0; box-shadow: 0 10px 30px rgba(60, 45, 20, 0.04); }
```

**Locked:** bg-card fill, rule border, shadow ceiling.
**Free to vary:** border-radius, padding, grid vs. stack layout.

---

### Callout default — in this language

Teal-soft background, 4px teal left border, rounded. Informational/highlight signal.

```css
.callout { border-left: 4px solid var(--teal); background: var(--teal-soft); padding: 18px 20px; border-radius: 12px; margin: 22px 0; }
```

**Locked:** teal-soft background, teal left-border, 4px border weight.
**Free to vary:** border-radius, padding, icon/label presence.

---

### Callout warn — in this language

Same geometry as default callout; swap to the warn color pair:

- **warn:** `border-left-color: var(--warn)` + `background: var(--warn-soft)` — deprecation, failure path, known gaps.

**Locked:** color swap only; same 4px left-border, same border-radius.
**Free to vary:** nothing for warn.

The success variant (`--success` + `--success-wash`) belongs to `field-report`. If a report needs heavy positive-outcome signaling, reconsider the language choice; don't add a success callout pattern to this language.

---

### Pull quote — in this language

Large Fraunces serif (~25px), teal color, thin left rule with generous left padding. Italic optional but characteristic.

```css
.quote {
  font-family: var(--serif);
  font-size: 25px;
  line-height: 1.35;
  color: var(--teal);
  border-left: 1px solid var(--rule);
  padding-left: 24px;
  margin: 30px 0;
}
```

**Locked:** serif font family, teal color, larger-than-body size (≥24px), thin rule.
**Free to vary:** rule weight, padding, exact font-size (22–28px range), italic on/off.

---

### Code block — in this language

bg-code fill, rule border, 16px radius, JetBrains Mono 13px, line-height 1.55. Print-inspired muted syntax colors available but not required.

```css
pre { background: var(--bg-code); border: 1px solid var(--rule); border-radius: 16px; padding: 18px; overflow: auto; font-family: var(--mono); font-size: 13px; line-height: 1.55; }
```

**Locked:** bg-code, rule border, mono font.
**Free to vary:** border-radius (12–20px), padding, syntax highlighting.

---

### Inline code — in this language

Mono at 0.92em, bg-code wash (`rgba(241,236,224,0.75)`), minimal padding, small radius. No border needed.

**Locked:** mono font, bg-code wash.
**Free to vary:** exact opacity, padding, border-radius.

---

### Table — in this language

Border-collapse with rule borders. `th` is mono uppercase letter-spaced against bg-soft. `td` rows separated by rule-soft.

```css
table { width: 100%; border-collapse: collapse; background: var(--bg-card); border: 1px solid var(--rule); }
th, td { text-align: left; padding: 12px 14px; border-bottom: 1px solid var(--rule-soft); vertical-align: top; }
th { font-family: var(--mono); font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); background: var(--bg-soft); }
```

**Locked:** mono uppercase `th`, bg-soft header, rule border.
**Free to vary:** column widths, row striping (none is default), `td` font-size.

---

### Ticket pill — in this language

Terracotta border and text, mono 12px, pill shape. Used for file refs, ticket IDs, version labels.

```css
.pill { font-family: var(--mono); font-size: 12px; padding: 4px 10px; border: 1px solid var(--terracotta); border-radius: 999px; color: var(--terracotta); display: inline-block; }
```

**Locked:** terracotta color family, mono font, pill shape.
**Free to vary:** padding, font-size (11–13px), faint terracotta-soft background wash.

---

### Details block — in this language

Top rule border, generous vertical padding. Summary uses Fraunces 22px teal — feels like a collapsible sub-heading.

```css
details { border-top: 1px solid var(--rule); padding: 16px 0; }
summary { cursor: pointer; font-family: var(--serif); font-size: 22px; color: var(--teal); list-style: none; }
```

**Locked:** serif summary in teal, rule top-border.
**Free to vary:** padding, chevron icon, font-weight.

---

### Body paper grain texture — in this language

A `body::before` fixed overlay with two radial gradients at very low opacity. Creates subtle warmth without visible pattern. Present in both exemplar reports — treat as locked in spirit (every report should have some grain) but the exact gradient stops may vary slightly.

```css
body::before {
  content: "";
  position: fixed;
  inset: 0;
  background-image:
    radial-gradient(circle at 23% 17%, rgba(184, 156, 100, 0.04) 0, transparent 40%),
    radial-gradient(circle at 78% 83%, rgba(140, 110, 60, 0.03) 0, transparent 35%);
  pointer-events: none;
  z-index: 0;
}
```

**Locked in spirit:** some paper grain overlay must be present; opacity must remain at or below 0.04.
**Free to vary:** exact gradient positions (23%/17% and 78%/83% are the reference), stop colors.

## Diagram philosophy

Diagrams here are quiet and precise — not decorative. Boxes have thin borders, generous padding, parchment fill, teal arrows. Text inside diagrams uses Geist sans (matching body).

### Role-to-palette map

| Role | Fill | Stroke | Notes |
|------|------|--------|-------|
| `default` | `var(--bg-card)` | `var(--rule)` | 1.5px stroke, `rx="14"` rounded corners |
| `hot` | `var(--teal-soft)` | `var(--teal)` | Same geometry, teal accents |
| `store` | `var(--bg-soft)` | `var(--rule-strong)` | Slightly heavier stroke (2px) |
| `external` | `var(--terracotta-soft)` | `var(--terracotta)` | Terracotta family |
| `warn` | `var(--warn-soft)` | `var(--warn)` | Only when warn palette is permitted |
| `future` | `var(--bg)` | `var(--ink-ghost)`, dashed | `stroke-dasharray: 4 3` |

### SVG typography

```svg
<style>
  .txt   { font: 14px "Geist", sans-serif; fill: var(--ink); }
  .small { font: 12px "Geist", sans-serif; fill: var(--ink-soft); }
</style>
```

### Arrow color

Default arrows: `var(--teal)`. 2px stroke for primary flow, 1px for secondary references.

### Caption

Italic Fraunces serif, `var(--ink-faint)`, 14px, centered under the diagram with `margin-top: 8px`.

```css
.caption {
  font-family: var(--serif);
  font-style: italic;
  color: var(--ink-faint);
  font-size: 14px;
  text-align: center;
  margin-top: 8px;
}
```

## Exemplar reports

Read at least one before writing. They are evidence of the language, not templates to clone.

- `~/notes/04_Research/atlas-on-alibaba-cloud-tour.html` — dense ramp-up tour with the full component set (hero, marginalia, cards, callouts, pull quotes, SVG diagrams in cards, ticket pills). Reference for "everything this language can do at full scale."

- `~/notes/04_Research/admin-backup-snapshots-overview.html` — shorter operator reference (~70 lines minified). Same language at smaller scale; useful when the report is mid-length.

The two reports are visibly different in composition (atlas ~1800 lines, admin-backup ~70 lines minified) but instantly recognizable as the same language. That's the goal: locked brand stack, free composition.
