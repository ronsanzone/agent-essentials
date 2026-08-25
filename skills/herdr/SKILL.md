---
name: herdr
description: Control herdr from inside it — list/split panes, spawn agents in sibling panes, read their output, wait for output or agent status. Only when HERDR_ENV=1.
---

# herdr

First check `HERDR_ENV=1`. If it is not set, say you are not inside a herdr-managed pane and stop; never control herdr from outside it.

herdr is a terminal-native agent multiplexer: **workspaces** (project contexts) → **tabs** (subcontexts) → **panes** (real terminals running a shell, agent, server, or log). The `herdr` CLI talks to the running instance over a local socket. `herdr --help` and `herdr <cmd> --help` are the flag reference; the [socket API docs](https://herdr.dev/docs/socket-api/) are the protocol reference. Don't memorise flags — read help when unsure.

## Concepts that bite

- **IDs are live, not durable.** Workspace `1`, tab `1:2`, pane `1-3`. They compact when things close. Re-read with `herdr pane list` / `tab list` / `workspace list` or parse the create/split response; never assume an old `1-3` is the same pane.
- **Agent status** (`agent_status`: `idle` · `working` · `blocked` · `done` · `unknown`) is detected by herdr. `done` = finished and not yet looked at.
- **`pane read` is the past, `wait output` is the future.** Read what is on screen now; wait for the next text you expect. `--source recent-unwrapped` shows the same joined-lines transcript `wait output --source recent` matches against.
- **`--no-focus`** on split / tab create / workspace create keeps your own pane focused. Without `--label`, tabs stay numbered and workspaces take the cwd name.
- JSON on success for list/create/split/wait (`pane split` → `result.pane.pane_id`; `workspace create` → `result.workspace`, `.tab`, `.root_pane`); `pane read` prints text; `send-text` / `send-keys` / `run` print nothing. `wait` exits 1 on timeout.

## Recipes

**Spawn a Claude sub-session and hand it work** (the default for "spin up a pane and have it do X"):

```bash
P=$(herdr pane split "$(herdr pane list | python3 -c 'import sys,json;print([p for p in json.load(sys.stdin)["result"]["panes"] if p.get("focused")][0]["pane_id"])')" --direction right --no-focus | python3 -c 'import sys,json;print(json.load(sys.stdin)["result"]["pane"]["pane_id"])')
herdr pane run "$P" "cd ~/code/worktrees/mms/<branch> && eapclaude --effort high"
herdr wait output "$P" --match ">" --timeout 20000
herdr pane run "$P" "read ~/notes/<project>/<brief>.md and continue from its Next steps"
```

Use `eapclaude --effort high` unless told otherwise; it is the standing default for spawned Claude sessions. For pi: `pi` with the model the user named.

**Run a server or test in a sibling pane and wait for it:**

```bash
herdr pane run "$P" "bazel test //server:lcm_tests"
herdr wait output "$P" --match "PASSED|FAILED" --regex --timeout 600000
herdr pane read "$P" --source recent --lines 40
```

**Read what a neighbor is doing / coordinate:** `herdr pane list`, `herdr pane read 1-1 --source recent --lines 80`, `herdr wait agent-status 1-1 --status done --timeout 120000`.

**Operator-driven QA** (user runs commands in their pane, you read the pane): tell the user the exact commands, `herdr wait output <their-pane> --match <expected>`, then `pane read` and record the transcript as evidence.

**Broadcast the same prompt to several agent panes:** loop `herdr pane run "$p" "<prompt>"` over the pane ids from `pane list`; then `wait agent-status … --status done` on each.

**Tabs/workspaces:** `herdr tab create --workspace 1 --label logs`, `herdr workspace create --cwd <path> --label <name> --no-focus`, `herdr tab focus 1:2`, `herdr pane close 1-3`.

## Rules

- One agent per pane; don't type into a pane whose agent is `working` unless it asked a question.
- Prefer `pane run` (text + Enter) over `send-text` + `send-keys`.
- When the user says "the pane next to this one", list panes and pick by position/cwd, then confirm the id in your reply.
