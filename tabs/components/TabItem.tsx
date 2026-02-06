import React from "react"
import type { SavedTab } from "~lib/types"

export interface TabItemProps {
  tab: SavedTab
  onDelete: (e: React.MouseEvent) => void
  onContextMenu?: (e: React.MouseEvent) => void
  dragHandleProps?: any
}

export function TabItem({ tab, onDelete, onContextMenu, dragHandleProps }: TabItemProps) {
  const handleLinkClick = (e: React.MouseEvent) => {
    e.preventDefault()
    chrome.tabs.create({ url: tab.url, active: true })
  }

  return (
    <li className="tab-item" onContextMenu={onContextMenu}>
      <div {...dragHandleProps} className="drag-handle" style={{ marginRight: '0.5rem', opacity: 0.2 }}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"></path></svg>
      </div>
      <img
        src={tab.favIconUrl || "https://extension-icons.pl/favicon"}
        className="tab-favicon"
        alt=""
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
      <a href={tab.url} onClick={handleLinkClick} className="tab-link" title={tab.url}>
        {tab.title || tab.url}
      </a>
      <div className="tab-actions">
        <button className="icon-btn" onClick={onDelete} title="Remove tab">×</button>
      </div>
    </li>
  )
}
