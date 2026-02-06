import React from "react"
import type { ArchivedWindow, SavedTab, SavedGroup } from "~lib/types"

export interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  tab: SavedTab | null
  tabIndex: number
  windowId: string
}

export interface ContextMenuProps {
  contextMenu: ContextMenuState
  windows: ArchivedWindow[]
  onMoveToGroup: (targetGroupIndex: number) => void
  onMakeNewGroup: () => void
  onClose: () => void
}

export function ContextMenu({ 
  contextMenu, 
  windows, 
  onMoveToGroup, 
  onMakeNewGroup,
  onClose 
}: ContextMenuProps) {
  if (!contextMenu.visible) return null

  const win = windows.find(w => w.id === contextMenu.windowId)
  if (!win) return null

  return (
    <div 
      className="context-menu" 
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onClick={e => e.stopPropagation()}
    >
      {/* Add to Group Submenu */}
      <div 
        className="context-menu-item has-submenu"
        onMouseEnter={(e) => {
          const submenu = e.currentTarget.querySelector('.context-submenu') as HTMLElement
          if (submenu) submenu.style.display = 'block'
        }}
        onMouseLeave={(e) => {
          const submenu = e.currentTarget.querySelector('.context-submenu') as HTMLElement
          if (submenu) submenu.style.display = 'none'
        }}
      >
        Add to Group
        <div className="context-submenu">
          {win.groups.map((group, idx) => (
            <button
              key={idx}
              className="context-menu-item"
              onClick={() => { onMoveToGroup(idx); onClose() }}
            >
              <span className="group-color-dot" style={{ 
                backgroundColor: group.color, 
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                marginRight: '8px'
              }}></span>
              {group.title || `Group ${idx + 1}`}
            </button>
          ))}
          {win.groups.length === 0 && (
            <button className="context-menu-item" disabled>
              No groups available
            </button>
          )}
        </div>
      </div>
      
      {/* Remove from Group (only if tab is in a group) */}
      {contextMenu.tab?.groupIndex !== undefined && contextMenu.tab.groupIndex !== -1 && (
        <button 
          className="context-menu-item"
          onClick={() => { onMoveToGroup(-1); onClose() }}
        >
          Remove from Group
        </button>
      )}
      
      {/* Make New Group */}
      <button 
        className="context-menu-item"
        onClick={() => { onMakeNewGroup(); onClose() }}
      >
        Make New Group
      </button>
    </div>
  )
}
