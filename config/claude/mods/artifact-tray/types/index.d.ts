export type ArtifactKind = 'page' | 'doc' | 'video' | 'image'

export type Artifact = {
  path: string
  kind: ArtifactKind
  bytes: number
  at: number
  isSeen: boolean
  /** The tool call that wrote it, whose transcript row carries its card; null when unknown. */
  callId: string | null
}

/** A file's peek: its title, opening words and section headings; `svg` its markup, when it is one. */
export type Preview = {
  path: string
  title: string
  lead: string
  heads: string[]
  svg: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'artifact-tray': {
      items: Artifact[]
      earlier: Artifact[]
      shown: string | null
      picked: string | null
      preview: Preview | null
    }
  }
}
