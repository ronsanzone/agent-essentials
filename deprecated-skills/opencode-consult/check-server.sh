#!/bin/bash
# ensure-server.sh — Verify the opencode web server is running.
# The server is managed by a system launch process, not this script.
# Usage: ensure-server.sh [port]
# Returns: The server URL on stdout, or exits 1 if not running.

PORT="${1:-4096}"
URL="http://localhost:$PORT"

if curl -s --max-time 2 "$URL" >/dev/null 2>&1; then
  echo "$URL"
else
  echo "ERROR: opencode server is not running on port $PORT" >&2
  echo "The server should be started by the system launch process." >&2
  exit 1
fi
