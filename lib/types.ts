export interface SavedGroup {
  id?: string // uuid for DnD
  originalId: number
  title: string
  color: chrome.tabGroups.ColorEnum
  collapsed: boolean
}

export interface SavedTab {
  id?: string // uuid for DnD
  url: string
  title: string
  favIconUrl: string
  pinned: boolean
  groupIndex: number
}

export interface ArchivedWindow {
  id: string
  timestamp: number
  title: string
  tabs: SavedTab[]
  groups: SavedGroup[]
  isStarred?: boolean
}

export interface TrashedItem {
    id: string
    type: 'tab' | 'group'
    item: SavedTab | SavedGroup
    windowId: string
    windowTitle: string
    timestamp: number
    tabs?: SavedTab[] // For group deletion, store associated tabs
}

export interface AllData {
    archivedWindows: ArchivedWindow[]
    trashedItems: TrashedItem[]
    version: string
}

