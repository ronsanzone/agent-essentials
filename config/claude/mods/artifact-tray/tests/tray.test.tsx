import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const HOME = '/home/dev'
const NOW = 1_700_000_000_000
const REPORT = `${HOME}/notes/demo/report.html`
const PLAN = `${HOME}/notes/demo/plan.md`
const SURFACES = ['terminal', 'desktop'] as const

const BAND = {
  plugin: 'artifact-tray',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const PANE = {
  plugin: 'artifact-tray',
  component: 'Pane',
  requestId: 'artifact-tray',
  props: {
    title: 'Artifacts',
    isFocused: true,
    bodyColumns: 120,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

const result = (id: string) =>
  ({
    plugin: 'artifact-tray',
    component: 'ToolResult',
    requestId: id,
    props: { tool_use_id: id, tool: 'Write', output: {}, isErrored: false },
  }) as const

const slash = (command: string, args = '') =>
  ({
    command,
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 120 },
  }) as const

/** The host beneath the mod: files by path to their mtime, and what the mod asked of it. */
const world = (on: On, files: Readonly<Record<string, number>>, stdout = '') => {
  const runs: string[][] = []
  const toasts: string[] = []

  mock.clock(on, { now: NOW })
  mock.store(on)
  mock.env(on, { HOME })
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('fs.stat', (_, e) => {
    const mtimeMs = files[e.path]
    if (mtimeMs === undefined) throw new Error(`ENOENT ${e.path}`)

    return { value: { kind: 'file', size: 2048, mtimeMs, isLink: false } }
  })
  on('fs.read', () => ({
    value: '# Plan\n\nShip it *today*.\n\n| Try | Expect |\n|---|---|\n| a | b |\n\n## Risks\n',
  }))
  on('process.run', (_, e) => {
    runs.push([...e.argv])

    return {
      value: {
        exitCode: 0,
        stdout: '',
        stderr: '',
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    }
  })
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('tool.call', { tool: 'Write' }, (_, e) => ({
    result: {
      type: 'create',
      filePath: e.file_path,
      content: e.content,
      structuredPatch: [],
      originalFile: null,
    },
  }))
  on('tool.call', { tool: 'Bash' }, () => ({
    result: { stdout, stderr: '', interrupted: false },
  }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.focus', () => ({}))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('ui.render', { component: 'ToolResult' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>native row</Text>
  })
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>beneath</Text>
  })

  return { runs, toasts }
}

test('a report written under the folder is offered above the prompt, on digits', async ($, on) => {
  const { runs, toasts } = world(on, { [REPORT]: NOW })

  await $.tool.call({ tool: 'Write', file_path: REPORT, content: '<html></html>' })
  expect(toasts).toEqual([])

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: 'report.html' })).toBeDefined()
    expect(await ui.find({ key: 'open' })).toMatchObject({ props: { hotkey: '1' } })
    expect(await ui.find({ key: 'annotate' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'beneath' })).toBeDefined()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'open' })
  expect(runs).toEqual([['open', REPORT]])
  expect(await ui.find({ key: 'open' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: 'beneath' })).toBeDefined()
})

test('the offer lasts until the next prompt, so digits go back to typing', async ($, on) => {
  world(on, { [REPORT]: NOW })
  await $.tool.call({ tool: 'Write', file_path: REPORT, content: '<html></html>' })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ key: 'open' })).toBeDefined()
  await $.prompt.submit({ text: '1 more thing', origin: { kind: 'composer' }, wait: false })
  expect(await ui.find({ key: 'open' })).toBeUndefined()
})

test('the tool call that wrote a file carries its card in the transcript', async ($, on) => {
  const { runs } = world(on, { [REPORT]: NOW })
  await $.tool.call({ tool: 'Write', file_path: REPORT, content: '<html></html>', tool_use_id: 'call-1' })

  for (const surface of SURFACES) {
    const row = await $.ui.mount({ ...result('call-1'), surface })
    expect(await row.find({ type: 'Text', text: 'native row' })).toBeDefined()
    expect(await row.find({ type: 'Text', text: 'report.html' })).toBeDefined()
    await row.unmount()
  }

  const other = await $.ui.mount({ ...result('call-2'), surface: 'terminal' })
  expect(await other.find({ type: 'Text', text: 'report.html' })).toBeUndefined()

  const row = await $.ui.mount({ ...result('call-1'), surface: 'terminal' })
  await row.press({ key: 'open:0' })
  expect(runs).toEqual([['open', REPORT]])
})

test('a write outside the folders is ignored', async ($, on) => {
  world(on, { '/tmp/report.html': NOW })

  await $.tool.call({ tool: 'Write', file_path: '/tmp/report.html', content: '<html></html>' })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ key: 'open' })).toBeUndefined()
})

test('a file a command just wrote is offered; an older one it named is not', async ($, on) => {
  const { runs } = world(
    on,
    { [`${HOME}/notes/demo/new.mp4`]: NOW, [`${HOME}/notes/demo/old.mp4`]: NOW - 3_600_000 },
    'rendered ~/notes/demo/new.mp4 from ~/notes/demo/old.mp4\n',
  )

  await $.tool.call({ tool: 'Bash', command: 'render' })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: 'new.mp4' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'old.mp4' })).toBeUndefined()

  expect((await $.command.run(slash('open'))).text).toBe('Opened new.mp4.')
  expect(runs).toEqual([['open', `${HOME}/notes/demo/new.mp4`]])
})

test('/open says so when the session wrote nothing', async ($, on) => {
  world(on, {})

  expect((await $.command.run(slash('open'))).text).toBe('No artifacts yet.')
})

test('in the pane the arrows preview and Enter opens', async ($, on) => {
  const { runs } = world(on, { [PLAN]: NOW, [REPORT]: NOW })
  await $.tool.call({ tool: 'Write', file_path: PLAN, content: '# Plan' })
  await $.tool.call({ tool: 'Write', file_path: REPORT, content: '<html></html>' })
  await $.command.run(slash('tray'))

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ key: 'pick:0', text: 'report.html' })).toBeDefined()
    expect(await ui.find({ key: 'pick:1', text: 'plan.md' })).toBeDefined()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await $.ui.focus({
    component: 'Pane',
    requestId: 'artifact-tray',
    plugin: 'artifact-tray',
    element: 'pick:1',
    origin: { kind: 'person' },
  })
  expect(await ui.find({ type: 'Text', text: 'Plan' })).toMatchObject({ props: { bold: true } })
  expect(await ui.find({ type: 'Text', text: 'Ship it today.' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '§ Risks' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Expect/ })).toBeUndefined()
  expect(await ui.find({ key: 'annotate' })).toBeDefined()
  expect(runs).toEqual([])

  await ui.press({ key: 'pick:1' })
  expect(runs).toEqual([['open', PLAN]])
})
