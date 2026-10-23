import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderSurface } from 'claude-code'

import type { Artifact, ArtifactKind, Preview } from '../types'

type Engine = EngineInterface

const PANE = 'artifact-tray'
const TITLE = 'Artifacts'
const KEEP = 40
const EARLIER = 15
const ANNOTATE = '/plannotator-annotate'
const PATHS =
  /(?:~|\/)[^\s"'`<>|;()]*\.(?:html?|md|pdf|mp4|mov|webm|png|jpe?g|gif|svg)\b/gi

const KINDS: Record<string, ArtifactKind> = {
  html: 'page',
  htm: 'page',
  md: 'doc',
  pdf: 'doc',
  mp4: 'video',
  mov: 'video',
  webm: 'video',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  svg: 'image',
}
const GLYPH: Record<ArtifactKind, string> = {
  page: '▤',
  doc: '¶',
  video: '▶',
  image: '◩',
}
const TINT: Record<ArtifactKind, string> = {
  page: '#3b82f6',
  doc: '#8b5cf6',
  video: '#ef4444',
  image: '#10b981',
}
const LETTER: Record<ArtifactKind, string> = {
  page: 'H',
  doc: 'D',
  video: 'V',
  image: 'I',
}

const items = atom({ plugin: 'artifact-tray', key: 'items' } as const, [])
const earlier = atom({ plugin: 'artifact-tray', key: 'earlier' } as const, [])
const shown = atom({ plugin: 'artifact-tray', key: 'shown' } as const, null)
const picked = atom({ plugin: 'artifact-tray', key: 'picked' } as const, null)
const preview = atom({ plugin: 'artifact-tray', key: 'preview' } as const, null)

const extOf = (path: string) => path.slice(path.lastIndexOf('.') + 1).toLowerCase()
const nameOf = (path: string) => path.slice(path.lastIndexOf('/') + 1)
const canAnnotate = (path: string) => /^(md|html?)$/.test(extOf(path))

const folderOf = (path: string, home: string) => {
  const folder = path.slice(0, path.lastIndexOf('/'))

  return home !== '' && folder.startsWith(home) ? `~${folder.slice(home.length)}` : folder
}

const sizeOf = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const ageOf = (ms: number) => {
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h`

  return `${Math.floor(minutes / 60 / 24)}d`
}

const badgeOf = (kind: ArtifactKind) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">` +
  `<rect width="18" height="18" rx="4" fill="${TINT[kind]}"/>` +
  `<text x="9" y="13" font-size="10" font-family="system-ui,sans-serif" font-weight="700" ` +
  `text-anchor="middle" fill="#fff">${LETTER[kind]}</text></svg>`

const plain = (text: string) =>
  text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * A file's peek: title, opening words and headings. Never the document itself: a table or
 * a wide code block drawn into a narrow pane is worse than no preview.
 */
const sketch = async ($: Engine, path: string): Promise<Preview | null> => {
  const ext = extOf(path)
  if (ext !== 'md' && ext !== 'html' && ext !== 'htm' && ext !== 'svg') return null

  const text = await $.fs.read(path).catch(() => null)
  if (text === null) return null
  if (ext === 'svg') {
    return { path, title: nameOf(path), lead: '', heads: [], svg: text.length <= 131072 ? text : null }
  }
  if (ext === 'md') {
    const lines = text.replace(/^---\n[\s\S]*?\n---\n/, '').split('\n')
    const isProse = (line: string) => line.trim() !== '' && !/^\s*(#|\||```|[-*+] |\d+\. |<)/.test(line)
    const start = lines.findIndex(isProse)
    const stop = start < 0 ? -1 : lines.findIndex((line, index) => index > start && !isProse(line))

    return {
      path,
      title: plain(lines.find(line => /^#\s+/.test(line)) ?? nameOf(path)),
      lead: start < 0 ? '' : plain(lines.slice(start, stop < 0 ? undefined : stop).join(' ')).slice(0, 280),
      heads: lines.filter(line => /^#{2,3}\s+/.test(line)).map(plain).slice(0, 8),
      svg: null,
    }
  }

  const strip = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const body = text.replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, ' ')

  return {
    path,
    title: /<title[^>]*>([^<]*)<\/title>/i.exec(text)?.[1]?.trim() || nameOf(path),
    lead: strip(body.replace(/<h[1-6][\s\S]*?<\/h[1-6]>/gi, ' ')).slice(0, 280),
    heads: [...body.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
      .map(match => strip(String(match[1])))
      .filter(head => head !== '')
      .slice(0, 8),
    svg: null,
  }
}

const homeOf = async ($: Engine) => (await $.env.get('HOME')) ?? ''

const markSeen = async ($: Engine, path: string) => {
  await update($, items, list =>
    list.map(one => (one.path === path ? { ...one, isSeen: true } : one)),
  )
  await update($, shown, now => (now === path ? null : now))
}

const launch = async ($: Engine, path: string, argv: readonly string[] = []) => {
  const ran = await $.process.run(['open', ...argv, path]).catch(() => $.process.run(['xdg-open', path]))
  if (ran.exitCode !== 0) {
    $.ui.toast(`Could not open ${nameOf(path)}: ${ran.stderr.trim().slice(0, 80)}`)

    return false
  }
  await markSeen($, path)

  return true
}

const annotate = async ($: Engine, path: string) => {
  const command = `${ANNOTATE} ${path}`
  const draft = await $.prompt.read()
  const filled =
    draft.text.trim() === '' ? await $.prompt.fill({ text: command }) : { isFilled: false }
  $.ui.toast(filled.isFilled ? 'Drafted in the prompt · Enter runs it' : `Run ${command}`)
  await markSeen($, path)
}

const copy = async ($: Engine, path: string, surface: RenderSurface) => {
  const took = await $.ui.copy({ text: path, surface })
  const isCopied =
    took.isCopied ||
    (await $.process.run(['pbcopy'], { stdin: path }).then(
      ran => ran.exitCode === 0,
      () => false,
    ))
  $.ui.toast(isCopied ? `Copied ${path}` : 'Could not reach a clipboard')
}

/** The pane's rows in the order it draws them: this session's, then earlier ones. */
const listed = async ($: Engine) => [
  ...(await read($, items)),
  ...(await read($, earlier)).slice(0, EARLIER),
]

/** Points the pane's preview at a file. */
const choose = async ($: Engine, path: string) => {
  if ((await read($, picked)) === path) return
  await update($, picked, () => path)
  const peek = await sketch($, path)
  await update($, preview, () => peek)
}

const showTray = async ($: Engine) => {
  const first = (await listed($))[0]
  if (first !== undefined && (await read($, picked)) === null) await choose($, first.path)

  return $.ui.open({ id: PANE, title: TITLE, focus: true, closeOnEscape: true })
}

/** Records the paths that are artifacts and offers the first one not seen before. */
const collect = async (
  $: Engine,
  folders: readonly string[],
  paths: readonly string[],
  since: number | null,
  callId: string | null,
) => {
  const home = await homeOf($)
  const roots = folders.map(folder => (folder.startsWith('~') ? home + folder.slice(1) : folder))
  const now = await $.clock.now()
  const fresh: Artifact[] = []

  for (const raw of paths) {
    const path = raw.startsWith('~') ? home + raw.slice(1) : raw
    const kind = KINDS[extOf(path)]
    if (kind === undefined || !roots.some(root => path.startsWith(`${root}/`))) continue

    const stat = await $.fs.stat(path).catch(() => undefined)
    if (stat === undefined || stat.kind !== 'file') continue
    if (since !== null && stat.mtimeMs < since) continue

    fresh.push({ path, kind, bytes: stat.size, at: now, isSeen: false, callId })
  }
  if (fresh.length === 0) return

  const known = new Set((await read($, items)).map(one => one.path))
  const isFresh = (one: Artifact) => fresh.some(other => other.path === one.path)
  await update($, items, list => [...fresh, ...list.filter(one => !isFresh(one))].slice(0, KEEP))
  await update($, earlier, list => list.filter(one => !isFresh(one)))
  await $.store.set(
    'recent',
    [...(await read($, items)), ...(await read($, earlier))].slice(0, KEEP),
  )

  // Images are kept for the tray but not offered: a run of screenshots would bury the prompt.
  const first = fresh.find(one => !known.has(one.path) && one.kind !== 'image')
  if (first !== undefined) await update($, shown, () => first.path)
}

export const register: Register = (on, options) => {
  const folders = String(options.folders ?? '~/notes')
    .split(',')
    .map(folder => folder.trim().replace(/\/+$/, ''))
    .filter(folder => folder !== '')

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'open',
      description: 'Open the newest artifact, or the one a number or word picks',
      argumentHint: '[n | name]',
      immediate: true,
    })
    await $.command.register({
      name: 'tray',
      description: 'Browse the reports, docs and videos this session wrote',
      immediate: true,
    })

    const stored = await $.store.get('recent')
    const mine = new Set((await read($, items)).map(one => one.path))
    const past = Array.isArray(stored) ? (stored as Artifact[]) : []
    await update($, earlier, () => past.filter(one => !mine.has(one.path)))

    return next(e)
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true) {
      await collect($, folders, [e.file_path], null, e.tool_use_id).catch(() => undefined)
    }

    return ran
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const startedAt = await $.clock.now()
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true) {
      const text = `${e.command}\n${ran.result.stdout}`
      const paths = [...new Set(text.match(PATHS) ?? [])].slice(0, 8)
      await collect($, folders, paths, startedAt - 2000, e.tool_use_id).catch(() => undefined)
    }

    return ran
  })

  // The offer holds the digit keys of an empty prompt, so it lasts one prompt and no longer.
  on('prompt.submit', async ($, e, next) => {
    if (e.origin.kind === 'composer' && (await read($, shown)) !== null) {
      await update($, shown, () => null)
    }

    return next(e)
  })

  on('command.run', { command: 'open' }, async ($, e) => {
    const all = await listed($)
    const want = e.args.trim().toLowerCase()
    const hit = /^\d*$/.test(want)
      ? all[Math.max(0, Number(want || 1) - 1)]
      : all.find(one => nameOf(one.path).toLowerCase().includes(want))
    if (hit === undefined) {
      return { text: all.length === 0 ? 'No artifacts yet.' : `No artifact matches "${want}".` }
    }

    return (await launch($, hit.path)) ? { text: `Opened ${nameOf(hit.path)}.` } : {}
  })

  on('command.run', { command: 'tray' }, async $ => {
    const opened = await showTray($)

    return opened.isPlaced ? {} : { text: `Artifacts pane is waiting: ${opened.reason}` }
  })

  // The arrows preview: the ring landing on a row points the preview at it.
  on('ui.focus', { requestId: PANE }, async ($, e, next) => {
    const moved = await next(e)
    const index = /^pick:(\d+)$/.exec(e.element ?? '')?.[1]
    const item = index === undefined ? undefined : (await listed($))[Number(index)]
    if (item !== undefined) await choose($, item.path).catch(() => undefined)

    return moved
  })

  // A card under the tool call that wrote the file, where the eye already is.
  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    const drawn = await next(e)
    const made = (await read($, items)).filter(one => one.callId === e.props.tool_use_id)
    if (made.length === 0) return drawn

    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {drawn}
        {made.slice(0, 4).map((item, index) => (
          <Box gap={2} marginLeft={2}>
            <Box gap={1}>
              <Text bold>▎{GLYPH[item.kind]}</Text>
              <Text bold>{nameOf(item.path)}</Text>
              <Text dimColor>{sizeOf(item.bytes)}</Text>
            </Box>
            <Button
              key={`open:${index}`}
              plain
              variant="primary"
              label="open"
              onPress={() => launch($, item.path)}
            />
            {canAnnotate(item.path) && (
              <Button
                key={`annotate:${index}`}
                plain
                dimColor
                label="annotate"
                onPress={() => annotate($, item.path)}
              />
            )}
            <Button
              key={`copy:${index}`}
              plain
              dimColor
              label="copy path"
              onPress={press => copy($, item.path, press.surface)}
            />
          </Box>
        ))}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const path = await read($, shown)
    const list = await read($, items)
    const item = list.find(one => one.path === path)
    if (e.props.hasSurvey || item === undefined) return below

    const { Box, Button, Text } = $.ui.resolve(e)
    const more = list.filter(one => !one.isSeen && one.path !== item.path).length

    return (
      <Box flexDirection="column">
        <Box gap={2}>
          <Box gap={1}>
            <Text bold>▎{GLYPH[item.kind]}</Text>
            <Text bold>{nameOf(item.path)}</Text>
            <Text dimColor>
              {sizeOf(item.bytes)}
              {more > 0 ? ` · +${more} more` : ''}
            </Text>
          </Box>
          <Button
            key="open"
            hotkey="1"
            plain
            variant="primary"
            label="open"
            onPress={() => launch($, item.path)}
          />
          {canAnnotate(item.path) && (
            <Button
              key="annotate"
              hotkey="2"
              plain
              label="annotate"
              onPress={() => annotate($, item.path)}
            />
          )}
          <Button
            key="copy"
            hotkey="3"
            plain
            label="copy path"
            onPress={press => copy($, item.path, press.surface)}
          />
          <Button key="tray" hotkey="4" plain label="tray" onPress={() => showTray($)} />
          <Button
            key="dismiss"
            hotkey="0"
            plain
            dimColor
            role="dismiss"
            label="dismiss"
            onPress={() => update($, shown, () => null)}
          />
        </Box>
        {below}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const session = await read($, items)
    const all = await listed($)
    const first = all[0]
    if (first === undefined) {
      return (
        <Box flexDirection="column">
          <Text dimColor>Nothing yet.</Text>
          <Text dimColor>Files written under {folders.join(', ')} show up here.</Text>
        </Box>
      )
    }

    const pickedPath = await read($, picked)
    const pick = all.find(one => one.path === pickedPath) ?? first
    const view = await read($, preview)
    const peek = view !== null && view.path === pick.path ? view : null
    const now = await $.clock.now()
    const home = await homeOf($)
    const columns = e.props.bodyColumns
    const isWide = columns >= 96
    const listColumns = isWide ? Math.min(46, Math.floor(columns * 0.4)) : columns
    const viewColumns = Math.max(20, isWide ? columns - listColumns - 3 : columns)
    const nameColumns = Math.max(12, listColumns - 18)

    const row = (one: Artifact, index: number) => {
      const isPicked = one.path === pick.path
      const name = nameOf(one.path)

      return (
        <Box gap={1}>
          <Text bold>{isPicked ? '▎' : ' '}</Text>
          {e.surface === 'desktop' ? (
            (() => {
              const { Svg } = $.ui.resolve(e)

              return <Svg source={badgeOf(one.kind)} alt={one.kind} width={18} height={18} />
            })()
          ) : (
            <Text>{GLYPH[one.kind]}</Text>
          )}
          <Box width={nameColumns}>
            <Button
              key={`pick:${index}`}
              plain
              dimColor={!isPicked}
              {...(index === 0 ? { autoFocus: true as const } : {})}
              label={name.length <= nameColumns ? name : `${name.slice(0, nameColumns - 1)}…`}
              onPress={() => launch($, one.path)}
            />
          </Box>
          <Text dimColor>
            {sizeOf(one.bytes)} · {ageOf(now - one.at)}
          </Text>
        </Box>
      )
    }

    const body = () => {
      if (peek !== null && peek.svg !== null && e.surface === 'desktop') {
        const { Svg } = $.ui.resolve(e)

        return <Svg source={peek.svg} alt={nameOf(pick.path)} />
      }
      if (e.surface === 'terminal' && extOf(pick.path) === 'png') {
        const { Image } = $.ui.resolve(e)
        const imageColumns = Math.max(10, Math.min(60, viewColumns - 2))

        return (
          <Image
            source={{ file: pick.path, format: 'png' }}
            columns={imageColumns}
            rows={Math.round(imageColumns / 3)}
            alt={nameOf(pick.path)}
          />
        )
      }
      if (peek === null || peek.svg !== null) return <Text dimColor>No preview for this kind.</Text>

      return (
        <Box flexDirection="column">
          <Text bold>{peek.title}</Text>
          {peek.lead !== '' && <Text>{peek.lead}</Text>}
          {peek.heads.length > 0 && <Text dimColor> </Text>}
          {peek.heads.map(head => (
            <Text dimColor wrap="truncate-end">
              § {head}
            </Text>
          ))}
        </Box>
      )
    }

    // Bracketed buttons and one dim legend: the accent color a plain hotkey is drawn in
    // does not read on every theme's pane.
    return (
      <Box flexDirection={isWide ? 'row' : 'column'} gap={isWide ? 3 : 1}>
        <Box flexDirection="column" width={listColumns}>
          {session.length > 0 && <Text dimColor>THIS SESSION</Text>}
          {session.map(row)}
          {all.length > session.length && <Text dimColor>EARLIER</Text>}
          {all.slice(session.length).map((one, index) => row(one, session.length + index))}
        </Box>
        <Box flexDirection="column" width={viewColumns} gap={1}>
          {!isWide && <Text dimColor>{'─'.repeat(viewColumns)}</Text>}
          <Text dimColor wrap="truncate-start">
            {folderOf(pick.path, home)}/
          </Text>
          {body()}
          <Box gap={1}>
            <Button key="open" hotkey="o" label="open" onPress={() => launch($, pick.path)} />
            {canAnnotate(pick.path) && (
              <Button
                key="annotate"
                hotkey="a"
                label="annotate"
                onPress={() => annotate($, pick.path)}
              />
            )}
            <Button
              key="reveal"
              hotkey="r"
              label="reveal"
              onPress={() => launch($, pick.path, ['-R'])}
            />
            <Button
              key="copy"
              hotkey="c"
              label="copy path"
              onPress={press => copy($, pick.path, press.surface)}
            />
          </Box>
          <Text dimColor>
            ↑↓ move · enter open{canAnnotate(pick.path) ? ' · a annotate' : ''} · r reveal · c copy
          </Text>
        </Box>
      </Box>
    )
  })
}
