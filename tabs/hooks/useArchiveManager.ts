import { useState, useEffect, useCallback } from "react"
import { 
  getArchivedWindows, 
  deleteArchivedWindow, 
  updateArchivedWindow, 
  saveArchivedWindow, 
  getTrashedItems, 
  addToTrash, 
  removeFromTrash 
} from "~lib/storage"
import type { ArchivedWindow, SavedTab, SavedGroup, TrashedItem } from "~lib/types"
import { sanitizeUrl } from "../utils/url"

export const useArchiveManager = () => {
  const [windows, setWindows] = useState<ArchivedWindow[]>([])
  const [trashedItems, setTrashedItems] = useState<TrashedItem[]>([])

  const loadWindows = useCallback(async () => {
    let list = await getArchivedWindows()

    // Backfill IDs if missing (migration logic)
    let modified = false
    list.forEach(w => {
        w.groups.forEach(g => {
            if (!g.id) {
                g.id = crypto.randomUUID()
                modified = true
            }
        })
        w.tabs.forEach(t => {
            if (!t.id) {
                t.id = crypto.randomUUID()
                modified = true
            }
        })
    })

    if (modified) {
        await chrome.storage.local.set({ "archivedWindows": list })
    }

    setWindows(list)
    
    // Load Trashed Items
    const trash = await getTrashedItems()
    setTrashedItems(trash)
  }, [])

  useEffect(() => {
    loadWindows()
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes["archivedWindows"]) loadWindows()
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [loadWindows])

  const toggleStar = async (win: ArchivedWindow) => {
    await updateArchivedWindow({ ...win, isStarred: !win.isStarred })
  }

  const updateTitle = async (winId: string, newTitle: string) => {
    const win = windows.find(w => w.id === winId)
    if (win && win.title !== newTitle) {
      await updateArchivedWindow({ ...win, title: newTitle })
    }
  }

  const deleteWindow = async (id: string) => {
    if (confirm("Are you sure you want to delete this archive?")) {
      await deleteArchivedWindow(id)
    }
  }

  const deleteTab = async (tab: SavedTab, tabIndex: number, winId: string) => {
    const win = windows.find(w => w.id === winId)
    if (!win) return

    const newTabs = [...win.tabs]
    newTabs.splice(tabIndex, 1)

    // Add to Trash
    const trashItem: TrashedItem = {
        id: crypto.randomUUID(),
        type: 'tab',
        item: tab,
        windowId: winId,
        windowTitle: win.title,
        timestamp: Date.now()
    }
    await addToTrash(trashItem)
    setTrashedItems(await getTrashedItems())

    const updatedWin = { ...win, tabs: newTabs }
    if (updatedWin.title.match(/\(\d+ tabs\)/)) {
      updatedWin.title = updatedWin.title.replace(/\(\d+ tabs\)/, `(${newTabs.length} tabs)`)
    }
    await updateArchivedWindow(updatedWin)
  }

  const deleteGroup = async (winId: string, groupIndex: number) => {
    if (!confirm("Delete this group and all its tabs?")) return

    const win = windows.find(w => w.id === winId)
    if (!win) return

    const group = win.groups[groupIndex]
    const tabsInGroup = win.tabs.filter(t => t.groupIndex === groupIndex)
    
    const trashItem: TrashedItem = {
        id: crypto.randomUUID(),
        type: 'group',
        item: group,
        windowId: winId,
        windowTitle: win.title,
        timestamp: Date.now(),
        tabs: tabsInGroup
    }
    await addToTrash(trashItem)
    setTrashedItems(await getTrashedItems())

    const newTabs = win.tabs.filter(t => t.groupIndex !== groupIndex)
    const updatedWin = { ...win, tabs: newTabs }
    if (updatedWin.title.match(/\(\d+ tabs\)/)) {
      updatedWin.title = updatedWin.title.replace(/\(\d+ tabs\)/, `(${newTabs.length} tabs)`)
    }
    await updateArchivedWindow(updatedWin)
  }

  const restoreWindow = async (win: ArchivedWindow) => {
    if (win.tabs.length === 0) return

    const firstTab = win.tabs[0]
    const createdWindow = await chrome.windows.create({ url: firstTab.url, focused: true })
    if (!createdWindow?.id) return

    const windowId = createdWindow.id
    const firstTabId = createdWindow.tabs?.[0]?.id

    if (firstTabId && firstTab.pinned) {
      await chrome.tabs.update(firstTabId, { pinned: true })
    }

    const groupTabIds: Record<number, number[]> = {}

    const registerTabGroup = (tabId: number, t: SavedTab) => {
      if (t.groupIndex !== -1 && t.groupIndex !== undefined) {
        if (!groupTabIds[t.groupIndex]) groupTabIds[t.groupIndex] = []
        groupTabIds[t.groupIndex].push(tabId)
      }
    }

    if (firstTabId) registerTabGroup(firstTabId, firstTab)

    for (let i = 1; i < win.tabs.length; i++) {
      const t = win.tabs[i]
      const createdTab = await chrome.tabs.create({
        windowId,
        url: t.url,
        pinned: t.pinned,
        active: false
      })
      if (createdTab.id) registerTabGroup(createdTab.id, t)
    }

    for (const [gIndexStr, tabIds] of Object.entries(groupTabIds)) {
      const gIndex = parseInt(gIndexStr)
      const groupInfo = win.groups[gIndex]
      if (groupInfo) {
        const groupId = await chrome.tabs.group({ tabIds, createProperties: { windowId } })
        await chrome.tabGroups.update(groupId, {
          title: groupInfo.title,
          color: groupInfo.color,
          collapsed: groupInfo.collapsed
        })
      }
    }
  }

  const restoreFromTrash = async (item: TrashedItem) => {
      const win = windows.find(w => w.id === item.windowId)
      if (!win) {
          alert(`Original window "${item.windowTitle}" no longer exists.`)
          return
      }

      if (item.type === 'tab') {
          const tab = item.item as SavedTab
          const newTabs = [...win.tabs, tab]
          await updateArchivedWindow({ ...win, tabs: newTabs })
      } else if (item.type === 'group') {
          const group = item.item as SavedGroup
          const newGroupIndex = win.groups.length
          const restoredTabs = (item.tabs || []).map(t => ({ ...t, groupIndex: newGroupIndex }))
          const newGroups = [...win.groups, group]
          const newTabs = [...win.tabs, ...restoredTabs]
          await updateArchivedWindow({ ...win, groups: newGroups, tabs: newTabs })
      }

      await removeFromTrash(item.id)
      setTrashedItems(await getTrashedItems())
      loadWindows()
  }

  const permanentDelete = async (itemId: string) => {
    if (confirm("Permanently delete this item? This cannot be undone.")) {
      await removeFromTrash(itemId)
      setTrashedItems(await getTrashedItems())
    }
  }

  const createGroup = async (winId: string, title: string, color: chrome.tabGroups.ColorEnum) => {
      const win = windows.find(w => w.id === winId)
      if (!win) return

      const newGroup: SavedGroup = {
          id: crypto.randomUUID(),
          originalId: -1,
          title,
          color,
          collapsed: false
      }

      const emptyTab: SavedTab = {
          id: crypto.randomUUID(),
          url: "about:blank",
          title: "New Tab",
          favIconUrl: "",
          pinned: false,
          groupIndex: win.groups.length
      }

      const updatedWin = {
          ...win,
          groups: [...win.groups, newGroup],
          tabs: [...win.tabs, emptyTab]
      }
      await updateArchivedWindow(updatedWin)
  }

  // Helper for Add Tab (Logic only)
  const addTabToWindow = async (winId: string, url: string) => {
    const win = windows.find(w => w.id === winId)
    if (!win) return

    const sanitized = sanitizeUrl(url)
    const newTab: SavedTab = {
      id: crypto.randomUUID(),
      url: sanitized,
      title: url,
      favIconUrl: "",
      pinned: false,
      groupIndex: -1
    }

    const updatedWin = {
      ...win,
      tabs: [...win.tabs, newTab]
    }
    await updateArchivedWindow(updatedWin)
  }

  return {
    windows,
    setWindows, // exposed for DnD if needed, or prefer action
    trashedItems,
    loadWindows,
    toggleStar,
    updateTitle,
    deleteWindow,
    deleteTab,
    deleteGroup,
    restoreWindow,
    restoreFromTrash,
    permanentDelete,
    createGroup,
    addTabToWindow,
    updateArchivedWindow // exposed for direct updates if needed (e.g. context menu)
  }
}
