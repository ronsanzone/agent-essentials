---
name: html-report
description: Use when a caller has compiled content (sections, prose, code, diagrams) and needs to render it as a self-contained HTML technical report. Owns structural UX (TOC, scroll-spy, progress bar, marginalia, collapsible sections, SVG diagram cards) and visual design languages. Used by code-tour; intended for future report-producing skills.
---

# html-report

Render a self-contained HTML report from compiled content, applying a curated design language. Brand-guidelines philosophy: locked font stack and anchor palette per language; free composition within.

## Usage

Invoked by a calling skill (e.g. `code-tour`) with:

- **content** — compiled outline (sections, prose, code with `file:line` citations, tables, callouts, diagram briefs)
- **audience** — an audience signal used to drive language selection when `design-language` is not supplied (see `design-languages/README.md` for the canonical list; common signals include `engineer-internal-ramp-up`, `engineer-api-reference`, `researcher-academic`, `stakeholder-external-editorial`)
- **design-language** — identifier matching a file in `design-languages/` (e.g. `editorial-parchment`)
- **hero** — title, lede, eyebrow text, meta pills
- **output-path** — absolute path for the resulting HTML file

## Process

### Step 1: Validate inputs

Confirm the caller supplied:

- `content` — non-empty compiled outline
- `audience` — a non-empty audience signal (matched against `design-languages/README.md`'s selection heuristic; unrecognized signals fall through to the `editorial-parchment` default)
- `design-language` — exists as a file in `design-languages/`
- `hero` — at minimum a title; lede, eyebrow, meta-row are optional
- `output-path` — absolute path; parent directory exists

If `design-language` is not supplied, fall back using the heuristic in `design-languages/README.md`.

### Step 2: Load references

Read all of these in parallel (single message, multiple Read calls):

- `references/structural-shell.md`
- `references/content-components.md`
- `references/diagram-kit.md`
- `design-languages/<chosen>.html`

### Step 3: Absorb the exemplar

If the chosen design language file lists exemplar reports, read at least one. The exemplar is evidence of the language, not a template — absorb the composition, the rhythm, the level of detail, then close it and write fresh HTML. Do not clone it. If the language file does not list exemplars, the file itself is the worked example — its component gallery, swatch grid, and diagrams demonstrate every pattern at full scale.

### Step 4: Dispatch a fresh `general-purpose` subagent for rendering

The rendering work is composition (writing HTML/CSS/SVG informed by provided references), not codebase analysis. Dispatch a fresh subagent so it commits cleanly to the aesthetic without context bleed from the caller's research phase.

The subagent prompt must include:

1. The chosen design language file (full content).
2. All three reference files (full content).
3. At least one exemplar's content if the language file lists exemplars (as a context reference — *not* a file to clone). If no exemplars are listed, omit this step — the language file itself is the comprehensive worked example.
4. The compiled content payload.
5. The audience and hero metadata.
6. The output path.
7. Explicit instructions:
   - Write one self-contained HTML file (all CSS/SVG inline, fonts via Google Fonts CDN, no other external dependencies).
   - Honor every locked element in the design language (font stack, anchor palette, anti-patterns).
   - Compose freely within the language. Vary per report so two reports in the same language don't feel xeroxed.
   - Use the canonical scroll-spy JS and TOC HTML structure from `references/structural-shell.md` verbatim.
   - Apply the role-to-palette map from the design language file for all diagram nodes, plus any language-specific diagram vocabulary it defines (e.g., ASCII box-drawing in `cyber-matrix`, brushstroke arrows in `kanagawa-wave`, perspective grids and chrome bevels in `synthwave-outrun`). The role taxonomy (default/hot/store/external/warn/future) is invariant; the *rendering* of each role can be language-specific.
   - Return the absolute path on completion.

### Step 5: Return the output path

Print the absolute path to the rendered HTML. Do not invoke `open` — the caller decides whether to.

## What this skill does NOT do

- Research, content compilation, dimension selection — the caller owns these.
- Open the resulting file in a browser — the caller decides.
- Iterate on the report after the first pass — the caller (or the user) drives iteration by re-invoking with adjusted content or a different language.
