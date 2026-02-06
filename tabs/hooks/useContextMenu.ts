import { useState, useEffect } from "react"
import type { ArchivedWindow, SavedTab, SavedGroup } from "~lib/types"
import type { ContextMenuState } from "../components"

interface ContextMenuDeps {
    windows: ArchivedWindow[]
    updateArchivedWindow: (win: ArchivedWindow) => Promise<void>
}

export const useContextMenu = ({ windows, updateArchivedWindow }: ContextMenuDeps) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    if (contextMenu?.visible) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  const handleTabContextMenu = (e: React.MouseEvent, tab: SavedTab, tabIndex: number, windowId: string) => {
    e.preventDefault()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      tab,
      tabIndex,
      windowId
    })
  }

  const handleMoveTabToGroup = async (targetGroupIndex: number) => {
    if (!contextMenu) return
    
    const win = windows.find(w => w.id === contextMenu.windowId)
    if (!win) return

    const newTabs = [...win.tabs]
    
    // 1. Remove tab from current position
    // We rely on contextMenu.tabIndex being accurate at the time of click.
    // Since menu is modal-like (blocks interaction), logic should hold.
    const [movedTab] = newTabs.splice(contextMenu.tabIndex, 1)

    // 2. Update Group Index
    const updatedTab = { ...movedTab, groupIndex: targetGroupIndex }

    // 3. Find Insertion Index to maintain Contiguity
    let insertIndex = newTabs.length // Default: append to end (safe for Ungrouped or New Groups)

    if (targetGroupIndex !== -1) {
        // Find the last tab belonging to this group
        // Loop backwards
        let lastGroupIndex = -1
        for (let i = newTabs.length - 1; i >= 0; i--) {
            if (newTabs[i].groupIndex === targetGroupIndex) {
                 lastGroupIndex = i
                 break
            }
        }
        
        if (lastGroupIndex !== -1) {
            // Insert AFTER the last member of the group
            insertIndex = lastGroupIndex + 1
        }
        // If group has no members yet, appending to end is fine (visual order = creation order typically)
    }

    // 4. Insert at new position
    newTabs.splice(insertIndex, 0, updatedTab)
    
    await updateArchivedWindow({ ...win, tabs: newTabs })
    setContextMenu(null)
  }

  const handleMakeNewGroupWithTab = async () => {
    if (!contextMenu) return
    
    const win = windows.find(w => w.id === contextMenu.windowId)
    if (!win) return

    const newGroupIndex = win.groups.length
    const newGroup: SavedGroup = {
      id: crypto.randomUUID(),
      originalId: -1,
      title: contextMenu.tab?.title || "New Group",
      color: "grey",
      collapsed: false
    }

    // Logic: Remove tab, Append to end (creates new group visually at bottom), Add Group to registry
    const newTabs = [...win.tabs]
    const [movedTab] = newTabs.splice(contextMenu.tabIndex, 1)
    
    const updatedTab = { ...movedTab, groupIndex: newGroupIndex }
    newTabs.push(updatedTab)

    await updateArchivedWindow({ 
      ...win, 
      groups: [...win.groups, newGroup],
      tabs: newTabs 
    })
    setContextMenu(null)
  }

  return {
      contextMenu,
      setContextMenu,
      handleTabContextMenu,
      handleMoveTabToGroup,
      handleMakeNewGroupWithTab
  }
}
