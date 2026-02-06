import type { ArchivedWindow, TrashedItem } from "./types"

const STORAGE_KEY = "archivedWindows"

export async function getArchivedWindows(): Promise<ArchivedWindow[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return result[STORAGE_KEY] || []
}

export async function saveArchivedWindow(windowData: ArchivedWindow) {
  const windows = await getArchivedWindows()
  await chrome.storage.local.set({ [STORAGE_KEY]: [windowData, ...windows] })
}

export async function deleteArchivedWindow(id: string) {
  const windows = await getArchivedWindows()
  await chrome.storage.local.set({ [STORAGE_KEY]: windows.filter((w) => w.id !== id) })
}

export async function updateArchivedWindow(updatedWindow: ArchivedWindow) {
  const windows = await getArchivedWindows()
  const index = windows.findIndex((w) => w.id === updatedWindow.id)
  if (index !== -1) {
    windows[index] = updatedWindow
    await chrome.storage.local.set({ [STORAGE_KEY]: windows })
  }
}

// --- Trash Management ---
const TRASH_KEY = "trashedItems"
const MAX_TRASH_ITEMS = 100

export async function getTrashedItems(): Promise<TrashedItem[]> {
    const result = await chrome.storage.local.get(TRASH_KEY)
    return result[TRASH_KEY] || []
}

export async function addToTrash(item: TrashedItem) {
    let items = await getTrashedItems()
    items.unshift(item) // Add to front (newest first)
    if (items.length > MAX_TRASH_ITEMS) {
        items = items.slice(0, MAX_TRASH_ITEMS) // Evict oldest
    }
    await chrome.storage.local.set({ [TRASH_KEY]: items })
}

export async function removeFromTrash(itemId: string) {
    const items = await getTrashedItems()
    await chrome.storage.local.set({ [TRASH_KEY]: items.filter(i => i.id !== itemId) })
}

export async function clearTrash() {
    await chrome.storage.local.set({ [TRASH_KEY]: [] })
}

// --- Export/Import All ---
export async function exportAllData(): Promise<string> {
    const windows = await getArchivedWindows()
    const trash = await getTrashedItems()
    
    const data: import("./types").AllData = {
        archivedWindows: windows,
        trashedItems: trash,
        version: "1.0"
    }
    
    return JSON.stringify(data, null, 2)
}

export async function importAllData(jsonString: string): Promise<{ success: boolean; error?: string }> {
    try {
        const data = JSON.parse(jsonString) as import("./types").AllData
        
        // Validate structure
        if (!data.archivedWindows || !Array.isArray(data.archivedWindows)) {
            return { success: false, error: "Invalid data structure: missing archivedWindows" }
        }
        if (!data.trashedItems || !Array.isArray(data.trashedItems)) {
            return { success: false, error: "Invalid data structure: missing trashedItems" }
        }
        
        // Import data
        await chrome.storage.local.set({ 
            [STORAGE_KEY]: data.archivedWindows,
            [TRASH_KEY]: data.trashedItems
        })
        
        return { success: true }
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "Unknown error" }
    }
}

