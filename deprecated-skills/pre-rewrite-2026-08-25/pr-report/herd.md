# Herding babysitters

Split the current tab into one pane per PR, each running its own Claude on a `/loop`, each rooted in that PR's worktree. They run as real processes independent of this session — it can end without stopping them. This session keeps its pane and becomes a **supervisor**: it polls their status, surfaces what is stuck, and re-steers.

Requires `HERDR_ENV=1`. Without it, fall back to serialized subagents.

## Why splits and not tabs

**herdr only renders panes in the visible tab.** A babysitter in a background tab returns empty from `pane read`, so the supervisor goes blind and the user cannot watch either. Keeping every babysitter as a split of the current tab keeps them all rendered, readable, and on screen.

Panes get small fast. Past three or four babysitters the Claude TUI has too few rows to be useful — run the rest in a later batch rather than splitting further.

## Identifying the herd

Pane ids compact when panes close, so never persist them. Persist the **worktree path** instead — it is unique per PR and stable for the herd's whole life. At spawn, record the roster to `~/.cache/babysit/herd.json` as `{pr, url, worktree}` entries; on every poll, re-resolve ids by matching panes against it.

A babysitter is a pane whose `agent` is `claude` and whose `cwd` is in the roster. Both halves matter: `agent` filters out plain shells and other agents that happen to sit in the same worktree, and the roster keeps the supervisor itself out of its own herd regardless of which pane the user has focused.

A PR with no worktree has no unique root to run in. Babysit those in this session instead of herding them.

## Spawn

Per selected PR, with `<worktree>` resolved from `headRefName` (see the branch-to-worktree lookup in `babysit-pr`):

```bash
PANE=$(herdr pane split --current --direction right --cwd <worktree> --no-focus \
  | jq -r '.result.pane.pane_id')
herdr pane run "$PANE" "claude --permission-mode auto"
for i in $(seq 45); do
  herdr pane read "$PANE" --source visible --lines 5 | grep -q "auto mode on" && break
  sleep 2
done
herdr pane run "$PANE" "/loop 10m /babysit-pr <url>"
```

Poll with `pane read` rather than `wait output` — `wait output` only matches text that arrives *after* it starts, so it hangs forever on a prompt that is already on screen.

`--no-focus` keeps the user's cursor in the supervisor pane. Split `right` for the first babysitter to open a column, then `down` off that pane for each additional one, so they stack beside the supervisor instead of squeezing it.

Then read the pane back to confirm the loop actually took, rather than sitting at an untouched prompt. A babysitter that silently never started is the failure mode worth one extra read.

## Supervise

One poll — the whole point of the supervisor, and cheap enough to run every pass:

```bash
herdr pane list | jq -r --slurpfile r ~/.cache/babysit/herd.json '
  ($r[0] | map(.worktree)) as $roster
  | .result.panes[]
  | select(.agent == "claude" and (.cwd | IN($roster[])))
  | "\(.pane_id) \(.agent_status) \(.cwd)"'
```

Join `cwd` back to the PR. Then act on `agent_status`:

- `working` — mid-pass. Leave it alone. Report one line; do not read the pane.
- `blocked` — it needs a human, usually a permission prompt or a judgment call. Read it and surface the question:
  `herdr pane read <pane> --source recent-unwrapped --lines 60`
- `idle` / `done` — a pass finished and the loop is resting until its next tick. This is the healthy resting state, not a failure. Read the pane, report the verdict it landed on, and leave the loop running.

A babysitter is only actually dead when it sits `idle` across several polls with no new pass between them — the loop was stopped or never started. Re-send the `/loop` command rather than assuming the PR is done.

Read a pane only when its status earns it. Reading all of them every pass drags each babysitter's transcript into supervisor context and defeats the isolation the herd exists for.

Single-pane fields live under `.result.pane`, not `.result` — `herdr pane get <id> | jq '.result.pane.agent_status'`.

## Re-steer

Send a correction straight to a babysitter:

```bash
herdr pane run <pane> "the e2e_local failure is the known seed flake — retry the task, do not patch the feature file"
```

Re-steer when a babysitter is blocked on something this session can answer, or is visibly chasing the wrong root cause. Anything needing the user's judgment gets surfaced, not guessed at.

## Retire

When a babysitter reports GREEN, or its PR merges, stop the loop and reclaim the space:

```bash
herdr pane send-keys <pane> Escape
herdr pane run <pane> "/loop stop"
herdr pane close <pane>
```

Leaving a loop running after GREEN burns a Claude every 10 minutes on a PR with nothing left to do, and holds screen space the remaining babysitters need.
