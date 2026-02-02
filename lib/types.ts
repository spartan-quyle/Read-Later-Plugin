export interface SavedGroup {
  originalId: number
  title: string
  color: chrome.tabGroups.ColorEnum
  collapsed: boolean
}

export interface SavedTab {
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
