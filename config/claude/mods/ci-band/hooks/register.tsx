import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { CiCheck, CiItem, CiState } from '../types'

type Engine = EngineInterface
type Config = { ui: string; hasSound: boolean }
type Tally = Record<CiState, number>
type Verdict = CiState | 'none'
type Change = { text: string; tone: 'pass' | 'fail' | null; suggest?: string }
type Json = Record<string, unknown>
/** A drawn site's dot rows, so the beat can repaint the running ones in place. */
type Site = { requestId: string; rows: readonly (readonly CiState[])[] }

const PANE = 'ci-band'
const TITLE = 'CI'
const BABYSIT = '/babysit-pr'
const TICK_MS = 15_000
const ACTIVE_MS = 45_000
const IDLE_MS = 5 * 60_000
const PATCH_KEEP_MS = 12 * 60 * 60_000
const SETTLED_KEEP_MS = 10 * 60_000
const BEAT_MS = 700
const DOT_CAP = 40
const DEFAULT_COLOR = 0x01000000
const DIM_RUN = '#7a5a10'
const PR_FIELDS =
  'number,title,url,state,isDraft,mergeable,reviewDecision,headRefName,statusCheckRollup'
const NO_PR = /no pull requests found|no git remotes|not a git repository/i
const PR_URL = /https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)/g
const GRAPHITE_URL = /https:\/\/app\.graphite\.(?:com|dev)\/github\/pr\/([\w.-]+)\/([\w.-]+)\/(\d+)/g
const PATCH_URL =
  /https:\/\/(?:spruce|evergreen)(?:\.corp)?\.mongodb\.com\/(?:version|patch)\/([0-9a-f]{24})/g
const PATCH_ID = /\bID\s*:\s*([0-9a-f]{24})\b/g
const SUBMITS_PR = /\b(?:gh\s+pr\s+create|gt\s+(?:submit|ss|stack\s+submit))\b/
const SUBMITS_PATCH = /\bevergreen\s+(?:patch|patch-file|create-patch|submit-patch|finalize-patch)\b/
const MOVES_CI =
  /\bgit\s+(?:push|checkout|switch)\b|\bgh\s+pr\s+(?:create|ready|merge|edit|close)\b|\bgt\s+(?:submit|ss|sync|checkout)\b|\bevergreen\s/

const ORDER: readonly CiState[] = ['fail', 'run', 'wait', 'pass']
/** Left to right the dots read as progress: failed, passed, running, still to start. */
const DOT_ORDER: readonly CiState[] = ['fail', 'pass', 'run', 'wait']
const GLYPH: Record<Verdict, string> = {
  fail: '✗',
  run: '●',
  wait: '◌',
  pass: '✓',
  skip: '–',
  none: '·',
}
const WORD: Record<CiState, string> = {
  fail: 'failed',
  run: 'running',
  wait: 'waiting',
  pass: 'passed',
  skip: 'skipped',
}
const HEX: Record<CiState, string> = {
  fail: '#ef4444',
  run: '#f59e0b',
  wait: '#9ca3af',
  pass: '#22c55e',
  skip: '#d1d5db',
}

const items = atom({ plugin: 'ci-band', key: 'items' } as const, [])
const ignored = atom({ plugin: 'ci-band', key: 'ignored' } as const, [])
const isHidden = atom({ plugin: 'ci-band', key: 'isHidden' } as const, false)
const isExpanded = atom({ plugin: 'ci-band', key: 'isExpanded' } as const, false)

// The poller's own bookkeeping: a reload starts it over, which only polls once more.
let isBusy = false
let isDue = true
let hasRepo = false
let lastAt = 0
let beat: { cancel: () => void } | null = null
let isDimBeat = false
let bandSite: Site | null = null
let paneSite: Site | null = null

const tint = (state: Verdict) =>
  state === 'fail'
    ? { color: 'error' }
    : state === 'run'
      ? { color: 'warning' }
      : state === 'pass'
        ? { color: 'success' }
        : { dimColor: true }

const clip = (text: string, columns: number) =>
  text.length <= columns ? text : `${text.slice(0, Math.max(1, columns - 1))}…`

const spanOf = (ms: number) => {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)

  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

const tallyOf = (checks: readonly CiCheck[]) => {
  const tally: Tally = { fail: 0, run: 0, wait: 0, pass: 0, skip: 0 }
  for (const check of checks) tally[check.state] += 1

  return tally
}

const verdictOf = (item: CiItem): Verdict => {
  const tally = tallyOf(item.checks)

  return ORDER.find(state => tally[state] > 0) ?? 'none'
}

const isLive = (item: CiItem) => item.life === 'open' || item.life === 'draft'
/** Still has checks to finish, whatever the ones that finished say. */
const isMoving = (item: CiItem) =>
  item.checks.some(check => check.state === 'run' || check.state === 'wait')
/** A PR seen merged or closed: it is not polled again, so `polledAt` is when that was seen. */
const isSettled = (item: CiItem) => item.kind === 'pr' && item.polledAt > 0 && !isLive(item)
const nameOf = (item: CiItem) => (item.kind === 'pr' ? `PR ${item.label}` : item.label)

const rankOf = (item: CiItem) => {
  const verdict = verdictOf(item)
  if (verdict === 'fail') return 0
  if (item.hasConflict) return 1

  return verdict === 'run' ? 2 : verdict === 'wait' ? 3 : verdict === 'none' ? 4 : 5
}

const sorted = (list: readonly CiItem[]) => [...list].sort((a, b) => rankOf(a) - rankOf(b))

const flagsOf = (item: CiItem) => [
  ...(item.hasConflict ? ['conflicts'] : []),
  ...(item.review === 'changes' ? ['changes requested'] : []),
  ...(item.review === 'approved' ? ['approved'] : []),
  ...(item.life === 'open' ? [] : [item.life]),
]

/** How long the item's checks have been going, while any still is; else how long a patch took. */
const elapsedOf = (item: CiItem, now: number) => {
  const starts = item.checks.flatMap(check => (check.startedAt === null ? [] : [check.startedAt]))
  const first = starts.length === 0 ? null : Math.min(...starts)
  if (first === null) return ''
  if (isMoving(item)) return spanOf(now - first)
  // A PR's workflows start and finish apart; only a patch is one run with one duration.
  const end = item.kind === 'patch' ? item.checks[0]?.endedAt : null

  return end === null || end === undefined ? '' : spanOf(end - first)
}

/** Shares `width` cells among the states that have checks, each at least one cell. */
const splitOf = (tally: Tally, width: number) => {
  const present = ORDER.filter(state => tally[state] > 0)
  const total = present.reduce((sum, state) => sum + tally[state], 0)
  const cells = present.map(state => ({
    state,
    cells: Math.max(1, Math.round((tally[state] / total) * width)),
  }))
  const widest = [...cells].sort((a, b) => b.cells - a.cells)[0]
  if (widest !== undefined) {
    widest.cells += width - cells.reduce((sum, one) => sum + one.cells, 0)
  }

  return cells
}

/** One state per check; past the cap, each state's share of the cap. */
const dotsOf = (item: CiItem) => {
  if (item.kind !== 'pr') return []
  const tally = tallyOf(item.checks)
  const total = ORDER.reduce((sum, state) => sum + tally[state], 0)
  const shares =
    total <= DOT_CAP ? ORDER.map(state => ({ state, cells: tally[state] })) : splitOf(tally, DOT_CAP)

  return DOT_ORDER.flatMap(state =>
    Array.from({ length: shares.find(one => one.state === state)?.cells ?? 0 }, () => state),
  )
}

/** The dots as Raster cells; `isDim` draws the running ones at the low half of their pulse. */
const cellsOf = (dots: readonly CiState[], isDim: boolean) => {
  const words = new Uint32Array(dots.length * 3)
  dots.forEach((state, index) => {
    const hex = state === 'run' && isDim ? DIM_RUN : HEX[state]
    words[index * 3] = state === 'wait' ? 0x25cb : 0x25cf
    words[index * 3 + 1] = Number.parseInt(hex.slice(1), 16)
    words[index * 3 + 2] = DEFAULT_COLOR
  })

  // The hooks environment has `toBase64`; the es2023 lib the mod is typed against does not.
  const bytes = new Uint8Array(words.buffer) as Uint8Array & { toBase64: () => string }

  return bytes.toBase64()
}

const dotsSvg = (dots: readonly CiState[]) => {
  const circles = dots.map((state, index) => {
    const at = `cx="${5 + index * 12}" cy="5"`
    if (state === 'wait') {
      return `<circle ${at} r="3.25" fill="none" stroke="${HEX.wait}" stroke-width="1.5"/>`
    }
    const pulse =
      state === 'run'
        ? '<animate attributeName="opacity" values="1;0.3;1" dur="1.4s" repeatCount="indefinite"/>'
        : ''

    return `<circle ${at} r="4" fill="${HEX[state]}">${pulse}</circle>`
  })
  const width = dots.length * 12 - 2

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="10" ` +
    `viewBox="0 0 ${width} 10">${circles.join('')}</svg>`
  )
}

/** The item's state in a few words: what the dots cannot say. */
const scoreOf = (item: CiItem) => {
  if (item.polledAt === 0) return 'checking…'
  const first = item.checks[0]
  if (item.kind === 'patch') return first === undefined ? '' : `${WORD[first.state]} · ${first.name}`

  const tally = tallyOf(item.checks)
  const verdict = verdictOf(item)
  if (verdict === 'fail') return `${tally.fail} failed`
  if (verdict === 'pass') return `${tally.pass} passed`
  if (verdict === 'none') return 'no checks'

  return `${tally.pass + tally.fail}/${tally.pass + tally.fail + tally.run + tally.wait}`
}

/** In flight or wanting a decision: the band is for these; the rest sit on the status line. */
const isLoud = (item: CiItem) => {
  const verdict = verdictOf(item)

  return (
    item.polledAt === 0 ||
    verdict === 'fail' ||
    verdict === 'run' ||
    verdict === 'wait' ||
    item.hasConflict ||
    item.review === 'changes' ||
    !isLive(item)
  )
}

const banded = (list: readonly CiItem[]) => sorted(list).filter(isLoud)

const donutOf = (tally: Tally, verdict: Verdict) => {
  let offset = 25
  const total = ORDER.reduce((sum, state) => sum + tally[state], 0)
  const arcs = ORDER.filter(state => tally[state] > 0).map(state => {
    const share = (tally[state] / total) * 100
    const arc =
      `<circle cx="21" cy="21" r="15.9155" fill="none" stroke="${HEX[state]}" stroke-width="5" ` +
      `stroke-dasharray="${share} ${100 - share}" stroke-dashoffset="${offset}"/>`
    offset -= share

    return arc
  })
  const fill = verdict === 'none' || verdict === 'skip' ? HEX.wait : HEX[verdict]

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 42 42">` +
    `<circle cx="21" cy="21" r="15.9155" fill="none" stroke="#e5e7eb" stroke-width="5"/>` +
    arcs.join('') +
    `<text x="21" y="25" font-size="11" font-family="system-ui,sans-serif" font-weight="700" ` +
    `text-anchor="middle" fill="${fill}">${tally.fail > 0 ? tally.fail : total}</text></svg>`
  )
}

const escapeXml = (text: string) =>
  text.replace(/[<>&"]/g, one => `&#${one.charCodeAt(0)};`)

/** A timeline of the checks that started: one bar each, placed by when it ran. */
const ganttOf = (checks: readonly CiCheck[], now: number) => {
  const rows = checks
    .flatMap(check => (check.startedAt === null ? [] : [{ ...check, startedAt: check.startedAt }]))
    .sort((a, b) => a.startedAt - b.startedAt)
    .slice(0, 24)
  const first = rows[0]
  if (first === undefined || rows.length < 2) return null

  const endOf = (row: (typeof rows)[number]) => row.endedAt ?? now
  const last = Math.max(...rows.map(endOf))
  const scale = 300 / Math.max(1, last - first.startedAt)
  const bars = rows.map((row, index) => {
    const x = 190 + (row.startedAt - first.startedAt) * scale
    const width = Math.max(3, (endOf(row) - row.startedAt) * scale)
    const y = index * 16

    return (
      `<text x="182" y="${y + 11}" font-size="10" font-family="system-ui,sans-serif" ` +
      `text-anchor="end" fill="#6b7280">${escapeXml(clip(row.name, 30))}</text>` +
      `<rect x="${x.toFixed(1)}" y="${y + 3}" width="${width.toFixed(1)}" height="10" rx="3" ` +
      `fill="${HEX[row.state]}"><title>${escapeXml(row.name)}: ${WORD[row.state]}, ` +
      `${spanOf(endOf(row) - row.startedAt)}</title></rect>`
    )
  })
  const height = rows.length * 16

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="${height}" ` +
    `viewBox="0 0 500 ${height}">${bars.join('')}</svg>`
  )
}

const timeOf = (value: unknown) => {
  const ms = typeof value === 'string' ? Date.parse(value) : Number.NaN

  return Number.isNaN(ms) || ms <= 0 ? null : ms
}

/** A link the surface will draw: https, plain ASCII, no user part; else null. */
const linkOf = (value: unknown) => {
  if (typeof value !== 'string' || !URL.canParse(value)) return null
  const { href, protocol } = new URL(value)

  return protocol === 'https:' && href.length <= 2048 && !href.includes('@') ? href : null
}

const checkOf = (raw: Json): CiCheck => {
  if (raw.__typename === 'StatusContext') {
    const state =
      raw.state === 'SUCCESS'
        ? 'pass'
        : raw.state === 'FAILURE' || raw.state === 'ERROR'
          ? 'fail'
          : 'run'

    return {
      name: String(raw.context ?? 'status'),
      state,
      url: linkOf(raw.targetUrl),
      startedAt: timeOf(raw.startedAt),
      endedAt: null,
    }
  }

  const workflow = typeof raw.workflowName === 'string' && raw.workflowName !== ''
  const state =
    raw.status !== 'COMPLETED'
      ? raw.status === 'IN_PROGRESS'
        ? 'run'
        : 'wait'
      : raw.conclusion === 'SUCCESS'
        ? 'pass'
        : raw.conclusion === 'SKIPPED' || raw.conclusion === 'NEUTRAL'
          ? 'skip'
          : 'fail'

  return {
    name: `${workflow ? `${String(raw.workflowName)} / ` : ''}${String(raw.name ?? 'check')}`,
    state,
    url: linkOf(raw.detailsUrl),
    startedAt: timeOf(raw.startedAt),
    endedAt: timeOf(raw.completedAt),
  }
}

const prOf = (raw: Json, isAuto: boolean, now: number): CiItem => {
  const rollup: Json[] = Array.isArray(raw.statusCheckRollup) ? raw.statusCheckRollup : []

  return {
    kind: 'pr',
    id: String(raw.url),
    url: String(raw.url),
    label: `#${String(raw.number)}`,
    title: String(raw.title ?? ''),
    checks: rollup.map(checkOf),
    life:
      raw.state === 'MERGED'
        ? 'merged'
        : raw.state === 'CLOSED'
          ? 'closed'
          : raw.isDraft === true
            ? 'draft'
            : 'open',
    hasConflict: raw.mergeable === 'CONFLICTING',
    review:
      raw.reviewDecision === 'APPROVED'
        ? 'approved'
        : raw.reviewDecision === 'CHANGES_REQUESTED'
          ? 'changes'
          : raw.reviewDecision === 'REVIEW_REQUIRED'
            ? 'required'
            : 'none',
    isAuto,
    polledAt: now,
  }
}

const patchOf = (raw: Json, id: string, ui: string, now: number): CiItem => {
  const url = `${ui}/version/${id}/tasks`
  const tasks = Array.isArray(raw.tasks) ? raw.tasks.length : 0
  const state: CiState =
    raw.status === 'succeeded' || raw.status === 'success'
      ? 'pass'
      : raw.status === 'failed'
        ? 'fail'
        : raw.status === 'started'
          ? 'run'
          : 'wait'

  return {
    kind: 'patch',
    id,
    url,
    label: `patch ${String(raw.patch_number ?? '')}`.trim(),
    title: String(raw.description ?? ''),
    checks: [
      {
        name: raw.activated === false ? 'not finalized' : `${tasks} task${tasks === 1 ? '' : 's'}`,
        state,
        url: linkOf(url),
        startedAt: timeOf(raw.start_time),
        endedAt: timeOf(raw.finish_time),
      },
    ],
    life: 'open',
    hasConflict: false,
    review: 'none',
    isAuto: false,
    polledAt: now,
  }
}

const stubOf = (kind: CiItem['kind'], id: string, url: string, label: string): CiItem => ({
  kind,
  id,
  url,
  label,
  title: '',
  checks: [],
  life: 'open',
  hasConflict: false,
  review: 'none',
  isAuto: false,
  polledAt: 0,
})

/** The PRs and patches a text names by URL, as items not polled yet. */
const mentionsOf = (text: string, ui: string) => {
  const found: CiItem[] = []
  for (const pattern of [PR_URL, GRAPHITE_URL]) {
    for (const match of text.matchAll(pattern)) {
      const url = `https://github.com/${match[1]}/${match[2]}/pull/${match[3]}`
      found.push(stubOf('pr', url, url, `#${match[3]}`))
    }
  }
  for (const match of text.matchAll(PATCH_URL)) {
    const id = String(match[1])
    found.push(stubOf('patch', id, `${ui}/version/${id}/tasks`, 'patch'))
  }

  return found.filter((one, index) => found.findIndex(other => other.id === one.id) === index)
}

/** What to say about one item between two polls. */
const changesOf = (was: CiItem, now: CiItem): Change[] => {
  const name = nameOf(now)
  if (isLive(was) && !isLive(now)) {
    return [{ text: `${name} ${now.life}`, tone: now.life === 'merged' ? 'pass' : null }]
  }

  const changes: Change[] = []
  const verdict = verdictOf(now)
  if (verdict !== verdictOf(was) && verdict === 'fail') {
    const failed = now.checks.filter(check => check.state === 'fail')
    const names = failed
      .slice(0, 2)
      .map(check => clip(check.name, 28))
      .join(', ')
    const more = failed.length > 2 ? ` +${failed.length - 2}` : ''
    changes.push({
      text: now.kind === 'pr' ? `✗ ${name}: ${names}${more} failed` : `✗ ${name} failed`,
      tone: 'fail',
      ...(now.kind === 'pr' ? { suggest: `${BABYSIT} ${now.url}` } : {}),
    })
  }
  if (verdict !== verdictOf(was) && verdict === 'pass') {
    const passed = now.checks.filter(check => check.state === 'pass').length
    changes.push({
      text: now.kind === 'pr' ? `✓ ${name}: all ${passed} checks passed` : `✓ ${name} passed`,
      tone: 'pass',
    })
  }
  if (now.hasConflict && !was.hasConflict) {
    changes.push({ text: `⚠ ${name} has merge conflicts`, tone: 'fail' })
  }
  if (now.review !== was.review && now.review === 'approved') {
    changes.push({ text: `${name} approved`, tone: 'pass' })
  }
  if (now.review !== was.review && now.review === 'changes') {
    changes.push({ text: `${name}: changes requested`, tone: 'fail' })
  }

  return changes
}

const fetchPr = async ($: Engine, target: string | null, now: number) => {
  const argv = ['gh', 'pr', 'view', ...(target === null ? [] : [target]), '--json', PR_FIELDS]
  const ran = await $.process.run(argv, { timeoutMs: 20_000 }).catch(() => null)
  if (ran === null) return 'error'
  if (ran.exitCode === 0 && ran.stdout.trimStart().startsWith('{')) {
    return prOf(JSON.parse(ran.stdout), target === null, now)
  }

  return NO_PR.test(ran.stdout + ran.stderr) ? 'none' : 'error'
}

const fetchPatch = async ($: Engine, id: string, ui: string, now: number) => {
  const argv = ['evergreen', 'list-patches', '--json', '-i', id]
  const ran = await $.process.run(argv, { timeoutMs: 20_000 }).catch(() => null)
  if (ran === null || ran.exitCode !== 0 || !/^\s*[[{]/.test(ran.stdout)) return 'error'
  // One object with `-i`; a list from older CLIs.
  const parsed: Json | Json[] = JSON.parse(ran.stdout)
  const first = Array.isArray(parsed) ? parsed[0] : parsed

  return first === undefined ? 'none' : patchOf(first, id, ui, now)
}

const keyOf = async ($: Engine) =>
  `tracked:${(await $.session.repo())?.root ?? (await $.session.cwd())}`

const save = async ($: Engine) =>
  $.store.set(
    await keyOf($),
    (await read($, items))
      .filter(one => !one.isAuto)
      .map(one => ({ kind: one.kind, id: one.id, url: one.url, label: one.label })),
  )

/** Repaints the running dots of each drawn site at the other half of their pulse. */
const throb = async ($: Engine) => {
  isDimBeat = !isDimBeat
  for (const site of [bandSite, paneSite]) {
    if (site === null) continue
    for (const [index, dots] of site.rows.entries()) {
      if (!dots.includes('run')) continue
      const took = await $.ui.blit({
        requestId: site.requestId,
        key: `dots:${index}`,
        cells: cellsOf(dots, isDimBeat),
      })
      // Not mounted any more: its next draw names it again.
      if (took.deny !== undefined && site === bandSite) bandSite = null
      if (took.deny !== undefined && site === paneSite) paneSite = null
      if (took.deny !== undefined) break
    }
  }
}

/** The status line carries what the band does not: the quiet items, or all while hidden. */
const paint = async ($: Engine) => {
  const list = sorted(await read($, items))
  const hidden = await read($, isHidden)
  const summary = list
    .filter(one => hidden || !isLoud(one))
    .map(one => `${GLYPH[verdictOf(one)]} ${nameOf(one)} ${scoreOf(one)}`.trim())
  $.ui.status(summary.length > 0 ? summary.join('   ') : undefined)

  const hasRun = list.some(one => one.checks.some(check => check.state === 'run'))
  if (hasRun && beat === null) {
    beat = $.clock.every(BEAT_MS, () => void throb($).catch(() => undefined))
  }
  if (!hasRun && beat !== null) {
    beat.cancel()
    beat = null
  }
}

const track = async ($: Engine, stubs: readonly CiItem[]) => {
  if (stubs.length === 0) return
  await update($, ignored, list => list.filter(id => !stubs.some(one => one.id === id)))
  await update($, items, list => [
    ...list,
    ...stubs.filter(stub => !list.some(one => one.id === stub.id)),
  ])
  await save($)
  isDue = true
}

const untrack = async ($: Engine, ids: readonly string[]) => {
  await update($, ignored, list => [...new Set([...list, ...ids])].slice(-200))
  await update($, items, list => list.filter(one => !ids.includes(one.id)))
  await save($)
  await paint($)
}

const announce = async (
  $: Engine,
  config: Config,
  before: readonly CiItem[],
  after: readonly CiItem[],
) => {
  const changes = after.flatMap(now => {
    const was = before.find(one => one.id === now.id)

    return was === undefined || was.polledAt === 0 ? [] : changesOf(was, now)
  })
  for (const change of changes) $.ui.toast(change.text, { timeoutMs: 8000 })

  const suggest = changes.find(change => change.suggest !== undefined)?.suggest
  if (suggest !== undefined) await $.prompt.suggest({ text: suggest }).catch(() => undefined)

  const tone = changes.some(one => one.tone === 'fail')
    ? 'fail'
    : changes.some(one => one.tone === 'pass')
      ? 'pass'
      : null
  if (tone !== null && config.hasSound) {
    await $.audio.play({ asset: `sounds/${tone}.wav` }).catch(() => undefined)
  }
}

/** Polls the branch's PR and everything tracked, then says what changed. */
const refresh = async ($: Engine, config: Config) => {
  if (isBusy) return
  isBusy = true
  try {
    const now = await $.clock.now()
    const before = await read($, items)
    const skipped = await read($, ignored)

    const auto = hasRepo ? await fetchPr($, null, now) : 'none'
    const autoId = typeof auto === 'string' ? null : auto.id
    const byHand = await Promise.all(
      before
        .filter(one => !one.isAuto && !isSettled(one) && one.id !== autoId)
        .map(one =>
          one.kind === 'pr'
            ? fetchPr($, one.url, now).then(got => (typeof got === 'string' ? got : { ...got, isAuto: false }))
            : fetchPatch($, one.id, config.ui, now),
        ),
    )
    const polled = [
      ...(typeof auto === 'string' || skipped.includes(auto.id) ? [] : [auto]),
      ...byHand.flatMap(got => (typeof got === 'string' ? [] : [got])),
    ]

    // Merged or closed a while ago, or a patch long finished: it leaves the band.
    const done = before
      .filter(one => one.polledAt > 0)
      .filter(one =>
        one.kind === 'pr'
          ? !isLive(one) && now - one.polledAt >= SETTLED_KEEP_MS
          : one.checks.every(check => check.endedAt !== null && now - check.endedAt > PATCH_KEEP_MS),
      )
      .map(one => one.id)

    await update($, items, list => {
      // The branch's PR changed or is gone: its old row goes with it.
      const kept = list.filter(one => !one.isAuto || auto === 'error' || one.id === autoId)
      const merged = kept.map(one =>
        isSettled(one) ? one : (polled.find(got => got.id === one.id) ?? one),
      )
      const added = polled.filter(got => !kept.some(one => one.id === got.id))

      return [...merged, ...added].filter(one => !done.includes(one.id))
    })
    if (done.length > 0) {
      await update($, ignored, list => [...new Set([...list, ...done])].slice(-200))
      await save($)
    }

    lastAt = now
    await announce($, config, before, await read($, items))
    await paint($)
  } finally {
    isBusy = false
  }
}

const tick = async ($: Engine, config: Config) => {
  const list = await read($, items)
  if (!isDue) {
    if (!hasRepo && list.length === 0) return
    const isActive = list.some(one => one.polledAt === 0 || isMoving(one))
    if ((await $.clock.now()) - lastAt < (isActive ? ACTIVE_MS : IDLE_MS)) return
  }
  isDue = false
  await refresh($, config)
}

/** Tracks what a command just submitted, and polls soon after one that moves CI. */
const notice = async ($: Engine, config: Config, command: string, stdout: string) => {
  if (SUBMITS_PR.test(command)) await track($, mentionsOf(stdout, config.ui))
  if (SUBMITS_PATCH.test(command)) {
    const ids = [...stdout.matchAll(PATCH_ID)].map(match => String(match[1]))
    await track($, [
      ...mentionsOf(stdout, config.ui).filter(one => one.kind === 'patch'),
      ...ids.map(id => stubOf('patch', id, `${config.ui}/version/${id}/tasks`, 'patch')),
    ])
  }
  if (MOVES_CI.test(command)) isDue = true
}

const draft = async ($: Engine, text: string) => {
  const box = await $.prompt.read()
  const filled = box.text.trim() === '' ? await $.prompt.fill({ text }) : { isFilled: false }
  $.ui.toast(filled.isFilled ? 'Drafted in the prompt · Enter runs it' : `Prompt has a draft. Run: ${text}`)
}

const act = ($: Engine, item: CiItem) =>
  draft(
    $,
    item.kind === 'pr'
      ? `${BABYSIT} ${item.url}`
      : `Check Evergreen patch ${item.url}. If there are failures, triage and fix if applicable.`,
  )

const browse = async ($: Engine, url: string) => {
  const ran = await $.process.run(['open', url]).catch(() => $.process.run(['xdg-open', url]))
  if (ran.exitCode !== 0) $.ui.toast(`Could not open ${url}`)
}

const showPane = ($: Engine) =>
  $.ui.open({ id: PANE, title: TITLE, focus: true, closeOnEscape: true })

const hide = async ($: Engine, hidden: boolean) => {
  await update($, isHidden, () => hidden)
  await paint($)
}

export const register: Register = (on, options) => {
  const config: Config = {
    ui: String(options.evergreenUi ?? 'https://spruce.corp.mongodb.com').replace(/\/+$/, ''),
    hasSound: options.sound !== false,
  }

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'ci',
      description: 'Show CI for this branch, or track a PR or Evergreen patch',
      argumentHint: '[url | patch id | hide | show | clear]',
      immediate: true,
    })

    hasRepo = (await $.session.repo()) !== null
    const stored = await $.store.get(await keyOf($))
    const stubs = (Array.isArray(stored) ? (stored as CiItem[]) : []).map(one =>
      stubOf(one.kind, one.id, one.url, one.label),
    )
    await update($, items, list => [
      ...list,
      ...stubs.filter(stub => !list.some(one => one.id === stub.id)),
    ])

    $.clock.after(250, () => void tick($, config).catch(() => undefined))
    $.clock.every(TICK_MS, () => void tick($, config).catch(() => undefined))

    return next(e)
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true) {
      await notice($, config, e.command, ran.result.stdout).catch(() => undefined)
    }

    return ran
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.origin.kind === 'composer') {
      await track($, mentionsOf(e.text, config.ui)).catch(() => undefined)
    }

    return next(e)
  })

  on('command.run', { command: 'ci' }, async ($, e) => {
    const arg = e.args.trim()
    if (arg === 'hide' || arg === 'show') {
      await hide($, arg === 'hide')

      return { text: arg === 'hide' ? 'CI band hidden; the status line carries it.' : 'CI band shown.' }
    }
    if (arg === 'clear') {
      await untrack(
        $,
        (await read($, items)).map(one => one.id),
      )

      return { text: 'Stopped tracking.' }
    }
    if (arg !== '') {
      const stubs = /^[0-9a-f]{24}$/.test(arg)
        ? [stubOf('patch', arg, `${config.ui}/version/${arg}/tasks`, 'patch')]
        : mentionsOf(arg, config.ui)
      if (stubs.length === 0) {
        return { text: 'Give a PR URL, an Evergreen patch URL or a patch id.' }
      }
      await track($, stubs)
      await refresh($, config)

      return { text: `Tracking ${stubs.map(one => (one.kind === 'pr' ? `PR ${one.label}` : 'the patch')).join(', ')}.` }
    }

    isDue = true
    $.clock.after(50, () => void tick($, config).catch(() => undefined))
    const opened = await showPane($)

    return opened.isPlaced ? {} : { text: `CI pane is waiting: ${opened.reason}` }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const all = await read($, items)
    const list = banded(all).slice(0, 3)
    const top = list[0]
    if (e.props.hasSurvey || top === undefined || (await read($, isHidden))) {
      bandSite = null

      return below
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const now = await $.clock.now()
    const titleColumns = Math.max(8, Math.min(36, e.props.bodyColumns - 90))
    const rows = list.map(dotsOf)
    bandSite = e.surface === 'terminal' ? { requestId: e.requestId, rows } : null

    const line = (item: CiItem, index: number) => {
      const verdict = verdictOf(item)
      const dots = rows[index] ?? []
      const flags = flagsOf(item)
      const elapsed = elapsedOf(item, now)

      return (
        <Box gap={1}>
          <Text {...tint(verdict)}>▎</Text>
          <Text bold>{nameOf(item)}</Text>
          {item.title !== '' && <Text dimColor>{clip(item.title, titleColumns)}</Text>}
          {dots.length > 0 &&
            (e.surface === 'terminal'
              ? (() => {
                  const { Raster } = $.ui.resolve(e)

                  return (
                    <Raster
                      key={`dots:${index}`}
                      columns={dots.length}
                      rows={1}
                      cells={cellsOf(dots, isDimBeat)}
                    />
                  )
                })()
              : (() => {
                  const { Svg } = $.ui.resolve(e)

                  return <Svg source={dotsSvg(dots)} alt="one dot per check" isInteractive />
                })())}
          <Text {...tint(verdict)}>{scoreOf(item)}</Text>
          {flags.length > 0 && (
            <Text {...(item.hasConflict || item.review === 'changes' ? { color: 'warning' } : { dimColor: true })}>
              {flags.join(' · ')}
            </Text>
          )}
          {elapsed !== '' && <Text dimColor>{elapsed}</Text>}
        </Box>
      )
    }

    const needsYou = verdictOf(top) === 'fail' || top.hasConflict || top.review === 'changes'
    const more = banded(all).length - list.length

    return (
      <Box flexDirection="column">
        <Box gap={2}>
          {line(top, 0)}
          {needsYou && (
            <Button
              key="act"
              plain
              variant="primary"
              label={top.kind === 'pr' ? 'babysit' : 'triage'}
              onPress={() => act($, top)}
            />
          )}
          <Button key="details" plain dimColor label="details" onPress={() => showPane($)} />
          <Button
            key="hide"
            plain
            dimColor
            role="dismiss"
            label="hide"
            onPress={() => hide($, true)}
          />
        </Box>
        {list.slice(1).map((item, index) => line(item, index + 1))}
        {more > 0 && <Text dimColor>+{more} more · /ci</Text>}
        {below}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Link, Text } = $.ui.resolve(e)
    const list = sorted(await read($, items))
    if (list.length === 0) {
      return (
        <Box flexDirection="column">
          <Text dimColor>No PR for this branch, and nothing tracked.</Text>
          <Text dimColor>/ci with a PR or Evergreen patch URL tracks one.</Text>
        </Box>
      )
    }

    const expanded = await read($, isExpanded)
    const now = await $.clock.now()
    const nameColumns = Math.max(16, e.props.bodyColumns - 16)
    const dotRows = list.map(dotsOf)
    paneSite = e.surface === 'terminal' ? { requestId: PANE, rows: dotRows } : null

    const row = (check: CiCheck) => {
      const span =
        check.startedAt === null ? '' : spanOf((check.endedAt ?? now) - check.startedAt)

      return (
        <Box gap={1}>
          <Text {...tint(check.state)}>{GLYPH[check.state]}</Text>
          {check.url === null ? (
            <Text>{clip(check.name, nameColumns)}</Text>
          ) : (
            <Link href={check.url} label={clip(check.name, nameColumns)} />
          )}
          {span !== '' && <Text dimColor>{span}</Text>}
        </Box>
      )
    }

    const card = (item: CiItem, index: number) => {
      const verdict = verdictOf(item)
      const tally = tallyOf(item.checks)
      const flags = flagsOf(item)
      const open = item.checks.filter(check => check.state !== 'pass' && check.state !== 'skip')
      const settled = item.checks.filter(check => check.state === 'pass' || check.state === 'skip')
      const counts = [...ORDER, 'skip' as const]
        .filter(state => tally[state] > 0)
        .map(state => `${tally[state]} ${WORD[state]}`)
        .join(' · ')
      const gantt = e.surface === 'desktop' ? ganttOf(item.checks, now) : null
      const hot = (key: string) => (index === 0 ? { hotkey: key } : {})

      return (
        <Box
          flexDirection="column"
          borderStyle="round"
          {...(verdict === 'fail' ? { borderColor: 'error' } : { borderDimColor: true })}
          paddingX={1}
        >
          <Box gap={1}>
            {e.surface === 'desktop' && item.checks.length > 0 ? (
              (() => {
                const { Svg } = $.ui.resolve(e)

                return <Svg source={donutOf(tally, verdict)} alt={counts} width={56} height={56} />
              })()
            ) : (
              <Text {...tint(verdict)}>{GLYPH[verdict]}</Text>
            )}
            <Box flexDirection="column">
              <Box gap={1}>
                <Text bold>{nameOf(item)}</Text>
                <Text>{clip(item.title, nameColumns - 8)}</Text>
              </Box>
              <Box gap={1}>
                {e.surface === 'terminal' &&
                  (dotRows[index] ?? []).length > 0 &&
                  (() => {
                    const { Raster } = $.ui.resolve(e)
                    const dots = dotRows[index] ?? []

                    return (
                      <Raster
                        key={`dots:${index}`}
                        columns={dots.length}
                        rows={1}
                        cells={cellsOf(dots, isDimBeat)}
                      />
                    )
                  })()}
                <Text dimColor>{item.polledAt === 0 ? 'checking…' : counts || 'no checks yet'}</Text>
              </Box>
              {flags.length > 0 && (
                <Text {...(item.hasConflict || item.review === 'changes' ? { color: 'warning' } : { dimColor: true })}>
                  {flags.join(' · ')}
                </Text>
              )}
            </Box>
          </Box>
          {e.surface === 'desktop' &&
            gantt !== null &&
            (() => {
              const { Svg } = $.ui.resolve(e)

              return <Svg source={gantt} alt="when each check ran" isInteractive />
            })()}
          {open.slice(0, 20).map(row)}
          {open.length > 20 && <Text dimColor>+{open.length - 20} more</Text>}
          {expanded && settled.map(row)}
          <Box gap={1}>
            <Button
              key={`act:${index}`}
              {...hot('b')}
              label={item.kind === 'pr' ? 'babysit' : 'triage'}
              onPress={() => act($, item)}
            />
            <Button
              key={`web:${index}`}
              {...hot('w')}
              label="web"
              onPress={() => browse($, item.url)}
            />
            {settled.length > 0 && (
              <Button
                key={`expand:${index}`}
                {...hot('e')}
                label={expanded ? 'fewer' : `all ${item.checks.length}`}
                onPress={() => update($, isExpanded, now => !now)}
              />
            )}
            <Button
              key={`untrack:${index}`}
              {...hot('u')}
              dimColor
              label="untrack"
              onPress={() => untrack($, [item.id])}
            />
          </Box>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        {list.map(card)}
        <Box gap={2}>
          <Button
            key="refresh"
            hotkey="r"
            label="refresh"
            onPress={() => refresh($, config)}
          />
          <Text dimColor>
            checked {lastAt === 0 ? 'never' : `${spanOf(now - lastAt)} ago`}
          </Text>
        </Box>
        <Text dimColor>b babysit · w web · e all checks · u untrack · r refresh</Text>
      </Box>
    )
  })
}
