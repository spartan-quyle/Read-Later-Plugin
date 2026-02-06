import { useState } from "react"
import { saveArchivedWindow, exportAllData, importAllData } from "~lib/storage"
import type { ArchivedWindow, SavedTab, SavedGroup } from "~lib/types"
import { sanitizeUrl } from "../utils/url"

// Define the interface for dependencies
interface ImportExportDeps {
  loadWindows: () => Promise<void>
  addTabToWindow: (winId: string, url: string) => Promise<void>
  windows: ArchivedWindow[]
}

export const useImportExport = ({ loadWindows, addTabToWindow, windows }: ImportExportDeps) => {
  // Import Single
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importTitle, setImportTitle] = useState("")
  const [importContent, setImportContent] = useState("")

  // Export Single
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportContent, setExportContent] = useState("")
  const [exportTitle, setExportTitle] = useState("")

  // Import All
  const [importAllModalOpen, setImportAllModalOpen] = useState(false)
  const [importAllContent, setImportAllContent] = useState("")
  
  // Export All
  const [exportAllModalOpen, setExportAllModalOpen] = useState(false)
  const [exportAllContent, setExportAllContent] = useState("")

  // Add Tab
  const [addTabModalOpen, setAddTabModalOpen] = useState(false)
  const [addTabUrl, setAddTabUrl] = useState("")
  const [addTabWindowId, setAddTabWindowId] = useState("")

  // --- Handlers ---

  const handleImportSubmit = async () => {
      const tabs: SavedTab[] = []
      const groups: SavedGroup[] = []
      const lines = importContent.split("\n")
      
      let currentGroupIndex = -1

      for (let line of lines) {
          const trimmedLine = line.trim()
          
          if (!trimmedLine) {
              currentGroupIndex = -1
              continue
          }

          const groupMatch = trimmedLine.match(/^### Group: (.*) \((.*)\)$/)
          if (groupMatch) {
              const title = groupMatch[1]
              const color = groupMatch[2] as chrome.tabGroups.ColorEnum
              
              groups.push({
                  originalId: -1,
                  title,
                  color,
                  collapsed: false
              })
              currentGroupIndex = groups.length - 1
              continue
          }

          if (trimmedLine.includes("://") || trimmedLine.includes("www.") || trimmedLine.match(/^[A-Za-z]:/)) {
             const sanitized = sanitizeUrl(trimmedLine)
             tabs.push({
                 url: sanitized,
                 title: trimmedLine,
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

  const handleExport = (win: ArchivedWindow) => {
      let text = ""
      let lastGroupIndex = -1

      win.tabs.forEach(tab => {
          if (tab.groupIndex !== lastGroupIndex) {
              if (tab.groupIndex !== undefined && tab.groupIndex !== -1 && win.groups[tab.groupIndex]) {
                  const g = win.groups[tab.groupIndex]
                  text += (text ? "\n\n" : "") + `### Group: ${g.title} (${g.color})\n`
              } else {
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

  const handleImportAllSubmit = async () => {
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

  const handleAddTabSubmit = async () => {
    if (!addTabUrl.trim()) {
      alert("Please enter a URL")
      return
    }
    
    await addTabToWindow(addTabWindowId, addTabUrl)
    
    setAddTabModalOpen(false)
    setAddTabUrl("")
    setAddTabWindowId("")
  }

  const openAddTabModal = (winId: string) => {
      setAddTabWindowId(winId)
      setAddTabModalOpen(true)
  }

  return {
    state: {
       importModalOpen, importTitle, importContent,
       exportModalOpen, exportContent, exportTitle,
       importAllModalOpen, importAllContent,
       exportAllModalOpen, exportAllContent,
       addTabModalOpen, addTabUrl, addTabWindowId
    },
    setters: {
       setImportModalOpen, setImportTitle, setImportContent,
       setExportModalOpen, setExportContent,
       setImportAllModalOpen, setImportAllContent,
       setExportAllModalOpen,
       setAddTabModalOpen, setAddTabUrl, setAddTabWindowId
    },
    actions: {
       handleImportSubmit,
       handleExport,
       downloadExport,
       handleImportAllSubmit,
       handleExportAll,
       downloadExportAll,
       handleAddTabSubmit,
       openAddTabModal
    }
  }
}
