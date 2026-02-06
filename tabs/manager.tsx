import React, { useEffect, useState } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { getArchivedWindows, deleteArchivedWindow, updateArchivedWindow, saveArchivedWindow, getTrashedItems, addToTrash, removeFromTrash, exportAllData, importAllData } from "~lib/storage"
import type { ArchivedWindow, SavedTab, SavedGroup, TrashedItem } from "~lib/types"
import { WindowCard, ContextMenu, type ContextMenuState } from "./components"
import "./manager.css"

const GROUP_COLORS: chrome.tabGroups.ColorEnum[] = [
    "grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange"
]

function Manager() {
  const [windows, setWindows] = useState<ArchivedWindow[]>([])
  const [trashedItems, setTrashedItems] = useState<TrashedItem[]>([])
  const [activeTab, setActiveTab] = useState<'archives' | 'trash'>('archives')
  const [manualOrder, setManualOrder] = useState(false)
  
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importTitle, setImportTitle] = useState("")
  const [importContent, setImportContent] = useState("")

  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportContent, setExportContent] = useState("")
  const [exportTitle, setExportTitle] = useState("")

  const [importAllModalOpen, setImportAllModalOpen] = useState(false)
  const [importAllContent, setImportAllContent] = useState("")
  
  const [exportAllModalOpen, setExportAllModalOpen] = useState(false)
  const [exportAllContent, setExportAllContent] = useState("")

  const [addTabModalOpen, setAddTabModalOpen] = useState(false)
  const [addTabUrl, setAddTabUrl] = useState("")
  const [addTabWindowId, setAddTabWindowId] = useState("")

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  // URL Sanitization Helper
  const sanitizeUrl = (input: string): string => {
    const trimmed = input.trim()
    
    // Check if it's a Windows file path (e.g., E:\path\file.pdf or C:\Users\...)
    const windowsPathRegex = /^[A-Za-z]:\\/
    if (windowsPathRegex.test(trimmed)) {
      // Convert backslashes to forward slashes
      let path = trimmed.replace(/\\/g, '/')
      // Add file:/// protocol
      path = 'file:///' + path
      // URL encode spaces and special characters
      const parts = path.split('/')
      const encoded = parts.map((part, idx) => {
        if (idx < 3) return part // Don't encode 'file:///'
        return encodeURIComponent(part).replace(/%2F/g, '/')
      }).join('/')
      return encoded
    }
    
    // Check if it already has a protocol (http, https, file, chrome-extension, etc.)
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
      return trimmed
    }
    
    // Otherwise, assume it's a regular URL and add https://
    if (trimmed.includes('.') && !trimmed.includes(' ')) {
      return 'https://' + trimmed
    }
    
    return trimmed
  }

  // Import Logic
  const handleImportSubmit = async () => {
      const tabs: SavedTab[] = []
      const groups: SavedGroup[] = []
      const lines = importContent.split("\n")
      
      let currentGroupIndex = -1

      for (let line of lines) {
          const trimmedLine = line.trim()
          
          if (!trimmedLine) {
              currentGroupIndex = -1 // Reset group on empty line
              continue
          }

          const groupMatch = trimmedLine.match(/^### Group: (.*) \((.*)\)$/)
          if (groupMatch) {
              const title = groupMatch[1]
              const color = groupMatch[2] as chrome.tabGroups.ColorEnum
              
              groups.push({
                  originalId: -1, // Not relevant for import
                  title,
                  color,
                  collapsed: false
              })
              currentGroupIndex = groups.length - 1
              continue
          }

          // Check if line is a URL or file path
          if (trimmedLine.includes("://") || trimmedLine.includes("www.") || trimmedLine.match(/^[A-Za-z]:/)) {
             const sanitized = sanitizeUrl(trimmedLine)
             tabs.push({
                 url: sanitized,
                 title: trimmedLine, // Default title to original input
                 favIconUrl: "",
                 pinned: false,
                 groupIndex: currentGroupIndex
             })
          }
      }

      if (tabs.length === 0) {
          alert("No valid URLs found.")
          return
      }

      const archive: ArchivedWindow = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        title: importTitle || "Imported Window",
        tabs,
        groups
      }

      await saveArchivedWindow(archive)
      setImportModalOpen(false)
      setImportTitle("")
      setImportContent("")
      loadWindows()
  }

  // Export Logic
  const handleExport = (win: ArchivedWindow) => {
      let text = ""
      let lastGroupIndex = -1

      win.tabs.forEach(tab => {
          if (tab.groupIndex !== lastGroupIndex) {
              if (tab.groupIndex !== undefined && tab.groupIndex !== -1 && win.groups[tab.groupIndex]) {
                  const g = win.groups[tab.groupIndex]
                  // Add extra newline before group header if not start
                  text += (text ? "\n\n" : "") + `### Group: ${g.title} (${g.color})\n`
              } else {
                   // Switching to ungrouped
                  text += "\n" 
              }
              lastGroupIndex = tab.groupIndex
          }
          text += `${tab.url}\n`
      })
      
      setExportTitle(win.title)
      setExportContent(text.trim())
      setExportModalOpen(true)
  }

  const downloadExport = () => {
      const blob = new Blob([exportContent], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${exportTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`
      a.click()
  }

  // Import All Logic
  const handleImportAll = async () => {
    const result = await importAllData(importAllContent)
    if (result.success) {
      setImportAllModalOpen(false)
      setImportAllContent("")
      loadWindows()
      alert("Data imported successfully!")
    } else {
      alert(`Import failed: ${result.error}`)
    }
  }

  // Export All Logic
  const handleExportAll = async () => {
    const data = await exportAllData()
    setExportAllContent(data)
    setExportAllModalOpen(true)
  }

  const downloadExportAll = () => {
    const blob = new Blob([exportAllContent], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    a.download = `read-later-backup-${timestamp}.json`
    a.click()
  }

  // Add Tab Logic
  const handleAddTab = async () => {
    if (!addTabUrl.trim()) {
      alert("Please enter a URL")
      return
    }

    const win = windows.find(w => w.id === addTabWindowId)
    if (!win) return

    const sanitized = sanitizeUrl(addTabUrl)
    const newTab: SavedTab = {
      id: crypto.randomUUID(),
      url: sanitized,
      title: addTabUrl, // Default to input
      favIconUrl: "",
      pinned: false,
      groupIndex: -1 // Add to ungrouped
    }

    const updatedWin = {
      ...win,
      tabs: [...win.tabs, newTab]
    }
    await updateArchivedWindow(updatedWin)
    setAddTabModalOpen(false)
    setAddTabUrl("")
    setAddTabWindowId("")
  }

  // Permanent Delete from Trash
  const handlePermanentDelete = async (itemId: string) => {
    if (confirm("Permanently delete this item? This cannot be undone.")) {
      await removeFromTrash(itemId)
      setTrashedItems(await getTrashedItems())
    }
  }

  // Context Menu Handlers
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

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    if (contextMenu?.visible) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu])


  const loadWindows = async () => {
    let list = await getArchivedWindows()
    // Sort logic: 
    // We want to persist the user's order. 
    // However, we still want to enforce Starred on top initially? 
    // Or do we trust the saved order? 
    // The requirement says "Starred windows can not be dragged to below of un-starred".
    // This implies strict enforcement at all times.
    // If the saved list adheres to this, we just use it.
    // BUT we usually sort by date on fresh load if no manual order? 
    // Let's rely on the saved order in storage being the "source of truth".
    // If the storage order violates the constraint (e.g. legacy data), we might want to fix it, but let's assume storage is correct after first save.
    // Actually, preserving "Newest First" for new items is tricky if we have manual sort.
    // Standard approach: New items prepend to top (or top of unstarred).
    // Let's trust storage order for now, assuming saveArchivedWindow prepends correctly relative to stars? 
    // Currently saveArchivedWindow just prepends. 
    // We should probably ensure sort consistency here if we haven't implemented manual sort persistence fully.
    
    // For now, let's keep the sort logic BUT only if we haven't manually reordered?
    // Actually, if we implement DnD, the "timestamp" sort becomes secondary to "index" sort.
    // We will assume the `windows` array in storage IS the order.
    // We might need to do a one-time sort if the user has never reordered?
    // Let's just enforce the Starred-First rule visually/logically.
    
    const starred = list.filter(w => w.isStarred)
    const unstarred = list.filter(w => !w.isStarred)
    
    // If we want to strictly enforce starred first:
    // But within those groups, do we respect date?
    // Let's just use the list as is, but if we need to enforce:
    // list = [...starred, ...unstarred] 
    // The user might have reordered the unstarred ones.
    
    // Let's trust the storage list.
    // Backfill IDs if missing (migration)
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
        // We generally shouldn't silently write to storage on read, but for migration it's useful?
        // Let's just update the state, and it will be saved on next action.
        // Or explicit save? Explicit save is better for consistency.
        await chrome.storage.local.set({ "archivedWindows": list })
    }

    setWindows(list)
    
    // Load Trashed Items
    const trash = await getTrashedItems()
    setTrashedItems(trash)
  }

  const onDragEnd = async (result: DropResult) => {
      const { source, destination, type, draggableId } = result
      
      if (!destination) return
      if (source.droppableId === destination.droppableId && source.index === destination.index) return

      // === WINDOW REORDERING ===
      if (type === "WINDOW") {
          const newWindows = Array.from(windows)
          const [moved] = newWindows.splice(source.index, 1)
          newWindows.splice(destination.index, 0, moved)
          
          // Constraint Check: Starred above Unstarred
          const firstUnstarredIndex = newWindows.findIndex(w => !w.isStarred)
          if (firstUnstarredIndex !== -1) {
              const invalidStarred = newWindows.slice(firstUnstarredIndex).find(w => w.isStarred)
              if (invalidStarred) {
                 console.warn("DnD blocked: Starred windows must remain at the top.")
                 return 
              }
          }
          
          setWindows(newWindows)
          await chrome.storage.local.set({ "archivedWindows": newWindows })
          return
      }

      // === ITEM (Tab/Group) REORDERING ===
      
      // 1. Identify Source and Dest Window IDs
      let sourceWinId = ""
      if (source.droppableId.startsWith("win-content-")) {
          sourceWinId = source.droppableId.replace("win-content-", "")
      } else if (source.droppableId.startsWith("group-inner-")) {
          // Format: group-inner-{winId}-{groupIdx}
          const lastDash = source.droppableId.lastIndexOf("-")
          sourceWinId = source.droppableId.substring("group-inner-".length, lastDash)
      }
      
      let destWinId = ""
      if (destination.droppableId.startsWith("win-content-")) {
          destWinId = destination.droppableId.replace("win-content-", "")
      } else if (destination.droppableId.startsWith("group-inner-")) {
           const lastDash = destination.droppableId.lastIndexOf("-")
           destWinId = destination.droppableId.substring("group-inner-".length, lastDash)
      }

      const sourceWinIndex = windows.findIndex(w => w.id === sourceWinId)
      const destWinIndex = windows.findIndex(w => w.id === destWinId)
      
      if (sourceWinIndex === -1 || destWinIndex === -1) return

      // Clone state for mutation
      const newWindows = [...windows]
      const sourceWin = { ...newWindows[sourceWinIndex], tabs: [...newWindows[sourceWinIndex].tabs], groups: [...newWindows[sourceWinIndex].groups] }
      newWindows[sourceWinIndex] = sourceWin
      
      let destWin = sourceWin
      if (sourceWinId !== destWinId) {
          destWin = { ...newWindows[destWinIndex], tabs: [...newWindows[destWinIndex].tabs], groups: [...newWindows[destWinIndex].groups] }
          newWindows[destWinIndex] = destWin
      }

      // 2. Identify Dragged Item Type and Index
      let draggedItemType: 'GROUP' | 'TAB'
      let draggedGroupIndex = -1
      let draggedTabIndex = -1

      // Try to find in groups first
      draggedGroupIndex = sourceWin.groups.findIndex(g => g.id === draggableId || `group-${sourceWin.id}-${sourceWin.groups.indexOf(g)}` === draggableId)
      
      if (draggedGroupIndex !== -1) {
          draggedItemType = 'GROUP'
      } else {
          draggedItemType = 'TAB'
          draggedTabIndex = sourceWin.tabs.findIndex(t => t.id === draggableId || `tab-${sourceWin.id}-${sourceWin.tabs.indexOf(t)}` === draggableId)
      }

      if (draggedItemType === 'GROUP' && draggedGroupIndex === -1) return
      if (draggedItemType === 'TAB' && draggedTabIndex === -1) return

      // 3. Prevent Invalid Drops
      if (draggedItemType === 'GROUP' && destination.droppableId.startsWith("group-inner-")) {
          return // Cannot drop a group into a group
      }

      // 4. Remove Item from Source
      let payloadTabs: SavedTab[] = []
      let payloadGroup: SavedGroup | null = null

      if (draggedItemType === 'GROUP') {
          payloadGroup = sourceWin.groups[draggedGroupIndex]
          // Extract all tabs belonging to this group
          payloadTabs = sourceWin.tabs.filter(t => t.groupIndex === draggedGroupIndex)
          sourceWin.tabs = sourceWin.tabs.filter(t => t.groupIndex !== draggedGroupIndex)
          
          // Remove group from registry
          sourceWin.groups.splice(draggedGroupIndex, 1)
          
          // Shift indices for remaining tabs in Source
          sourceWin.tabs.forEach(t => {
              if (t.groupIndex !== -1 && t.groupIndex > draggedGroupIndex) {
                  t.groupIndex--
              }
          })
      } else {
          payloadTabs = [sourceWin.tabs[draggedTabIndex]]
          sourceWin.tabs.splice(draggedTabIndex, 1)
      }

      // 5. Insert into Destination
      
      // CASE A: Dropping into Root (Ungrouped/Group List)
      if (destination.droppableId.startsWith("win-content-")) {
          // Construct Visual List to map destination.index to Data Index
          type VisualItem = { type: 'TAB' | 'GROUP', originalIndex: number, group?: SavedGroup, tab?: SavedTab }
          const visualList: VisualItem[] = []
          
          let lastGIndex = -1
          destWin.tabs.forEach((tab, i) => {
             const gIndex = tab.groupIndex ?? -1
             if (gIndex !== lastGIndex) {
                 if (lastGIndex !== -1 && destWin.groups[lastGIndex]) {
                     // Since we handle groups as a single block in render, we only push ONCE per group set
                     // But wait, the loop continues.
                     // renderItems flushes PREVIOUS group when index changes.
                 }
                 // Logic check: TabList pushes GroupBlock when it flushes.
                 // We need to simulate flush.
             }
             // Actually simpler:
             // Iterate structure. If new group starts, push Group Item. Skip tabs of that group? 
             // No, TabList iterates all tabs.
             // When gIndex changes, it flushes previous.
          })

          // Easier reconstruction:
          let currentGroupIdx = -1
          let processingGroup = false
          
          // We can't easily map the `renderItems` one-to-one without replicating it.
          // Let's do it:
          const rebuildVisualList = () => {
              const list: VisualItem[] = []
              let lastGroupIndex = -1
              let pendingGroupTabs = false
              
               const flushGroup = () => {
                  if (lastGroupIndex !== -1) {
                      if (destWin.groups[lastGroupIndex]) {
                         list.push({ type: 'GROUP', group: destWin.groups[lastGroupIndex], originalIndex: lastGroupIndex })
                      }
                  } else if (pendingGroupTabs) {
                      // Ungrouped tabs were pending? No, logic is:
                      // If ungrouped, we push individual items.
                  }
               }

               // Need to handle ungrouped tabs separately cause they are individual items in visual list
               destWin.tabs.forEach((tab, i) => {
                   const gIndex = tab.groupIndex ?? -1
                   if (gIndex !== lastGroupIndex) {
                       if (lastGroupIndex !== -1) {
                           // Flush previous group as ONE item
                           if (destWin.groups[lastGroupIndex]) {
                               list.push({ type: 'GROUP', group: destWin.groups[lastGroupIndex], originalIndex: lastGroupIndex })
                           }
                       }
                       lastGroupIndex = gIndex
                   }
                   
                   if (gIndex === -1) {
                       // Ungrouped tab = 1 visual item
                       list.push({ type: 'TAB', tab, originalIndex: i })
                   }
                   // If grouped, we don't push anything yet, we wait for full group to be "flushed" or represented
               })
               // Flush final
               if (lastGroupIndex !== -1 && destWin.groups[lastGroupIndex]) {
                   list.push({ type: 'GROUP', group: destWin.groups[lastGroupIndex], originalIndex: lastGroupIndex })
               }
               return list
          }
          
          const visualListItems = rebuildVisualList()
          
          // Determine Insertion Data Index
          let insertIndex = destWin.tabs.length // Default append
          
          if (destination.index < visualListItems.length) {
              const target = visualListItems[destination.index]
              if (target.type === 'TAB') {
                  insertIndex = target.originalIndex
              } else {
                  // Insert before the FIRST tab of this group
                  insertIndex = destWin.tabs.findIndex(t => t.groupIndex === target.originalIndex)
                  if (insertIndex === -1) insertIndex = destWin.tabs.length
              }
          }

          if (draggedItemType === 'GROUP') {
              // Add Group to Dest
              const newGroupIndex = destWin.groups.length
              destWin.groups.push(payloadGroup!)
              payloadTabs.forEach(t => t.groupIndex = newGroupIndex)
              
              // Insert tabs
              destWin.tabs.splice(insertIndex, 0, ...payloadTabs)
          } else {
              // Tab to Ungrouped
              payloadTabs[0].groupIndex = -1
              destWin.tabs.splice(insertIndex, 0, payloadTabs[0])
          }

      // CASE B: Dropping into a Group
      } else if (destination.droppableId.startsWith("group-inner-")) {
          const parts = destination.droppableId.split("-")
          const targetGroupIndex = parseInt(parts[3])
          
          if (!destWin.groups[targetGroupIndex]) return 

          // Logic: Find sibling in that group
          const groupTabs = destWin.tabs.filter(t => t.groupIndex === targetGroupIndex)
          let insertIndex = -1
          
          if (destination.index < groupTabs.length) {
              // Insert before sibling
              const sibling = groupTabs[destination.index]
              insertIndex = destWin.tabs.findIndex(t => t.id === sibling.id)
          } else {
              // Append to group -> Find last tab of group
              let lastIndex = -1
              for (let i = destWin.tabs.length - 1; i >= 0; i--) {
                  if (destWin.tabs[i].groupIndex === targetGroupIndex) {
                      lastIndex = i
                      break
                  }
              }
              if (lastIndex !== -1) insertIndex = lastIndex + 1
              else insertIndex = destWin.tabs.length // Should not happen for visible group
          }
          
          payloadTabs[0].groupIndex = targetGroupIndex
          destWin.tabs.splice(insertIndex, 0, payloadTabs[0])
      }

      setWindows(newWindows)
      await chrome.storage.local.set({ "archivedWindows": newWindows })
  }

  useEffect(() => {
    loadWindows()
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes["archivedWindows"]) loadWindows()
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const handleToggleStar = async (win: ArchivedWindow, e: React.MouseEvent) => {
    e.stopPropagation()
    await updateArchivedWindow({ ...win, isStarred: !win.isStarred })
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("Are you sure you want to delete this archive?")) {
      await deleteArchivedWindow(id)
    }
  }

  const handleRestore = async (win: ArchivedWindow, e: React.MouseEvent) => {
    e.stopPropagation()
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

  const handleDeleteTab = async (tab: SavedTab, tabIndex: number, winId: string) => {
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

  const handleDeleteGroup = async (winId: string, groupIndex: number) => {
    if (!confirm("Delete this group and all its tabs?")) return

    const win = windows.find(w => w.id === winId)
    if (!win) return

    const group = win.groups[groupIndex]
    const tabsInGroup = win.tabs.filter(t => t.groupIndex === groupIndex)
    
    // Add to Trash
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

  const handleRestoreFromTrash = async (item: TrashedItem) => {
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

  const handleUpdateTitle = async (winId: string, newTitle: string) => {
    const win = windows.find(w => w.id === winId)
    if (win && win.title !== newTitle) {
      await updateArchivedWindow({ ...win, title: newTitle })
    }
  }

  const handleCreateGroup = async (winId: string, title: string, color: chrome.tabGroups.ColorEnum) => {
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
          groupIndex: win.groups.length // Index of the new group
      }

      const updatedWin = {
          ...win,
          groups: [...win.groups, newGroup],
          tabs: [...win.tabs, emptyTab]
      }
      await updateArchivedWindow(updatedWin)
  }

  const handleEditGroup = async (winId: string, groupIndex: number, title: string, color: chrome.tabGroups.ColorEnum) => {
      const win = windows.find(w => w.id === winId)
      if (!win || !win.groups[groupIndex]) return

      const newGroups = [...win.groups]
      newGroups[groupIndex] = { ...newGroups[groupIndex], title, color }

      await updateArchivedWindow({ ...win, groups: newGroups })
  }

  const handleUngroupTabs = async (winId: string, groupIndex: number) => {
      const win = windows.find(w => w.id === winId)
      if (!win) return

      // Move all tabs from this group to ungrouped
      const newTabs = win.tabs.map(t => {
          if (t.groupIndex === groupIndex) {
              return { ...t, groupIndex: -1 }
          }
          // Shift indices for groups after this one
          if (t.groupIndex > groupIndex) {
              return { ...t, groupIndex: t.groupIndex - 1 }
          }
          return t
      })

      // Remove the group itself
      const newGroups = win.groups.filter((_, i) => i !== groupIndex)

      await updateArchivedWindow({ ...win, tabs: newTabs, groups: newGroups })
  }

  return (
    <div className="container">
      <header className="header">
        <div className="header-content">
          <h1>
            <svg viewBox="0 0 24 24" className="logo-icon">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
            Read Later
          </h1>
          <p className="subtitle">
            The app for who always procastinate and thinks, I will read this later.
            For me, I have 100+ opened tabs that I barely know their existence :))
          </p>
        </div>
        <div style={{display: 'flex', gap: '0.5rem'}}>
          <button className="btn btn-primary" onClick={() => setImportModalOpen(true)}>Import from List</button>
          <button className="btn" onClick={() => setImportAllModalOpen(true)}>Import All</button>
          <button className="btn" onClick={handleExportAll}>Export All</button>
        </div>
      </header>

      {/* Import Modal */}
      {importModalOpen && (
          <div className="modal-overlay" onClick={() => setImportModalOpen(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <h2>Import Window</h2>
                  <input 
                    type="text" 
                    placeholder="Window Title" 
                    className="modal-input"
                    value={importTitle}
                    onChange={e => setImportTitle(e.target.value)}
                  />
                  <textarea 
                    placeholder={"Paste links here...\n\n### Group: Work (blue)\nhttps://work-link.com\n\n(Empty line resets group)\nhttps://ungrouped-link.com"}
                    className="modal-textarea"
                    value={importContent}
                    onChange={e => setImportContent(e.target.value)}
                  />
                  <div className="modal-actions">
                      <button className="btn" onClick={() => setImportModalOpen(false)}>Cancel</button>
                      <button className="btn btn-primary" onClick={handleImportSubmit}>Import</button>
                  </div>
              </div>
          </div>
      )}

      {/* Export Modal */}
      {exportModalOpen && (
          <div className="modal-overlay" onClick={() => setExportModalOpen(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <h2>Export Window</h2>
                  <textarea 
                    readOnly
                    className="modal-textarea"
                    value={exportContent}
                  />
                  <div className="modal-actions">
                      <button className="btn" onClick={() => setExportModalOpen(false)}>Close</button>
                      <button className="btn btn-primary" onClick={downloadExport}>Download .txt</button>
                  </div>
              </div>
          </div>
      )}

      {/* Import All Modal */}
      {importAllModalOpen && (
          <div className="modal-overlay" onClick={() => setImportAllModalOpen(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <h2>Import All Data</h2>
                  <p style={{marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                    Paste the exported JSON data below. This will replace all current archives and trash.
                  </p>
                  <textarea 
                    placeholder="Paste JSON data here..."
                    className="modal-textarea"
                    value={importAllContent}
                    onChange={e => setImportAllContent(e.target.value)}
                    style={{fontFamily: 'monospace', fontSize: '0.85rem'}}
                  />
                  <div className="modal-actions">
                      <button className="btn" onClick={() => setImportAllModalOpen(false)}>Cancel</button>
                      <button className="btn btn-primary" onClick={handleImportAll}>Import</button>
                  </div>
              </div>
          </div>
      )}

      {/* Export All Modal */}
      {exportAllModalOpen && (
          <div className="modal-overlay" onClick={() => setExportAllModalOpen(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <h2>Export All Data</h2>
                  <p style={{marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                    This is a complete backup of all your archives and trash. Save this file securely.
                  </p>
                  <textarea 
                    readOnly
                    className="modal-textarea"
                    value={exportAllContent}
                    style={{fontFamily: 'monospace', fontSize: '0.85rem'}}
                  />
                  <div className="modal-actions">
                      <button className="btn" onClick={() => setExportAllModalOpen(false)}>Close</button>
                      <button className="btn btn-primary" onClick={downloadExportAll}>Download .json</button>
                  </div>
              </div>
          </div>
      )}

      {/* Add Tab Modal */}
      {addTabModalOpen && (
          <div className="modal-overlay" onClick={() => setAddTabModalOpen(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <h2>Add a Tab</h2>
                  <input 
                    type="text" 
                    placeholder="Enter URL or file path (e.g., E:\path\file.pdf)" 
                    className="modal-input"
                    value={addTabUrl}
                    onChange={e => setAddTabUrl(e.target.value)}
                  />
                  <div className="modal-actions">
                      <button className="btn" onClick={() => setAddTabModalOpen(false)}>Cancel</button>
                      <button className="btn btn-primary" onClick={handleAddTab}>Add Tab</button>
                  </div>
              </div>
          </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-nav">
          <button className={`tab-btn ${activeTab === 'archives' ? 'active' : ''}`} onClick={() => setActiveTab('archives')}>Archives</button>
          <button className={`tab-btn ${activeTab === 'trash' ? 'active' : ''}`} onClick={() => setActiveTab('trash')}>Trash ({trashedItems.length})</button>
      </div>

      <div className="content-container">
          {activeTab === 'archives' && (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="window-list" type="WINDOW">
                    {(provided) => (
                        <div 
                            className="window-list" 
                            ref={provided.innerRef} 
                            {...provided.droppableProps}
                        >
                            {windows.length === 0 && <p className="empty-state">No archived windows found.</p>}
                            {windows.map((w, index) => (
                            <Draggable key={w.id} draggableId={w.id} index={index}>
                                {(provided, snapshot) => (
                                    <div 
                                        ref={provided.innerRef} 
                                        {...provided.draggableProps} 
                                        style={{ ...provided.draggableProps.style, marginBottom: '1.5rem' }}
                                    >
                                        <WindowCard
                                            window={w}
                                            dragHandleProps={provided.dragHandleProps}
                                            onRestore={handleRestore}
                                            onDelete={handleDelete}
                                            onDeleteTab={handleDeleteTab}
                                            onUpdateTitle={handleUpdateTitle}
                                            onToggleStar={handleToggleStar}
                                            onDeleteGroup={handleDeleteGroup}
                                            onExport={handleExport}
                                            onCreateGroup={handleCreateGroup}
                                            onEditGroup={handleEditGroup}
                                            onUngroupTabs={handleUngroupTabs}
                                            onAddTab={(winId) => { setAddTabWindowId(winId); setAddTabModalOpen(true) }}
                                            onTabContextMenu={handleTabContextMenu}
                                        />
                                    </div>
                                )}
                            </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
              </DragDropContext>
          )}

          {activeTab === 'trash' && (
              <div className="trash-list">
                  {trashedItems.length === 0 && <p className="empty-state">Trash is empty.</p>}
                  {trashedItems.map(item => (
                      <div key={item.id} className="trash-item">
                          <div className="trash-item-info">
                              <span className="trash-item-type">{item.type === 'tab' ? '📄' : '📁'}</span>
                              <span className="trash-item-title">
                                  {item.type === 'tab' ? (item.item as SavedTab).title : (item.item as SavedGroup).title}
                              </span>
                              <span className="trash-item-meta">from: {item.windowTitle}</span>
                          </div>
                          <div className="trash-item-actions">
                              <button className="btn" onClick={() => handleRestoreFromTrash(item)}>Restore</button>
                              <button className="btn btn-danger" onClick={() => handlePermanentDelete(item.id)}>Delete Permanently</button>
                          </div>
                      </div>
                  ))}
              </div>
          )}

      {/* Context Menu */}
      {contextMenu && contextMenu.visible && (
          <div 
            className="context-menu" 
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={e => e.stopPropagation()}
          >
            {(() => {
              const win = windows.find(w => w.id === contextMenu.windowId);
              if (!win) return null;
              
              return (
                <>
                  <button 
                    className="context-menu-item has-submenu"
                    onMouseEnter={(e) => {
                      const submenu = e.currentTarget.querySelector('.context-submenu') as HTMLElement;
                      if (submenu) submenu.style.display = 'block';
                    }}
                    onMouseLeave={(e) => {
                      const submenu = e.currentTarget.querySelector('.context-submenu') as HTMLElement;
                      if (submenu) submenu.style.display = 'none';
                    }}
                  >
                    Add to Group
                    <div className="context-submenu">
                      {win.groups.map((group, idx) => (
                        <button
                          key={idx}
                          className="context-menu-item"
                          onClick={() => handleMoveTabToGroup(idx)}
                        >
                          {group.title || `Group ${idx + 1}`}
                        </button>
                      ))}
                      {win.groups.length === 0 && (
                        <button className="context-menu-item" disabled>
                          No groups available
                        </button>
                      )}
                    </div>
                  </button>
                  
                  {contextMenu.tab?.groupIndex !== -1 && (
                    <button 
                      className="context-menu-item"
                      onClick={() => handleMoveTabToGroup(-1)}
                    >
                      Remove from Group
                    </button>
                  )}
                  
                  <button 
                    className="context-menu-item"
                    onClick={handleMakeNewGroupWithTab}
                  >
                    Make New Group
                  </button>
                </>
              );
            })()}
          </div>
      )}
          
      </div>
    </div>
  )
}

export default Manager
