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
    newTabs[contextMenu.tabIndex] = { ...newTabs[contextMenu.tabIndex], groupIndex: targetGroupIndex }
    
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

    const newTabs = [...win.tabs]
    newTabs[contextMenu.tabIndex] = { ...newTabs[contextMenu.tabIndex], groupIndex: newGroupIndex }

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
