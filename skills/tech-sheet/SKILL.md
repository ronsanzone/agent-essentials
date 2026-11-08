---
name: tech-sheet
description: Make printable technical explainers as dense, flat, figure-led A4 sheets — claim headings over numbered paragraphs, Leroy-lettered line drawings and schematics, ruled tables, an optional note margin, and two restrained inks (blue for a figure's subject, red for faults) that still read in grayscale. Use when someone wants a technical explainer, spec sheet, design or resiliency write-up, or one-pager they can print, read closely and annotate by hand, or asks for "a tech sheet", "handbook-style", "NASA-style" or "vintage engineering paperwork" documentation of a real system, codebase or product.
---

# Tech sheet

Makes printable technical documents about real systems: one sheet per section, each section built around one idea, explained with heavy, exact line drawings and short numbered paragraphs. The look borrows from 1960s engineering paperwork: a typed serif body, Leroy-lettered drawings, ruled tables. It is a style, not a costume. Leave out everything that only makes a page look like a historical document.

Two finished sheets ship with the skill. Look at them before you start; they are the bar:
- `assets/examples/data-movement.png` (+ `.html`): a block diagram with a blue transaction boundary, a crash timeline with one red aborted transaction and a DETAIL inset, a margin caution and procedure, one row with an empty margin, and a wide per-tier table.
- `assets/examples/failure-modes.png` (+ `.html`): one figure, one wide 15-row table with red row markers, margin notes for a procedure and for sources, and no small data table.

## Resource paths

Relative to this skill's directory:

- `assets/template.html`: every style, the shared SVG markers and patterns, and one skeleton of each block. Start every document from it.
- `assets/fonts/`: Routed Gothic (Leroy lettering), Letter Gothic and their licences. Copy the folder next to the document.
- `scripts/render.sh`: renders the PDF with headless Chrome (131 or newer, for `@page` margin boxes).
- `scripts/check.py`: page count and size, colours against the palette, fonts, a colour and a grayscale preview per page, and 300 dpi review tiles.
- `references/style-guide.md`: blocks, the margin test, typography, writing, figures, the two inks, multi-section documents and pitfalls. Read it in full for your first document in a session.
- `references/svg-parts.md`: copy-paste drawing parts (boxes, drums, wires, breakers, callouts, dimensions, timelines, sequence strips, valves, gauges, charts, two-ink parts).

## Workflow

1. **Find each section's one idea and check every number.** The idea is the sentence the reader must leave with ("a document is in exactly one collection at every commit"). Read the spec, the README and the code. Grep every number you intend to print (limits, sizes, intervals, retries, UI strings), and prefer the code when the docs disagree. Note where each fact came from, and note what you could not verify.

2. **Plan the sections.** For each one, write the claim headings first, then choose one or two figures (style guide §6). Then decide the other blocks: a table only for values a reader looks up, a notice only for a real risk, a procedure only if the section has a task. Apply the margin test (style guide §3) to every candidate note. Most rows have an empty margin.

3. **Set up the folder.** Use the folder the user names, otherwise a new one in the working directory:
   ```sh
   mkdir -p <out> && cp <skill>/assets/template.html <out>/<name>.html && cp -R <skill>/assets/fonts <out>/fonts
   ```

4. **Write.** Fill the running head, the footer provenance and the title block. Draw the figures from `svg-parts.md` parts in millimetre coordinates, using the template's classes and `nh-*` markers.

5. **Render and check.**
   ```sh
   sh <skill>/scripts/render.sh <out>/<name>.html
   uv run --no-project --with pymupdf python <skill>/scripts/check.py <out>/<name>.pdf --pages N --out <tiles dir>
   ```
   `check.py` must report the page count you planned and `palette only`. Open every preview, the grayscale ones included, and every tile. Look for:
   - a line or leader crossing or touching text (keep 0.6 mm clear)
   - labels touching each other or a box edge
   - a clipped word, or an orphan heading at a sheet's foot
   - a pattern or ink used with two meanings
   - a coloured element that disappears in grayscale
   - a section that spilled onto a sheet of its own

   Fix them, then render and check again. Most of the quality comes from this loop; expect three to six passes.

6. **Deliver.** Give the PDF path and say what each section explains. List the files you checked numbers against, and anything simplified or unverified.

## What makes it look right

- **Structure, not costume.** The style lives in numbered paragraphs, claim headings, line drawings and ruled tables. Leave out document numbers, part names, thumb tabs, figure art codes, change bars, form-style dated footers and role tags. Equally, leave out cards, rounded boxes, tinted backgrounds and stat tiles.
- **One idea per section, shown in its figure.** Everything else on the sheet supports it.
- **Headings state the claim.** "A WRITE IS DURABLE IN THE LOG; A READ GOES TO S3.", not "FUNCTIONAL DESCRIPTION."
- **Blocks only when the content needs them.** There are no fixed slots. A sheet without a table or a procedure is normal.
- **The margin is quiet.** It is always there and is mostly blank: it is the reader's handwriting space. A note goes there only when it passes the margin test, and it never restates the text.
- **Two inks, sparingly.** Blue for the one subject of a figure, red for faults. Each coloured part is also heavier or patterned, so a grayscale print still reads.
- **Flat, exact voice.** Third person, present tense, numbers with units, names quoted exactly.
- **Text is never crossed by a line.** Move a label rather than shrink it.
- **Truth first.** A precise-looking sheet with a wrong number is worse than one row fewer.

## Requirements

- Google Chrome or Chromium 131+, for `render.sh` (set `CHROME=/path` if it isn't found).
- `uv` (or a Python with `pymupdf`), for `check.py`.
- Iowan Old Style ships with macOS. Elsewhere the body falls back to Georgia, which is acceptable. Helvetica Neue (or Arial) supplies the flagged "1" in drawing labels.
