export type CiState = 'fail' | 'run' | 'wait' | 'pass' | 'skip'

export type CiCheck = {
  name: string
  state: CiState
  url: string | null
  startedAt: number | null
  endedAt: number | null
}

export type CiItem = {
  kind: 'pr' | 'patch'
  /** The PR's URL, or the patch's id. */
  id: string
  url: string
  label: string
  title: string
  /** A PR's checks; a patch's one row, the patch itself. */
  checks: CiCheck[]
  life: 'open' | 'draft' | 'merged' | 'closed'
  hasConflict: boolean
  review: 'approved' | 'changes' | 'required' | 'none'
  /** Found from the session's branch rather than tracked by hand. */
  isAuto: boolean
  /** 0 until the first poll answers. */
  polledAt: number
}

declare module 'claude-code' {
  interface PluginState {
    'ci-band': {
      items: CiItem[]
      ignored: string[]
      isHidden: boolean
      isExpanded: boolean
    }
  }
}
