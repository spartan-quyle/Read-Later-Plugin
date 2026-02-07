import { useEffect } from "react"
import type { useArchiveManager } from "./useArchiveManager"
import { isModifierKeyPressed } from "../utils/platform"

export function useKeyboardShortcuts(archive: ReturnType<typeof useArchiveManager>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Cmd+Z (Mac) or Ctrl+Z (Windows)
      if (isModifierKeyPressed(e) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault()
        if (archive.trashedItems.length > 0) {
          const lastItem = archive.trashedItems[0]
          archive.restoreFromTrash(lastItem)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [archive])
}
