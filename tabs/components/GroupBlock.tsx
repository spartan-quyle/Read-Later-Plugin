import React, { useState } from "react"
import { Droppable, Draggable } from "@hello-pangea/dnd"
import type { SavedGroup, SavedTab } from "~lib/types"
import { TabItem } from "./TabItem"

const GROUP_COLORS: chrome.tabGroups.ColorEnum[] = [
    "grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange"
]

export interface GroupBlockProps {
  group: SavedGroup
  tabsWithIndices: { tab: SavedTab; index: number }[]
  onDeleteTab: (tab: SavedTab, index: number, winId: string) => void
  onDeleteGroup: () => void
  onEditGroup: (title: string, color: chrome.tabGroups.ColorEnum) => void
  onUngroupTabs: () => void
  onTabContextMenu?: (e: React.MouseEvent, tab: SavedTab, tabIndex: number) => void
  winId: string
  dragHandleProps?: any
  groupIndex: number
}

export function GroupBlock({ 
  group, 
  tabsWithIndices, 
  onDeleteTab, 
  onDeleteGroup, 
  onEditGroup, 
  onUngroupTabs, 
  onTabContextMenu,
  winId, 
  dragHandleProps, 
  groupIndex 
}: GroupBlockProps) {
  const [collapsed, setCollapsed] = useState(group.collapsed)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(group.title)
  const [editColor, setEditColor] = useState(group.color)
  
  const handleSaveEdit = () => {
      onEditGroup(editTitle, editColor)
      setIsEditing(false)
  }

  return (
    <li className="tab-group-container">
      <div className="group-header-row" onClick={() => !isEditing && setCollapsed(!collapsed)}>
        <div {...dragHandleProps} className="drag-handle" title="Drag Group">
             <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"></path></svg>
        </div>
        <div className="group-info">
          <div className="group-color-dot" style={{ backgroundColor: group.color || "grey" }}></div>
          {isEditing ? (
              <input 
                  type="text" 
                  value={editTitle} 
                  onChange={e => setEditTitle(e.target.value)} 
                  onClick={e => e.stopPropagation()} 
                  className="group-title-input"
                  autoFocus
              />
          ) : (
              <span>{group.title || "Untitled Group"}</span>
          )}
          <span style={{ fontSize: "0.8em", opacity: 0.5 }}>({tabsWithIndices.length})</span>
        </div>
        <div className="group-actions">
          {isEditing ? (
              <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleSaveEdit() }} title="Save">✓</button>
          ) : (
              <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setIsEditing(true) }} title="Edit Group">✎</button>
          )}
          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onUngroupTabs() }} title="Ungroup Tabs">⤢</button>
          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onDeleteGroup() }} title="Delete Group">×</button>
        </div>
      </div>
      {isEditing && (
          <div className="color-picker-bar" onClick={e => e.stopPropagation()}>
              {GROUP_COLORS.map(c => (
                  <div 
                      key={c} 
                      className={`color-swatch ${editColor === c ? 'active' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setEditColor(c)}
                      title={c.charAt(0).toUpperCase() + c.slice(1)}
                  />
              ))}
          </div>
      )}
      {!collapsed && (
        <Droppable droppableId={`group-inner-${winId}-${groupIndex}`} type="ITEM">
            {(provided) => (
                <ul className="tab-list" ref={provided.innerRef} {...provided.droppableProps}>
                  {tabsWithIndices.map(({ tab, index }, visualIndex) => (
                    <Draggable key={tab.id || `t-${index}`} draggableId={tab.id || `t-${index}`} index={visualIndex}>
                        {(provided) => (
                             <div ref={provided.innerRef} {...provided.draggableProps} style={provided.draggableProps.style}>
                                <TabItem
                                    tab={tab}
                                    onDelete={(e) => { e.stopPropagation(); onDeleteTab(tab, index, winId) }}
                                    onContextMenu={onTabContextMenu ? (e) => onTabContextMenu(e, tab, index) : undefined}
                                    dragHandleProps={provided.dragHandleProps}
                                />
                             </div>
                        )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
            )}
        </Droppable>
      )}
    </li>
  )
}
