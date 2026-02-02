import React, { useEffect, useState } from "react"
import { getArchivedWindows, deleteArchivedWindow, updateArchivedWindow } from "~lib/storage"
import type { ArchivedWindow, SavedTab, SavedGroup } from "~lib/types"
import "./manager.css"

interface DeletedTabEntry {
  windowId: string
  tab: SavedTab
  index: number
}

function Manager() {
  const [windows, setWindows] = useState<ArchivedWindow[]>([])
  const [deletedHistory, setDeletedHistory] = useState<DeletedTabEntry[]>([])

  const loadWindows = async () => {
    let list = await getArchivedWindows()
    list.sort((a, b) => {
      if (a.isStarred && !b.isStarred) return -1
      if (!a.isStarred && b.isStarred) return 1
      return b.timestamp - a.timestamp
    })
    setWindows(list)
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

    setDeletedHistory(prev => [...prev, { windowId: winId, tab, index: tabIndex }])

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

    const newTabs = win.tabs.filter(t => t.groupIndex !== groupIndex)
    const updatedWin = { ...win, tabs: newTabs }
    if (updatedWin.title.match(/\(\d+ tabs\)/)) {
      updatedWin.title = updatedWin.title.replace(/\(\d+ tabs\)/, `(${newTabs.length} tabs)`)
    }
    await updateArchivedWindow(updatedWin)
  }

  const handleUndo = async () => {
    if (deletedHistory.length === 0) return

    const lastItem = deletedHistory[deletedHistory.length - 1]
    const { windowId, tab, index } = lastItem

    const win = windows.find(w => w.id === windowId) || (await getArchivedWindows()).find(w => w.id === windowId)
    if (!win) return

    const newTabs = [...win.tabs]
    newTabs.splice(index, 0, tab)
    const updatedWin = { ...win, tabs: newTabs }

    if (updatedWin.title.match(/\(\d+ tabs\)/)) {
      updatedWin.title = updatedWin.title.replace(/\(\d+ tabs\)/, `(${newTabs.length} tabs)`)
    }
    await updateArchivedWindow(updatedWin)
    setDeletedHistory(prev => prev.slice(0, -1))
  }

  const handleUpdateTitle = async (winId: string, newTitle: string) => {
    const win = windows.find(w => w.id === winId)
    if (win && win.title !== newTitle) {
      await updateArchivedWindow({ ...win, title: newTitle })
    }
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
      </header>

      {deletedHistory.length > 0 && (
        <div className="undo-toast">
          <span>{deletedHistory.length} tab{deletedHistory.length > 1 ? "s" : ""} deleted</span>
          <button onClick={handleUndo}>Undo</button>
        </div>
      )}

      <div className="window-list">
        {windows.length === 0 && <p className="empty-state">No archived windows found.</p>}
        {windows.map((w) => (
          <WindowCard
            key={w.id}
            window={w}
            onRestore={handleRestore}
            onDelete={handleDelete}
            onDeleteTab={handleDeleteTab}
            onUpdateTitle={handleUpdateTitle}
            onToggleStar={handleToggleStar}
            onDeleteGroup={handleDeleteGroup}
          />
        ))}
      </div>
    </div>
  )
}

interface WindowCardProps {
  window: ArchivedWindow
  onRestore: (w: ArchivedWindow, e: React.MouseEvent) => void
  onDelete: (id: string, e: React.MouseEvent) => void
  onDeleteTab: (tab: SavedTab, index: number, winId: string) => void
  onUpdateTitle: (id: string, title: string) => void
  onToggleStar: (w: ArchivedWindow, e: React.MouseEvent) => void
  onDeleteGroup: (winId: string, gIndex: number) => void
}

function WindowCard({ window, onRestore, onDelete, onDeleteTab, onUpdateTitle, onToggleStar, onDeleteGroup }: WindowCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(window.title)
  const date = new Date(window.timestamp).toLocaleString()
  const showDelete = !window.isStarred

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onUpdateTitle(window.id, editTitle)
    setIsEditing(false)
  }

  return (
    <div className="window-card">
      <div className="window-header" onClick={() => !isEditing && setExpanded(!expanded)}>
        <div className="window-info">
          {isEditing ? (
            <form onSubmit={handleRenameSubmit} onClick={e => e.stopPropagation()}>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => { onUpdateTitle(window.id, editTitle); setIsEditing(false) }}
                autoFocus
                className="title-input"
              />
            </form>
          ) : (
            <div className="title-row">
              <span
                className={`star-btn ${window.isStarred ? "starred" : ""}`}
                onClick={(e) => onToggleStar(window, e)}
                title={window.isStarred ? "Unstar (Permanent)" : "Star (Make Permanent)"}
              >
                {window.isStarred ? "★" : "☆"}
              </span>
              <h3>{window.title || "Untitled Archive"}</h3>
              <button
                className="icon-btn edit-btn"
                onClick={(e) => { e.stopPropagation(); setIsEditing(true) }}
                title="Rename"
              >
                ✎
              </button>
            </div>
          )}
          <div className="window-meta">
            {date} • {window.tabs.length} tabs • {window.groups.length} groups
          </div>
        </div>
        <div className="window-actions">
          <button className="btn btn-primary" onClick={(e) => onRestore(window, e)}>Restore</button>
          {showDelete && <button className="btn btn-danger" onClick={(e) => onDelete(window.id, e)}>Delete</button>}
        </div>
      </div>
      {expanded && (
        <div className="window-body">
          <TabList window={window} onDeleteTab={onDeleteTab} onDeleteGroup={onDeleteGroup} />
        </div>
      )}
    </div>
  )
}

interface TabListProps {
  window: ArchivedWindow
  onDeleteTab: (tab: SavedTab, index: number, winId: string) => void
  onDeleteGroup: (winId: string, gIndex: number) => void
}

function TabList({ window, onDeleteTab, onDeleteGroup }: TabListProps) {
  const renderItems = () => {
    const nodes: React.ReactNode[] = []
    let lastGroupIndex = -1
    let currentGroupTabs: { tab: SavedTab; index: number }[] = []

    const flushGroup = () => {
      if (lastGroupIndex !== -1) {
        const group = window.groups[lastGroupIndex]
        nodes.push(
          <GroupBlock
            key={`group-${lastGroupIndex}`}
            group={group}
            tabsWithIndices={currentGroupTabs}
            onDeleteTab={onDeleteTab}
            onDeleteGroup={() => onDeleteGroup(window.id, lastGroupIndex)}
            winId={window.id}
          />
        )
      } else {
        currentGroupTabs.forEach(({ tab, index }) => {
          nodes.push(
            <TabItem
              key={`tab-${index}`}
              tab={tab}
              onDelete={(e) => { e.stopPropagation(); onDeleteTab(tab, index, window.id) }}
            />
          )
        })
      }
      currentGroupTabs = []
    }

    window.tabs.forEach((tab, i) => {
      const gIndex = tab.groupIndex ?? -1
      if (gIndex !== lastGroupIndex) {
        flushGroup()
        lastGroupIndex = gIndex
      }
      currentGroupTabs.push({ tab, index: i })
    })
    flushGroup()
    return nodes
  }

  return <ul className="tab-list">{renderItems()}</ul>
}

interface GroupBlockProps {
  group: SavedGroup
  tabsWithIndices: { tab: SavedTab; index: number }[]
  onDeleteTab: (tab: SavedTab, index: number, winId: string) => void
  onDeleteGroup: () => void
  winId: string
}

function GroupBlock({ group, tabsWithIndices, onDeleteTab, onDeleteGroup, winId }: GroupBlockProps) {
  const [collapsed, setCollapsed] = useState(group.collapsed)

  return (
    <li className="tab-group-container">
      <div className="group-header-row" onClick={() => setCollapsed(!collapsed)}>
        <div className="group-info">
          <div className="group-color-dot" style={{ backgroundColor: group.color || "grey" }}></div>
          <span>{group.title || "Untitled Group"}</span>
          <span style={{ fontSize: "0.8em", opacity: 0.5 }}>({tabsWithIndices.length})</span>
        </div>
        <div className="group-actions">
          <button
            className="icon-btn"
            onClick={(e) => { e.stopPropagation(); onDeleteGroup() }}
            title="Delete Group"
          >
            ×
          </button>
        </div>
      </div>
      {!collapsed && (
        <ul className="tab-list">
          {tabsWithIndices.map(({ tab, index }) => (
            <TabItem
              key={`tab-${index}`}
              tab={tab}
              onDelete={(e) => { e.stopPropagation(); onDeleteTab(tab, index, winId) }}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

interface TabItemProps {
  tab: SavedTab
  onDelete: (e: React.MouseEvent) => void
}

function TabItem({ tab, onDelete }: TabItemProps) {
  const handleLinkClick = (e: React.MouseEvent) => {
    e.preventDefault()
    chrome.tabs.create({ url: tab.url, active: true })
  }

  return (
    <li className="tab-item">
      <img
        src={tab.favIconUrl || "https://extension-icons.pl/favicon"}
        className="tab-favicon"
        alt=""
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
      <a href={tab.url} onClick={handleLinkClick} className="tab-link" title={tab.url}>
        {tab.title || tab.url}
      </a>
      <div className="tab-actions">
        <button className="icon-btn" onClick={onDelete} title="Remove tab">×</button>
      </div>
    </li>
  )
}

export default Manager
