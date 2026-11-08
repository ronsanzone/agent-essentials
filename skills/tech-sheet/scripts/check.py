"""Check a rendered tech sheet PDF and cut zoomed tiles for a visual review.

    uv run --no-project --with pymupdf python check.py doc.pdf [--pages N] [--out DIR] [--dpi 300]

Reports page count and size, every colour used, the fonts in the file, and
the paths of the previews and review tiles. Colours other than black, white
and the two inks (--sub blue, --acc red) are flagged: printers halftone
tints and greys into dots.

Each page gets a colour preview and a grayscale preview; the grayscale one
shows whether the two inks still read on a black-and-white printer.

Each page is cut into 8 overlapping tiles (left and right halves of four
horizontal bands) at --dpi, 300 by default, about 12 px per mm. Look at every
tile. Leaders touching text, labels touching boxes and clipped words are a
tenth of a millimetre wide and only show up at this size.
"""

import argparse
import sys
import tempfile
from pathlib import Path

import pymupdf

MM = 72 / 25.4
SIZES = {"A4": (210, 297), "US Letter": (215.9, 279.4)}
# black, white, --sub #1f4f9a, --acc #b02a17 (the template's :root)
PALETTE = [(0, 0, 0), (1, 1, 1), (0.122, 0.31, 0.604), (0.69, 0.165, 0.09)]


def in_palette(c):
    return any(all(abs(a - b) < 0.01 for a, b in zip(c, p)) for p in PALETTE)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--pages", type=int, help="expected page count (reported either way)")
    ap.add_argument("--out", help="folder for the tiles (default: a new temp folder)")
    ap.add_argument("--dpi", type=int, default=300, help="tile resolution")
    args = ap.parse_args()

    doc = pymupdf.open(args.pdf)
    problems = []

    print(f"pages: {doc.page_count}")
    if args.pages and doc.page_count != args.pages:
        problems.append(f"expected {args.pages} page(s), got {doc.page_count}")

    out = Path(args.out) if args.out else Path(tempfile.mkdtemp(prefix="tech-sheet-check-"))
    out.mkdir(parents=True, exist_ok=True)

    for i, page in enumerate(doc):
        w, h = page.rect.width / MM, page.rect.height / MM
        name = next((n for n, (sw, sh) in SIZES.items() if abs(sw - w) < 1 and abs(sh - h) < 1), "custom")
        print(f"page {i + 1}: {w:.1f} x {h:.1f} mm ({name})")

        colours = set()
        for d in page.get_drawings():
            for c in (d.get("fill"), d.get("color")):
                if c:
                    colours.add(tuple(round(v, 3) for v in c))
        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                for span in line["spans"]:
                    v = span["color"]
                    colours.add(tuple(round(x / 255, 3) for x in ((v >> 16) & 255, (v >> 8) & 255, v & 255)))
        tints = sorted(c for c in colours if not in_palette(c))
        print(f"  colours: {len(colours)} ({'palette only' if not tints else 'OFF-PALETTE: ' + str(tints)})")
        if tints:
            problems.append(f"page {i + 1} uses colours outside the palette {tints}; they print as dots")

        fonts = sorted({f[3].split("+")[-1] for f in page.get_fonts()})
        print(f"  fonts: {', '.join(fonts)}")

        page.get_pixmap(dpi=110).save(out / f"p{i + 1}-overview.png")
        page.get_pixmap(dpi=110, colorspace=pymupdf.csGRAY).save(out / f"p{i + 1}-overview-gray.png")
        step = (h - 20) / 4
        for j in range(4):
            top, bottom = j * step, min(h, (j + 1) * step + 20)
            for side, (left, right) in (("left", (0, w / 2 + 10)), ("right", (w / 2 - 10, w))):
                clip = pymupdf.Rect(left * MM, top * MM, right * MM, bottom * MM)
                page.get_pixmap(dpi=args.dpi, clip=clip).save(out / f"p{i + 1}-band{j + 1}-{side}-{top:.0f}-{bottom:.0f}mm.png")

    print(f"tiles: {out}")
    for p in sorted(out.iterdir()):
        print(f"  {p}")
    if problems:
        print("PROBLEMS:")
        for p in problems:
            print(f"  - {p}")
        return 1
    print("ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
