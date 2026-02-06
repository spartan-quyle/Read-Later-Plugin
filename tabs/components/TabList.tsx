import React from "react"
import { Droppable, Draggable } from "@hello-pangea/dnd"
import type { ArchivedWindow, SavedTab, SavedGroup } from "~lib/types"
import { TabItem } from "./TabItem"
import { GroupBlock } from "./GroupBlock"

export interface TabListProps {
  window: ArchivedWindow
  onDeleteTab: (tab: SavedTab, index: number, winId: string) => void
  onDeleteGroup: (winId: string, gIndex: number) => void
  onEditGroup: (winId: string, gIndex: number, title: string, color: chrome.tabGroups.ColorEnum) => void
  onUngroupTabs: (winId: string, gIndex: number) => void
  onTabContextMenu?: (e: React.MouseEvent, tab: SavedTab, tabIndex: number, windowId: string) => void
}

export function TabList({ 
  window, 
  onDeleteTab, 
  onDeleteGroup, 
  onEditGroup, 
  onUngroupTabs,
  onTabContextMenu 
}: TabListProps) {
  const renderItems = () => {
    const nodes: React.ReactNode[] = []
    let lastGroupIndex = -1
    let currentGroupTabs: { tab: SavedTab; index: number }[] = []

    const flushGroup = () => {
      if (lastGroupIndex !== -1) {
        const group = window.groups[lastGroupIndex]
        if (!group) {
            // Handle edge case where group index is invalid
            currentGroupTabs = []
            return
        }
        const draggableId = group.id || `group-${window.id}-${lastGroupIndex}`
        const visualIndex = nodes.length 
        const tabsCopy = [...currentGroupTabs] // Pass a copy, not the reference!
        const capturedGroupIndex = lastGroupIndex // Capture for closure

        nodes.push(
            <Draggable key={draggableId} draggableId={draggableId} index={visualIndex}>
                {(provided) => (
                    <div ref={provided.innerRef} {...provided.draggableProps} style={provided.draggableProps.style}>
                        <GroupBlock
                            group={group}
                            tabsWithIndices={tabsCopy}
                            onDeleteTab={onDeleteTab}
                            onDeleteGroup={() => onDeleteGroup(window.id, capturedGroupIndex)}
                            onEditGroup={(t, c) => onEditGroup(window.id, capturedGroupIndex, t, c)}
                            onUngroupTabs={() => onUngroupTabs(window.id, capturedGroupIndex)}
                            onTabContextMenu={onTabContextMenu ? (e, tab, idx) => onTabContextMenu(e, tab, idx, window.id) : undefined}
                            winId={window.id}
                            dragHandleProps={provided.dragHandleProps}
                            groupIndex={capturedGroupIndex}
                        />
                    </div>
                )}
            </Draggable>
        )
      } else {
        currentGroupTabs.forEach(({ tab, index }) => {
          const draggableId = tab.id || `tab-${window.id}-${index}`
          const visualIndex = nodes.length 

          nodes.push(
            <Draggable key={draggableId} draggableId={draggableId} index={visualIndex}>
                {(provided) => (
                    <div ref={provided.innerRef} {...provided.draggableProps} style={provided.draggableProps.style}>
                        <TabItem
                            tab={tab}
                            onDelete={(e) => { e.stopPropagation(); onDeleteTab(tab, index, window.id) }}
                            onContextMenu={onTabContextMenu ? (e) => onTabContextMenu(e, tab, index, window.id) : undefined}
                            dragHandleProps={provided.dragHandleProps}
                        />
                    </div>
                )}
            </Draggable>
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

  // Droppable for the Window Content (List of Groups/Tabs)
  return (
      <Droppable droppableId={`win-content-${window.id}`} type="ITEM">
          {(provided) => (
            <ul className="tab-list" ref={provided.innerRef} {...provided.droppableProps}>
                {renderItems()}
                {provided.placeholder}
            </ul>
          )}
      </Droppable>
  )
}
