import type { DropResult } from "@hello-pangea/dnd"
import type { ArchivedWindow, SavedGroup, SavedTab } from "~lib/types"

interface DragAndDropDeps {
    windows: ArchivedWindow[]
    setWindows: (windows: ArchivedWindow[]) => void
    updateArchivedWindow: (win: ArchivedWindow) => Promise<void>
}

export const useDragAndDrop = ({ windows, setWindows, updateArchivedWindow }: DragAndDropDeps) => {
    
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
            // Helper to rebuild visual list logic (mimicking TabList render)
            const rebuildVisualList = () => {
                const list: VisualItem[] = []
                let lastGroupIndex = -1
                
                 destWin.tabs.forEach((tab, i) => {
                     const gIndex = tab.groupIndex ?? -1
                     if (gIndex !== lastGroupIndex) {
                         if (lastGroupIndex !== -1) {
                             if (destWin.groups[lastGroupIndex]) {
                                 list.push({ type: 'GROUP', group: destWin.groups[lastGroupIndex], originalIndex: lastGroupIndex })
                             }
                         }
                         lastGroupIndex = gIndex
                     }
                     
                     if (gIndex === -1) {
                         list.push({ type: 'TAB', tab, originalIndex: i })
                     }
                 })
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
                else insertIndex = destWin.tabs.length 
            }
            
            payloadTabs[0].groupIndex = targetGroupIndex
            destWin.tabs.splice(insertIndex, 0, payloadTabs[0])
        }
  
        setWindows(newWindows)
        await chrome.storage.local.set({ "archivedWindows": newWindows })
    }

    return { onDragEnd }
}
