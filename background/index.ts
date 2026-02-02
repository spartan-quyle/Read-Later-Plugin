import { saveArchivedWindow } from "~lib/storage"
import type { ArchivedWindow, SavedGroup, SavedTab } from "~lib/types"

const MENU_ID = "save-window-context-menu"

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Save this window for later",
    contexts: ["all"]
  })
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === MENU_ID && tab) {
    await archiveWindow(tab.windowId)
  }
})

chrome.action.onClicked.addListener(() => openManager())

chrome.runtime.onStartup.addListener(() => openManager())

async function openManager() {
  const managerUrl = chrome.runtime.getURL("tabs/manager.html")
  const tabs = await chrome.tabs.query({ url: managerUrl })

  if (tabs.length > 0) {
    const tab = tabs[0]
    if (tab.windowId) await chrome.windows.update(tab.windowId, { focused: true })
    if (tab.id) await chrome.tabs.update(tab.id, { active: true })
  } else {
    await chrome.tabs.create({ url: "tabs/manager.html" })
  }
}

async function archiveWindow(windowId: number) {
  let windowTitle = ""
  try {
    const win = await chrome.windows.get(windowId)
    // @ts-ignore - Chrome M90+ window naming feature
    if (win.title) windowTitle = win.title
  } catch (e) {
    console.warn("Could not get window info", e)
  }

  const tabs = await chrome.tabs.query({ windowId })
  const groups = await chrome.tabGroups.query({ windowId })

  const savedGroups: SavedGroup[] = groups.map((g) => ({
    originalId: g.id,
    title: g.title || "",
    color: g.color,
    collapsed: g.collapsed
  }))

  const savedTabs: SavedTab[] = tabs.map((t) => {
    let groupIndex = -1
    if (t.groupId !== -1) {
      groupIndex = savedGroups.findIndex((sg) => sg.originalId === t.groupId)
    }
    return {
      url: t.url || "",
      title: t.title || "",
      favIconUrl: t.favIconUrl || "",
      pinned: t.pinned,
      groupIndex
    }
  })

  const generatedTitle = windowTitle || (tabs.length > 0 ? tabs[0].title : "Untitled Window") + ` (${tabs.length} tabs)`

  const archive: ArchivedWindow = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    title: generatedTitle,
    tabs: savedTabs,
    groups: savedGroups
  }

  await saveArchivedWindow(archive)
  console.log("Window saved:", archive)
}
