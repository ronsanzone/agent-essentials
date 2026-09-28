#!/usr/bin/env bash
# Install the OpenCode plugins this repo owns.
#
# Model: config/opencode/plugins.txt is the canonical list. For each spec in
# it, run `opencode plugin add <spec>` (idempotent — already-installed plugins
# are skipped), so a fresh machine converges and edits here stay live.
#
#   opencode-vim -> ~/.config/opencode (managed by opencode itself)
#
# Plugins installed outside this list (by hand, other repos) are never touched.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/install-opencode-plugins.sh [options]

Options:
  --dry-run       Print planned actions without installing anything.
  --update        Also run `opencode plugin update` on every listed plugin.
  --bin PATH      opencode binary to use (default: opencode).
  -h, --help      Show this help.
EOF
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_LIST="$ROOT/config/opencode/plugins.txt"
OPENCODE_BIN="opencode"
DRY_RUN=0
UPDATE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --update) UPDATE=1; shift ;;
    --bin)
      [[ $# -ge 2 && -n "${2:-}" ]] || { echo "missing value after $1" >&2; exit 1; }
      OPENCODE_BIN="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

[[ -f "$PLUGIN_LIST" ]] || { echo "missing $PLUGIN_LIST" >&2; exit 1; }
if ! command -v "$OPENCODE_BIN" >/dev/null 2>&1; then
  # dot runs this on every machine; machines without opencode just skip.
  echo "warn      opencode not found ($OPENCODE_BIN); skipping plugin install" >&2
  exit 0
fi

mapfile -t SPECS < <(grep -Ev '^\s*(#|$)' "$PLUGIN_LIST")
if [[ ${#SPECS[@]} -eq 0 ]]; then
  echo "no plugins listed in $PLUGIN_LIST"
  exit 0
fi

# `opencode plugin list` prints a table ("-  0.0.25  opencode-vim@latest"),
# so match the plugin spec anywhere in the line, not as the whole line.
installed="$("$OPENCODE_BIN" plugin list 2>/dev/null || true)"
have() { grep -qE "(^|[[:space:]])${1%%@*}@|(^|[[:space:]])${1}([[:space:]]|$)" <<<"$installed"; }

for spec in "${SPECS[@]}"; do
  name="${spec%%@*}"
  if have "$name"; then
    echo "ok        $spec (already installed)"
  elif [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] opencode plugin add $spec"
  else
    echo "install   $spec"
    "$OPENCODE_BIN" plugin add "$spec"
  fi
  if [[ "$UPDATE" -eq 1 && "$DRY_RUN" -eq 0 ]]; then
    "$OPENCODE_BIN" plugin update "$spec" || echo "warn      update failed for $spec" >&2
  elif [[ "$UPDATE" -eq 1 ]]; then
    echo "[dry-run] opencode plugin update $spec"
  fi
done

echo "done      (restart the OpenCode TUI to load new plugin versions)"
