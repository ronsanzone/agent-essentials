# Design Languages

A design language is a steering brief that locks the brand stack (fonts, anchor palette, anti-patterns) for a class of reports while leaving composition free. Two reports in the same language should feel like two articles in the same publication: visibly the same voice, visibly not xeroxed.

Languages are self-contained HTML styleguides (`<name>.html`) — opening one in a browser shows you the language at full scale, with every component rendered and contract-annotated. A renderer reads the file and copies selectors verbatim.

## Available

| Language | When to pick | Status |
|----------|-------------|--------|
| `editorial-parchment` | Ramp-up tours, PR review tours, operator reference docs. Engineer-internal audience reading sequentially for 20+ minutes. Warm parchment + Fraunces serif + Geist sans + teal/terracotta accents. | Shipped |
| `flexoki-ink` | Dark long-form prose. Warm-grey neutrals never go cold; even the dark background is brown-black. IBM Plex Sans + IBM Plex Mono. Cyan + magenta accents. Right for evening reading of technical writing. | Shipped |
| `tokyo-night-moon` | Dense developer docs in a cosmic-dark mono register. Fira Code throughout — body, headings, code — with code-as-content conceit (`function()` style labels, `<>` brackets on emphasis). | Shipped |
| `anthropic-research` | Academic / research-paper register. Source Serif Pro throughout, single orange accent used sparingly, narrow text column, generous margins. Right for AI-safety papers, methodology writeups, technical preprints. | Shipped |
| `kanagawa-wave` | Artisanal technical documentation, dark variant. Noto Serif JP + crystal-blue + wave-aqua. Brushstroke arrows, wave-pattern fills, asymmetric box corners — Japanese woodblock motifs throughout. Right for slow, thoughtful technical writing. | Shipped |
| `kanagawa-dragon` | Like `kanagawa-wave` but warmer and more dramatic. Crimson Pro + surimi-orange + sakura-pink. Octagonal diagram nodes, sumi-slash arrows, dragon-scale patterns. Right for narrative-driven technical writing with dramatic tension. | Shipped |
| `cyber-matrix` | Hacker-terminal manifesto register. IBM Plex Mono only, pure black background, matrix green. ASCII-art diagrams drawn with Unicode box-drawing characters. Right for security writeups, terminal-tool docs, manifesto-style prose. | Shipped |
| `synthwave-outrun` | Bold 80s retro-futurist editorial. Sunset gradient hero, Audiowide chrome display, perspective grid diagrams, neon glow. Right for entertainment content, music editorial, nostalgia-themed product launches. | Shipped |
| `synthwave-vapor` | Vaporwave's softer cousin to outrun. VT323 pixel display, CRT scanline overlays, pink-soft/cyan-soft palette, blur-halo diagrams. Right for dreamy/melancholy retro content. | Shipped |
| `stripe-docs` | Premium developer-docs feel. White background, Inter + IBM Plex Mono, link-blue accent. API-reference-card diagrams with HTTP method pills embedded in nodes. Right for API documentation, technical references, integration guides. | Shipped |
| `stripe-blog` | Premium long-form tech editorial. Source Serif Pro body + Inter display, single purple accent, narrow 640px column, Roman-numeral step counters. Right for thoughtful blog posts and opinion essays in a premium tech voice. | Shipped |
| `newsprint-broadsheet` | NYT-style broadsheet print authority. Playfair Display + Georgia + Oswald, NYT red flags, cross-hatch SVG infographic diagrams. Right for annual reports, long-form journalism, historical or financial disclosures. | Shipped |
| `brutalist-terminal` | Dark terminal brutalism. IBM Plex Mono only, native terminal-green links, ASCII diagrams. Section markers (`[BEGIN]` / `[END]`), `>>>` heading prefixes. Right for personal developer manifestos and tool-for-tools documentation. | Shipped |
| `brutalist-print` | Typewriter-manuscript brutalism. Courier Prime headings + Spectral body, single ink-blue accent, em-dash row dividers, geometry-not-color alarm signaling. Right for the "this was typed, not designed" register — research notes, anti-marketing technical essays. | Shipped |
| `field-report` | Outcomes-forward reports, postmortems, journey narratives. Newsreader serif body, burnt-clay accent, 4-column named-grid with named asides. | Planned |
| `library-doc` | Scholarly technical docs. Playfair Display + Source Sans + saddle-brown + fixed sidebar. | Planned |

Rejected variations from the candidate round are preserved under `_extra-languages/` for future reference — open `_extra-languages/_picker.html` to revisit the candidate gallery.

## Selection heuristic

If the caller did not specify a `design-language`, fall back using audience:

| Audience signal | Default language | Why |
|-----------------|------------------|-----|
| `engineer-internal-ramp-up` | `editorial-parchment` | Long sequential reading at 20+ minutes; parchment + Fraunces is the calm, durable default. |
| `engineer-internal-pr-review` | `editorial-parchment` | Same dense citation register; `file:line` density wants the parchment chrome. |
| `engineer-internal-dark` | `tokyo-night-moon` | Engineer audience that signals a dark-mode preference; mono-led cosmic dark with code-as-content conceit. |
| `engineer-api-reference` | `stripe-docs` | API/SDK documentation with method-pill diagrams and angular wiring connectors. |
| `engineer-prose-evening` | `flexoki-ink` | Dark long-form prose, warm-grey neutrals, IBM Plex pairing. |
| `researcher-academic` | `anthropic-research` | Methodology, safety papers, preprints — narrow column, Source Serif, single accent. |
| `stakeholder-external-editorial` | `stripe-blog` | Premium tech editorial voice for external audiences. |
| `stakeholder-external-broadsheet` | `newsprint-broadsheet` | Annual-report or formal-disclosure register with broadsheet authority. |
| `narrative-artisanal` | `kanagawa-wave` | Slow, thoughtful, woodblock-inspired technical writing. |
| `narrative-dramatic` | `kanagawa-dragon` | Same vocabulary as `kanagawa-wave` but warmer and more emphatic. |
| `manifesto-terminal` | `cyber-matrix` or `brutalist-terminal` | Hacker-terminal voice; pick `cyber-matrix` for the more saturated neon register and `brutalist-terminal` for the more austere ASCII-only register. |
| `manifesto-print` | `brutalist-print` | "Typed, not designed" voice — anti-marketing technical essays. |
| `entertainment-retro` | `synthwave-outrun` (bold) or `synthwave-vapor` (soft) | Music editorial, nostalgia content, retro product launches. |
| `stakeholder-external` (generic) | `stripe-blog` | Fallback for unspecified external audiences. |

When in doubt, the default-default is `editorial-parchment` — it is the most range-capable language and handles every audience without offending any of them.

## Adding a new language

1. Decide on a name and what audience it serves.
2. Copy an existing language as a starting template (`editorial-parchment.html` is the canonical shape reference).
3. Write `design-languages/<name>.html` as a self-contained styleguide that itself renders in the new language. The file should include:
   - All 7 canonical sections (Hero → Personality → When to pick → Locked brand stack → Anchor palette → Anti-patterns → Component gallery → Diagram philosophy)
   - The full swatch grid with every brand hex code
   - All 12 components in the gallery, each with a visible `LOCKED` / `FREE` contract aside
   - At least 2 SVG diagrams, including a sequence diagram with an alert region
   - The verbatim scroll-spy JS and locked structural-shell plumbing
4. Add a row to the **Available** table above and update the **Selection heuristic** if any audience should default to the new language.
5. No changes needed in `SKILL.md` or any file under `references/`.

**Constraints inherited from `references/structural-shell.md`** (you don't redefine these, but you can't override them either):

- Layout container geometry: `max-width: 1280px; margin: 0 auto; padding: 0 48px;`
- Breakpoint at `980px` for single-column collapse
- Scroll-spy JS, sticky-TOC HTML, skip-link, progress-bar wiring, marginalia absolute-positioning at `left: -64px ±8px`

If your language needs a different layout grid (e.g. a 4-column named-grid with named asides like the planned `field-report`), use the `--grid-template` CSS variable seam — don't fight the structural shell.

**Diagram-kit token contract:** the generic SVG style block uses `var(--accent)` / `var(--accent-soft)` / `var(--secondary)` / `var(--secondary-soft)`. Either alias these to your language's concrete palette tokens or rewrite the role classes with your concrete tokens. See `references/diagram-kit.md` for details. Languages are free to extend or replace the diagram vocabulary entirely — see `cyber-matrix` (ASCII boxes), `kanagawa-wave` (brushstroke arrows), `synthwave-outrun` (perspective grids) for examples of language-specific diagram dialects within the shared role taxonomy.
