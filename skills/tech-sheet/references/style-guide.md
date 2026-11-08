# Style guide: the tech sheet

How a sheet is built, written and drawn. The examples in `assets/examples/` follow every rule here; open the PNGs beside this file.

## Contents

1. The style
2. Sheets and pages
3. Blocks and the margin test
4. Typography
5. Writing
6. Figures
7. Two inks
8. Multi-section documents
9. Pitfalls already paid for

## 1. The style

Dense, flat, print-first technical writing. Short numbered paragraphs carry a narrative, and line drawings carry most of the explanation. It borrows the look of 1960s engineering paperwork: typed serif text, Leroy-lettered drawings, ruled tables, an underlined mechanism heading. It does not borrow the furniture. Nothing on the sheet is there to look historical.

Leave out:
- document numbers, part names ("SYSTEMS DATA"), section openers for sections that don't exist, thumb tabs, figure art codes, change bars without a revision, form-style footers (Mission, Basic Date) and role tags on procedures
- texture: stains, scan noise, stamps, insignia
- web-report styling: cards, rounded boxes, tinted panels, stat tiles, coloured pills, system sans

The test: every mark helps the reader understand or act on the subject.

## 2. Sheets and pages

A4, with the margins and running head and foot set in the template's `@page` rule:
- **Running head:** document title on the left, subtitle and date on the right, over a rule.
- **Running foot:** provenance on the left ("Code read at mms 9e77c72, ..."), and the page number on the right.
- **Title block:** on the first sheet only. Title in caps, then two or three sentences on what the document explains and what it was checked against.
- **Sections start a new sheet** (`.sec`), so each sheet can be printed and handed over alone.
- **A section may take a second sheet** when it is dense or hard to convey. Start the second sheet with a `<div class="sheet"></div>` before its first block, so the break falls between ideas, not mid-thought. Don't use one for a block that merely spilled.
- **Fit by cutting repetition, never content.** If a section runs a few millimetres over, look for a margin note that repeats the text, a table row that repeats a figure, or a sentence that restates the heading. If nothing repeats, take the second sheet.

Rows, figures and tables don't split across sheets (`break-inside: avoid`). A block that doesn't fit moves whole to the next sheet, which can leave a gap; fix that by planning, not by shrinking type.

## 3. Blocks and the margin test

Use only the blocks the content needs; there are no fixed slots.

| Block | Use when | Markup |
|---|---|---|
| Numbered row | Always: the narrative. Two to six sentences each. | `.row` with `.num`, `.txt`, `aside` |
| Mechanism | One rule or formula behind the section, stated in two lines | `h3` (underlined) in a row numbered `N.x.1` |
| Figure | The section's idea, or how it behaves over time or in detail | `figure`, full width |
| Table | Values a reader looks up, or a comparison with three or more columns | `.tcap` then `table`, full width |
| Notice | A real risk: CAUTION protects data or the system, NOTE is a fact the reader would otherwise get wrong | `aside` with `h4.tag` (add `.note` for NOTE) |
| Procedure | The section has a task: set it up, verify it, triage it | `ol.proc`, in the margin or in a row |
| Key numbers | Several limits the reader will want together that the text and figures don't already show | `aside` with `dl` |

**The margin test.** A note goes in the margin only if the reader needs it while reading that paragraph, and putting it inline would break the paragraph's flow. That admits:
- a caution or note tied to the paragraph
- where a claim comes from, when it isn't the code ("measured in test, not production"; "unmerged branch")
- the section's own short procedure
- key numbers that appear nowhere else on the sheet

It rules out:
- restating the paragraph or its figure
- a key-numbers list by default
- a procedure invented to fill space
- more than one notice per section

Most rows have an empty `aside`. The empty margin is the reader's handwriting space and is part of the design.

## 4. Typography

| Role | Face | Size | Notes |
|---|---|---|---|
| Body, captions, tables, notes | Iowan Old Style (Georgia fallback) | 8.6 pt / 1.42, tables 7.1–7.3 pt, margin 7.2 pt | Normal spacing (0.01em). Sentence case. |
| Section title (`h1`) | same, caps | 10 pt, tracked 0.14em | `5 · COLD COLLECTION STORAGE` |
| Claim heading (`h2`) | same, caps | 8.6 pt, tracked 0.07em | Ends with a period. |
| Mechanism (`h3`) | same, mixed case, underlined | 8.6 pt | `Read Ticket Budget.` |
| Labels inside drawings | Routed Gothic Narrow (Leroy), caps | 2.05–2.5 mm | Callouts 2.35, secondary lines 2.05, view titles 2.5 (regular width). |
| Procedures | Letter Gothic | 7.6 pt, margin 6.6 pt | Only procedures, so the face means "do these steps". |

Leroy's plain "1" reads as "I"; the template swaps U+0031 for a flagged 1. All caps is right for headings, drawing labels and named controls.

## 5. Writing

- **Voice:** third person, present tense, declarative, one fact per sentence where possible. No marketing words, no exclamation marks, no second person outside procedures.
- **Claim headings:** each `h2` is the sentence the paragraph proves ("EACH RUN LOOPS UNTIL NOTHING OLD IS LEFT."). Read the headings of a section in order: they should summarise it.
- **Numbers carry units,** taken from the code: "every 60 sec", "512 KB", "w:majority". Quote UI strings and error names exactly. Name controls and fields as the system names them.
- **References** are lowercase in text, "(figure 2-1)", "(table 6-1)". Captions read `Figure 2-1.` then Title Case; table captions sit above the table.
- **Tables:** values don't wrap (`td.v`). Prefer one wide comparison table (a column per tier) to a two-column list of compound values like "512 KB / 1 MiB / 2 MiB".
- **Notices:** three lines at most. CAUTION's tag is red, NOTE's is black.
- **Procedures:** numbered steps `CONTROL - action`, with the control or field as the system names it and the action in lowercase. Verification lines start with `√`, are indented and carry no number. Spell words out; no abbreviations ("repeat from 2", not "rpt"). In the margin, keep lines to 28 characters or fewer.
- **Sources:** name the files you read in the footer or in your reply. Anything inferred, measured outside production or on an unmerged branch is said so beside it, in the margin.

## 6. Figures

One or two per section. The first draws the section's idea; the second shows how it behaves over time or in detail, optionally with a DETAIL inset on its right behind a thin vertical rule. Figures span the full 179 mm (text column plus margin): `viewBox="0 0 180 H"`, where H is the height in mm, typically 45–72.

| Subject | First figure | Good second figures |
|---|---|---|
| Software or system architecture | Block diagram: dashed panels for process or trust boundaries, drums for storage, boxes for components, labelled wires | Timeline, sequence detail, state diagram |
| Process over time | Timeline: lanes, a clock axis, events as dashed verticals | Sequence detail, state table |
| Protocol | Sequence diagram | Message or byte layout strip |
| Failure handling | Nested containment boundaries, or a fault timeline | Failure-mode table |
| Control or electrical system | Schematic: breakers, switches, bus bars, terminals | Panel layout |
| Physical device | Side elevation with callouts, dimensions and a section view | Functional schematic |

Software maps onto these symbols cleanly: storage as drums, runtimes and boundaries as dashed panels with the name small at top left, data flow as wires with arrowheads named in small caps on the wire, fan-out as a vertical bus with junction dots.

**Line weights** (mm on paper; the template's classes encode them):

| Line | Width | Class |
|---|---|---|
| Object or box outline | 0.42–0.45 | `.o`, `.of`, `.box` |
| Wire | 0.30 | `.w`, `.wa` |
| Subject or fault path | 0.50, coloured | `.wa.sub`, `.wa.acc` |
| Section cut | 0.50, long-short dash | `.cut` |
| Thin detail, extension lines | 0.17 | `.t` |
| Leaders and dimension lines | 0.16 | `.ld`, `.dim` |
| Hidden line, boundary | 0.22–0.30, dashed | `.hid`, `.panel` |

Arrowheads are small (2.1 × 1.05 mm for leaders, 2.4 × 1.3 mm for wires). Use the template's markers; default SVG markers come out several millimetres long.

**Labels.** Every label is Leroy caps. Name what the text mentions plus what a curious reader would point at; twelve to fourteen callouts is the ceiling. No line ever crosses text: start a leader at least 0.6 mm outside its label and run it straight to the part. Leaders may cross object lines, but never other labels, leaders or dimension lines; swap labels when two leaders would cross. Don't shrink a label below 2.05 mm; move it or drop it. Group labels in calm rows and align their left edges.

**Dimensions:** thin extension lines, a dimension line with an arrowhead only at each extension line, and the value centred in a gap in the line. Vertical values read bottom to top.

**Schematics:** dashed panel boundaries, junction dots where wires join and none where they only cross, arrows in the direction of data or signal.

**Patterns, one meaning each per document:** 45° hatch for one category (cold storage, cut faces), plain outline for present or running, dotted outline for absent or pending, stipple for granular fill. Explain each in a small legend unless it is labelled in place.

**Space:** let panels breathe 2–3 mm inside their border. When a part must rise above the first row, start the viewBox at a negative y rather than pushing everything down.

## 7. Two inks

Black does nearly all the work. Two inks add emphasis:
- **Blue (`--sub`)** marks the one subject of a figure: the path, boundary or box the figure is about. At most one blue subject per figure. A figure may have no colour at all.
- **Red (`--acc`)** marks faults, defects and failure states, and the CAUTION tag. Nothing else. Red on a normal path reads as an error.

Rules:
- Colour only strokes of 0.3 mm or more, hatch lines, markers, row markers (`●`) and notice tags.
- Never use area tints, coloured body text or coloured labels. Printers halftone tints into dots.
- Every coloured element also differs in weight or pattern from its black neighbours (0.5 vs 0.3 wires, 0.7 box outline, hatch fill), so a grayscale print keeps every distinction. Check the grayscale previews from `check.py`.
- `check.py` fails on any colour outside black, white and the two inks.

## 8. Multi-section documents

- One HTML file. Sections are `<section class="sec sN">`, numbered 1, 2, 3; paragraphs `N.1`, `N.2`, `N.2.1`; figures and tables `Figure N-1`, `Table N-1`.
- Prefix every element id with its section (`s2-steps`) and every `getElementById` to match. Figure scripts repeat shapes across sections, and duplicate ids silently draw into the wrong figure.
- Scope per-section CSS with the section class (`.s6 table.fmea`).
- The running head can't carry the section name (see §9). The section title at the top of each sheet does that job.

## 9. Pitfalls already paid for

- **`string-set` is ignored by Chrome,** so `string()` in a margin box drops the whole declaration. Keep the running head fixed text.
- **`var()` in SVG presentation attributes** doesn't work: `fill="var(--paper)"` fails. Use a class or `style="fill: var(--paper)"`.
- **Markers:** `markerUnits="userSpaceOnUse"` with explicit small sizes. For dimension lines, put the marker only at the extension-line end (`marker-start` on each half of a split line).
- **Marker colour:** a marker's fill is fixed where it is defined, so a coloured wire needs a coloured marker (`nh-arrow-sub`, `nh-arrow-acc`).
- **Local fonts:** Chrome needs `--allow-file-access-from-files` (in `render.sh`), and the fonts folder must sit next to the HTML.
- **Glyph coverage:** Routed Gothic lacks `≤ − ≈`, and Iowan lacks `●`. They fall back to Helvetica and Georgia, which look fine at these sizes.
- **Screenshots only show page 1** of a flowing document. Use `check.py`'s per-page previews.

Fonts: Routed Gothic, traced from a Leroy template (SIL OFL 1.1); Letter Gothic Code, a modified URW Letter Gothic (Aladdin Free Public License). Licences are in `assets/fonts/`.

Derived from the `nasa-handbook` skill in github.com/R44VC0RP/skills (commit e6f8682): its drawing classes, markers, SVG parts, fonts and review loop.
