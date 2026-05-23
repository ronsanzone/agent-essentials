# Design Languages

A design language is a steering brief that locks the brand stack (fonts, anchor palette, anti-patterns) for a class of reports while leaving composition free. Two reports in the same language should feel like two articles in the same publication: visibly the same voice, visibly not xeroxed.

## Available

| Language | When to pick | Status |
|----------|-------------|--------|
| `editorial-parchment` | Ramp-up tours, PR review tours, operator reference docs. Engineer-internal audience reading sequentially for 20+ minutes. Warm parchment + Fraunces serif + Geist sans + teal/terracotta accents. | Shipped |
| `field-report` | Outcomes-forward reports, postmortems, journey narratives. Newsreader serif body, burnt-clay accent, 4-column named-grid with named asides. | Planned |
| `library-doc` | Scholarly technical docs. Playfair Display + Source Sans + saddle-brown + fixed sidebar. | Planned |

## Selection heuristic

If the caller did not specify a `design-language`, fall back using audience:

| Audience signal | Default language |
|-----------------|------------------|
| `engineer-internal-ramp-up` | `editorial-parchment` |
| `engineer-internal-pr-review` | `editorial-parchment` |
| `stakeholder-external` | `editorial-parchment` (until `field-report` ships) |

Today every audience falls back to `editorial-parchment`. When `field-report` ships, the `stakeholder-external` mapping moves to it.

## Adding a new language

1. Pick 1–2 exemplar reports that already feel like the language.
2. Write `design-languages/<name>.md` following the structure in `editorial-parchment.md`: Personality + Pick/Don't-pick + Locked brand stack + Anchor palette + Anti-patterns + Patterns to draw from + Diagram philosophy (with the 6-role table from `references/diagram-kit.md` filled in) + Exemplar reports.
3. Add a row to the **Available** table above and update the **Selection heuristic** if any audience now defaults to the new language.
4. No changes needed in `SKILL.md` or any file under `references/`.
