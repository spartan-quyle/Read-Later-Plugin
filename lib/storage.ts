import type { ArchivedWindow } from "./types"

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
