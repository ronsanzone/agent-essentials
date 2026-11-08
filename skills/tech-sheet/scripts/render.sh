#!/bin/sh
# Render a tech sheet to a vector PDF with headless Chrome.
#   render.sh path/to/doc.html
# Writes doc.pdf next to the HTML. Previews come from check.py (one PNG per page).
set -e
[ -n "$1" ] || { echo "usage: render.sh doc.html" >&2; exit 2; }
DIR=$(cd "$(dirname "$1")" && pwd)
HTML="$DIR/$(basename "$1")"
PDF="${HTML%.html}.pdf"

CHROME=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
if [ ! -x "$CHROME" ]; then
  CHROME=$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser || true)
fi
[ -n "$CHROME" ] || { echo "Chrome or Chromium not found; set CHROME=/path/to/chrome" >&2; exit 1; }

# --allow-file-access-from-files lets the page load ./fonts; the time budget lets
# web fonts and figure scripts settle before printing. @page margin boxes need Chrome 131+.
"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=4000 \
  --no-pdf-header-footer --print-to-pdf="$PDF" "file://$HTML" 2>/dev/null
echo "pdf: $PDF"
