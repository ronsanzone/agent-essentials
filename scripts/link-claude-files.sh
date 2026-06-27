#!/usr/bin/env bash
# Compatibility shim for the old installer name.
# The old behavior linked package-owned .claude entries into ~/.claude, which
# could pull local secrets/runtime files back into this repo. Use the safe
# installer instead.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "WARN: scripts/link-claude-files.sh is deprecated; running scripts/install-claude.sh" >&2
exec "$SCRIPT_DIR/install-claude.sh" "$@"
