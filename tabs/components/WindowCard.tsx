import React, { useState } from "react"
import type { ArchivedWindow, SavedTab } from "~lib/types"
import { TabList } from "./TabList"

export interface WindowCardProps {
  window: ArchivedWindow
  onRestore: (w: ArchivedWindow, e: React.MouseEvent) => void
  onDelete: (id: string, e: React.MouseEvent) => void
  onDeleteTab: (tab: SavedTab, index: number, winId: string) => void
  onUpdateTitle: (id: string, title: string) => void
  onToggleStar: (w: ArchivedWindow, e: React.MouseEvent) => void
  onDeleteGroup: (winId: string, gIndex: number) => void
  onExport: (win: ArchivedWindow) => void
  onCreateGroup: (winId: string, title: string, color: chrome.tabGroups.ColorEnum) => void
  onEditGroup: (winId: string, gIndex: number, title: string, color: chrome.tabGroups.ColorEnum) => void
  onUngroupTabs: (winId: string, gIndex: number) => void
  onAddTab: (winId: string) => void
  onTabContextMenu?: (e: React.MouseEvent, tab: SavedTab, tabIndex: number, windowId: string) => void
  dragHandleProps?: any
  isDraggingGroup?: boolean
}

export function WindowCard({ 
  window, 
  onRestore, 
  onDelete, 
  onDeleteTab, 
  onUpdateTitle, 
  onToggleStar, 
  onDeleteGroup, 
  onExport, 
  onCreateGroup, 
  onEditGroup, 
  onUngroupTabs, 
  onAddTab, 
  onTabContextMenu,
  dragHandleProps,
  isDraggingGroup
}: WindowCardProps) {
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
        <div {...dragHandleProps} className="drag-handle" title="Drag to reorder">
             <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                 <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"></path>
             </svg>
        </div>
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
          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onExport(window) }} title="Export to Text">⭳</button>
          <button className="btn btn-primary" onClick={(e) => onRestore(window, e)}>Restore</button>
          {showDelete && <button className="btn btn-danger" onClick={(e) => onDelete(window.id, e)}>Delete</button>}
        </div>
      </div>
      {expanded && (
        <div className="window-body">
          <div className="create-group-bar">
              <button className="btn" onClick={() => onCreateGroup(window.id, "New Group", "grey")}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{marginRight: '0.5rem'}}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
                  Create Group
              </button>
              <button className="btn" onClick={() => onAddTab(window.id)}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{marginRight: '0.5rem'}}><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
                  Add a Tab
              </button>
          </div>
          <TabList 
            window={window} 
            onDeleteTab={onDeleteTab} 
            onDeleteGroup={onDeleteGroup} 
            onEditGroup={onEditGroup}
            onUngroupTabs={onUngroupTabs}
            onTabContextMenu={onTabContextMenu}
            isDraggingGroup={isDraggingGroup}
          />
        </div>
      )}
    </div>
  )
}
