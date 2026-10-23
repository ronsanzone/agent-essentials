---
name: rex
description: "Control Rex (Superlogical's terminal multiplexer) from inside it: split panes without stealing focus, run commands or other coding agents (Claude Code, pi, opencode) in them, send input, read output, and wait for exit or agent status. Use when the user mentions Rex or asks to \"open a pane\", \"run this in a split\", \"start another agent in Rex\", \"watch that pane\". Do not use merely because a task could benefit from a background terminal. Requires REX_BLOCK to be set."
---

# Rex

Rex organizes terminals into sessions, windows (tabs), and blocks (panes). The `rex` CLI talks to the running server and acts on the caller's session by default.

Before any control command, verify this agent runs inside a Rex terminal:

```bash
test -n "${REX_BLOCK:-}"
```

If it fails, say you are not inside Rex and stop. When it passes, `REX_SESSION`, `REX_BLOCK` (your own pane) and `REX_SERVER` are set and `rex` is on `PATH`.

## Learn the CLI

The binary is the authority: `rex --help`, `rex <cmd> --help`, `rex block --help`, `rex window --help`. Block methods: `rex block inspect <block> --json | jq '.api.methods | keys'` (positional target, no `-b`). Server API: `rex api list`. Bare `rex` attaches the TUI; don't run it.

## Targets and IDs

- IDs: `session:…`, `window:…`, `block:…`. Listings show the last 6 chars; any unique suffix of 4+ chars works.
- `-b` resolves full ID, then case-insensitive label, then position, then ID suffix.
- Every new pane is labeled `shell` unless you pass `--label`, so `-b shell` is ambiguous: exit 3 and nothing happens. Exit 3 also means "not found".
- Save `.block_ids[0]` from `--json` output and use it. Labels are fine for interactive one-offs; give them a unique `--label`.
- Exit codes: 0 ok, 1 failed, 2 bad CLI, 3 target not found/ambiguous, 4 server unreachable. `rex wait` and `--wait` return the child's exit status instead.

Discover state:

```bash
rex ls                       # sessions
rex window ls                # windows in this session (ACTIVE = where the user is)
rex block ls                 # panes in this session; add --json for full IDs
rex block call -b <block> process | jq .foreground.name   # zsh = shell at prompt
```

## Create a pane (never steal focus)

Always pass `-b "$REX_BLOCK"`. Without it, `rex split` anchors on the *focused* block, which may be the user's pane in another window. Always pass `--focus=false`.

```bash
B=$(rex split -b "$REX_BLOCK" --split=below --label review --focus=false --cwd "$PWD" --json | jq -r '.block_ids[0]')
```

- `--split right|left|above|below` (default `right`), `--ratio PCT`. Split wide panes right, tall/narrow panes below.
- No `-- COMMAND` gives an interactive shell. With `-- COMMAND` the command runs through your login env without a shell, so use `-- sh -c 'a && b'` for pipes.
- **Use `--keep-open` whenever you will read output.** Without it a command that exits 0 closes its pane and the output is gone (capture then exits 3). A nonzero exit leaves the pane open.
- New window (tab) instead of a split: `rex run --label X --focus=false --keep-open --json -- cmd` gives `.window_id` and `.block_ids[0]`.

## Run an ordinary command and wait for it

```bash
B=$(rex split -b "$REX_BLOCK" --label tests --focus=false --keep-open --json -- sh -c 'just test' | jq -r '.block_ids[0]')
rex wait --for 10m "$B"; echo "exit=$?"     # child's exit status; works with --keep-open
rex capture -b "$B" --trim | tail -n 120
```

`rex wait --for` timing out exits 1, same as a child exiting 1. Check the pane if that matters. Blocking one-liner: `rex split ... --keep-open --wait -- cmd` returns the exit status.

## Send input

```bash
rex send -b "$B" 'npm test'; rex send-key -b "$B" enter   # default: text, then Enter
rex send -b "$B" $'npm test\n'                            # or a real newline via $'...'
printf 'y\n' | rex send -b "$B"                           # or stdin
rex send-key -b "$B" ctrl+c                               # keys: enter, esc, ctrl+c, shift+left...
```

- `rex send -b X 'cmd\n'` types a literal backslash-n; single quotes don't make a newline.
- `rex send` never presses Enter. Prefer separate `send` + `send-key enter` for agent TUIs.
- Always pass `-b`. Without it, `send` types into your own pane.

## Read output

```bash
rex capture -b "$B" --trim | tail -n 120     # text; --unwrap joins soft wraps
rex capture -b "$B" --format html            # keep colors (or --format vt)
```

`capture` returns the full scrollback (20k+ lines), not just the screen, so always `tail`. Full-screen TUIs on the alternate screen only show the current screen; if a long answer is cut off, ask the agent to write it to a temp file and reply with the path.

Wait for specific output (replaces herdr `pane wait-output`). Match a whole line with `grep -x`, or the echoed command line itself will match:

```bash
end=$((SECONDS+120)); until rex capture -b "$B" | grep -qx 'READY'; do [ $SECONDS -ge $end ] && { echo timeout; break; }; sleep 1; done
```

## Agent status (OSC 7501 Program Status)

Claude Code (2.1.296+), opencode v2, and pi (via extension) report `idle`, `working`, `done`, `blocked`, `error` per pane. Read it:

```bash
rex block call -b "$B" program_status
# {"records":[{"state":"done","app":"claude-code","effective_app":"claude-code","updated_at":"…","owner":{…}}]}
```

- The root record is the one without `id`. No records = nothing reported yet.
- `idle`/`done` = ready for input; `blocked` = waiting on an approval or question (inspect and ask the user before answering); `error` = failed.
- `done` and `error` persist across prompts and process exit, so a stale `done` from the last turn looks finished. Compare `updated_at` against a baseline taken before you send.
- `claude -p` reports nothing while running and leaves `idle` (no `app`) on exit. For headless runs use `rex wait` instead.
- Alternative: `rex api call --session "$REX_SESSION" com.superlogical.terminal.program_status '{"block_id":"block:…"}'` (needs `--session` and a full ID, no labels).

Helpers (paste into one Bash call):

```bash
st() { rex block call -b "$1" program_status | jq -c '[.records[] | select(.id == null)][0] // {}'; }
wait_ready() {  # wait_ready BLOCK BASELINE_UPDATED_AT [TIMEOUT_S]
  local b=$1 base=$2 end=$((SECONDS+${3:-600})) s
  while :; do
    s=$(st "$b")
    [ "$(jq -r '.updated_at // ""' <<<"$s")" != "$base" ] && jq -e '.state | IN("idle","done","blocked","error")' <<<"$s" >/dev/null && { echo "$s"; return 0; }
    [ $SECONDS -ge $end ] && { echo "timeout: $s"; return 1; }
    sleep 2
  done
}
```

## Start and coordinate an interactive agent

Run the agent in a shell pane (not `-- claude`), so the pane survives the agent exiting and you can read it after:

```bash
B=$(rex split -b "$REX_BLOCK" --label reviewer --focus=false --cwd "$PWD" --json | jq -r '.block_ids[0]')
base=$(st "$B" | jq -r '.updated_at // ""')
rex send -b "$B" 'claude'; rex send-key -b "$B" enter          # or: pi, opencode
wait_ready "$B" "$base" 60                                     # startup -> idle

base=$(st "$B" | jq -r '.updated_at // ""')
rex send -b "$B" 'Review the current diff; report only actionable findings.'; rex send-key -b "$B" enter
wait_ready "$B" "$base" 1800                                   # turn -> done/idle/blocked
rex capture -b "$B" --trim | tail -n 120
```

Headless one-shot:

```bash
B=$(rex split -b "$REX_BLOCK" --label ask --focus=false --keep-open --json -- claude -p 'say ok' | jq -r '.block_ids[0]')
rex wait --for 10m "$B" && rex capture -b "$B" --trim
```

If `wait_ready` times out or returns `blocked`, `capture` the pane before sending anything. A timeout does not prove the prompt was lost; don't resend blindly.

Streaming alternative: `rex events -s "$REX_SESSION" --json` emits `program_status_changed` per block:

```bash
rex events -s "$REX_SESSION" --json | jq --unbuffered -c --arg b "$B" \
  'select(.payload.event.payload.name? == "program_status_changed" and .payload.event.payload.block_id == $b) | .payload.event.payload.payload.record.state'
```

Agent overview for this session:

```bash
rex block ls --json | jq -r '.blocks[] | "\(.block_id) \(.label)"' | while read -r b l; do
  printf '%s %-20s %s\n' "${b: -6}" "$l" "$(rex block call -b "$b" program_status | jq -r '[.records[] | select(.id == null)][0] | "\(.state // "-") \(.effective_app // "")"')"; done
```

## Close and layout

```bash
rex block close "$B"            # one or more blocks
rex window close "$W"           # a window and all its blocks
rex zoom -b "$B" --on           # or --off; only when the user wants to look
```

## Safety rules

- `--focus=false` and `-b "$REX_BLOCK"` on every split. Never `rex focus` unless the user asks.
- Only send to, close, or zoom panes you created. Reading status and capture of others is fine.
- Close what you created when done; verify with `rex block ls`.
- Never `rex kill`, `rex server stop`, or `rex session` mutations unless the user explicitly asks.
