import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const NOW = 1_700_000_000_000
const PR = 'https://github.com/acme/app/pull/12'
const OTHER = 'https://github.com/acme/app/pull/7'
const PATCH = '6ac08a2ec74a960007e4d17b'
const SURFACES = ['terminal', 'desktop'] as const

const BAND = {
  plugin: 'ci-band',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 140,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const PANE = {
  plugin: 'ci-band',
  component: 'Pane',
  requestId: 'ci-band',
  props: {
    title: 'CI',
    isFocused: true,
    bodyColumns: 100,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

// An idle band polls every five minutes, on the first 15 s tick past that.
const IDLE_POLL = 5 * 60_000 + 15_000

const START = { cwd: '/repo', surface: 'terminal', isInteractive: true } as const

const run = (name: string, status: string, conclusion: string) => ({
  __typename: 'CheckRun',
  name,
  status,
  conclusion,
  workflowName: 'CI',
  detailsUrl: `https://github.com/acme/app/actions/runs/1/job/${name}`,
  startedAt: '2023-11-14T22:00:00Z',
  completedAt: status === 'COMPLETED' ? '2023-11-14T22:04:00Z' : '0001-01-01T00:00:00Z',
})

const pr = (checks: readonly object[], extra: object = {}) =>
  JSON.stringify({
    number: 12,
    title: 'Add delete-after fields',
    url: PR,
    state: 'OPEN',
    isDraft: false,
    mergeable: 'MERGEABLE',
    reviewDecision: 'REVIEW_REQUIRED',
    headRefName: 'delete-after',
    statusCheckRollup: checks,
    ...extra,
  })

const RUNNING = [run('lint', 'COMPLETED', 'SUCCESS'), run('unit', 'IN_PROGRESS', '')]
const RED = [run('lint', 'COMPLETED', 'SUCCESS'), run('unit', 'COMPLETED', 'FAILURE')]
const GREEN = [run('lint', 'COMPLETED', 'SUCCESS'), run('unit', 'COMPLETED', 'SUCCESS')]

/** The host beneath the mod: `answers` maps a command line to what it prints. */
const world = (on: On, hasRepo = true) => {
  const answers = new Map<string, string>()
  const runs: string[] = []
  const toasts: string[] = []
  const chimes: string[] = []
  const suggestions: string[] = []
  const drafts: string[] = []
  const blits: string[] = []
  let status: string | undefined
  let bash = ''

  const clock = mock.clock(on, { now: NOW })
  mock.store(on)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/repo' }))
  on('session.repo', () => ({
    value: hasRepo ? { root: '/repo', remote: 'origin', internal: false, name: 'acme/app' } : null,
  }))
  on('process.run', (_, e) => {
    const line = e.argv.filter(arg => !arg.startsWith('number,')).join(' ')
    runs.push(line)
    const stdout = answers.get(line)

    return {
      value: {
        exitCode: stdout === undefined ? 1 : 0,
        stdout: stdout ?? '',
        stderr: stdout === undefined ? 'no pull requests found for branch' : '',
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    }
  })
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('ui.status', (_, e) => {
    status = e.text

    return { value: undefined }
  })
  on('audio.play', (_, e) => {
    chimes.push(e.clip.asset ?? '')

    return { value: undefined }
  })
  on('prompt.suggest', (_, e) => {
    suggestions.push(e.text)

    return { isShown: true }
  })
  on('ui.blit', (_, e) => {
    blits.push('key' in e ? e.key : '')

    return { value: {} }
  })
  on('prompt.read', () => ({ value: { text: '', cursor: 0 } }))
  on('prompt.fill', (_, e) => {
    drafts.push(e.text)

    return { isFilled: true }
  })
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('tool.call', { tool: 'Bash' }, () => ({
    result: { stdout: bash, stderr: '', interrupted: false },
  }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>beneath</Text>
  })

  return {
    answers,
    runs,
    toasts,
    chimes,
    suggestions,
    drafts,
    blits,
    clock,
    status: () => status,
    prints: (stdout: string) => {
      bash = stdout
    },
  }
}

const slash = (args = '') =>
  ({
    command: 'ci',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 140 },
  }) as const

test("the branch's PR is polled and drawn above the prompt", async ($, on) => {
  const host = world(on)
  host.answers.set('gh pr view --json', pr(RUNNING))

  await $.session.start(START)
  await host.clock.advance(300)
  expect(host.runs).toEqual(['gh pr view --json'])

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: 'PR #12' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '1/2' })).toBeDefined()
    expect(await ui.find({ key: 'details' })).toBeDefined()
    expect(await ui.find({ key: 'act' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: 'beneath' })).toBeDefined()
    expect(Boolean(await ui.find({ type: 'Svg' }))).toBe(surface === 'desktop')
    expect(Boolean(await ui.find({ type: 'Raster' }))).toBe(surface === 'terminal')
    await ui.unmount()
  }
  expect(host.toasts).toEqual([])
})

test('a running check pulses in place on the terminal, and stops when CI settles', async ($, on) => {
  const host = world(on)
  host.answers.set('gh pr view --json', pr(RUNNING))
  await $.session.start(START)
  await host.clock.advance(300)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Raster' })).toMatchObject({ props: { key: 'dots:0', columns: 2 } })
  await host.clock.advance(1400)
  expect(host.blits).toEqual(['dots:0', 'dots:0'])

  host.answers.set('gh pr view --json', pr(GREEN))
  await host.clock.advance(60_000)
  const settled = host.blits.length
  await host.clock.advance(5000)
  expect(host.blits.length).toBe(settled)
})

test('an all-green PR leaves the band for the status line', async ($, on) => {
  const host = world(on)
  host.answers.set('gh pr view --json', pr(GREEN))
  await $.session.start(START)
  await host.clock.advance(300)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: 'PR #12' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: 'beneath' })).toBeDefined()
  expect(host.status()).toBe('✓ PR #12 2 passed')
})

test('turning red toasts, chimes and suggests /ship green', async ($, on) => {
  const host = world(on)
  host.answers.set('gh pr view --json', pr(RUNNING))
  await $.session.start(START)
  await host.clock.advance(300)

  host.answers.set('gh pr view --json', pr(RED))
  await host.clock.advance(60_000)

  expect(host.toasts).toEqual(['✗ PR #12: CI / unit failed'])
  expect(host.chimes).toEqual(['sounds/fail.wav'])
  expect(host.suggestions).toEqual([`/ship green ${PR}`])

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'act' })
  expect(host.drafts).toEqual([`/ship green ${PR}`])
})

test('a red PR with checks still running keeps the fast poll', async ($, on) => {
  const host = world(on)
  host.answers.set('gh pr view --json', pr([...RED, run('e2e', 'IN_PROGRESS', '')]))
  await $.session.start(START)
  await host.clock.advance(300)

  await host.clock.advance(60_000)
  expect(host.runs.length).toBe(2)
})

test('turning green says so once and stays quiet after', async ($, on) => {
  const host = world(on)
  host.answers.set('gh pr view --json', pr(RUNNING))
  await $.session.start(START)
  await host.clock.advance(300)

  host.answers.set('gh pr view --json', pr(GREEN, { reviewDecision: 'APPROVED' }))
  await host.clock.advance(60_000)
  await host.clock.advance(10 * 60_000)

  expect(host.toasts).toEqual(['✓ PR #12: all 2 checks passed', 'PR #12 approved'])
  expect(host.chimes).toEqual(['sounds/pass.wav'])
})

test('a PR pasted into a prompt is tracked; hiding moves it to the status line', async ($, on) => {
  const host = world(on, false)
  host.answers.set(`gh pr view ${OTHER} --json`, pr(RED, { number: 7, url: OTHER }))
  await $.session.start(START)

  await $.prompt.submit({ text: `our pr has conflicts ${OTHER}`, origin: { kind: 'composer' }, wait: false })
  await host.clock.advance(15_000)
  expect(host.runs).toEqual([`gh pr view ${OTHER} --json`])

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: 'PR #7' })).toBeDefined()
  await ui.press({ key: 'hide' })
  expect(await ui.find({ type: 'Text', text: 'PR #7' })).toBeUndefined()
  expect(host.status()).toBe('✗ PR #7 1 failed')

  expect((await $.command.run(slash('clear'))).text).toBe('Stopped tracking.')
  expect(host.status()).toBeUndefined()
})

test('a patch that `evergreen patch` printed is tracked and announced', async ($, on) => {
  const host = world(on, false)
  const list = `evergreen list-patches --json -i ${PATCH}`
  const patch = (status: string) =>
    JSON.stringify({
      patch_id: PATCH,
      patch_number: 873,
      description: 'AQ checkpoint',
      status,
      activated: true,
      tasks: ['a', 'b'],
      start_time: '2023-11-14T22:00:00.45Z',
      finish_time: status === 'started' ? '0001-01-01T00:00:00Z' : '2023-11-14T22:10:00.85Z',
    })
  host.answers.set(list, patch('started'))
  await $.session.start(START)

  host.prints(`            ID : ${PATCH}\n        Status : created\n`)
  await $.tool.call({ tool: 'Bash', command: 'evergreen patch -p mms -y -f' })
  await host.clock.advance(15_000)
  expect(host.runs).toEqual([list])

  host.answers.set(list, patch('failed'))
  await host.clock.advance(60_000)
  expect(host.toasts).toEqual(['✗ patch 873 failed'])
  expect(host.suggestions).toEqual([])

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: 'patch 873' })).toBeDefined()
  expect(await ui.find({ key: 'act' })).toMatchObject({ props: { label: 'triage' } })
})

test('a merged PR is announced, then leaves the band', async ($, on) => {
  const host = world(on)
  host.answers.set('gh pr view --json', pr(GREEN))
  await $.session.start(START)
  await host.clock.advance(300)

  host.answers.set('gh pr view --json', pr(GREEN, { state: 'MERGED' }))
  await host.clock.advance(IDLE_POLL)
  expect(host.toasts).toEqual(['PR #12 merged'])

  const shown = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await shown.find({ type: 'Text', text: 'merged' })).toBeDefined()
  await shown.unmount()

  await host.clock.advance(IDLE_POLL)
  await host.clock.advance(IDLE_POLL)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: 'PR #12' })).toBeUndefined()
  expect(host.toasts).toEqual(['PR #12 merged'])
})

test('the pane lists what is not green, with links, on both surfaces', async ($, on) => {
  const host = world(on)
  host.answers.set('gh pr view --json', pr(RED, { mergeable: 'CONFLICTING' }))
  await $.session.start(START)
  await host.clock.advance(300)

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Link' })).toMatchObject({
      props: { href: 'https://github.com/acme/app/actions/runs/1/job/unit', label: 'CI / unit' },
    })
    expect(await ui.find({ type: 'Text', text: 'conflicts' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '1 failed · 1 passed' })).toBeDefined()
    expect((await ui.findAll({ type: 'Svg' })).length).toBe(surface === 'desktop' ? 2 : 0)
    expect((await ui.findAll({ type: 'Raster' })).length).toBe(surface === 'terminal' ? 1 : 0)
    expect((await ui.findAll({ type: 'Link' })).length).toBe(1)
    await ui.press({ key: 'expand:0' })
    expect((await ui.findAll({ type: 'Link' })).length).toBe(2)
    await ui.press({ key: 'expand:0' })
    await ui.unmount()
  }
})
