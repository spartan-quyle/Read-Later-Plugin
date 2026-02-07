import React, { useState } from "react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { WindowCard, ContextMenu, Logo, Manual } from "./components"
import { useArchiveManager } from "./hooks/useArchiveManager"
import { useDragAndDrop } from "./hooks/useDragAndDrop"
import { useImportExport } from "./hooks/useImportExport"
import { useContextMenu } from "./hooks/useContextMenu"
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts"
import "./manager.css"

function Manager() {
  const [activeTab, setActiveTab] = useState<'archives' | 'trash' | 'manual'>('archives')
  const [manualOrder, setManualOrder] = useState(false)

  const archive = useArchiveManager()
  
  // Initialize Keyboard Shortcuts
  useKeyboardShortcuts(archive)

  const io = useImportExport({
    loadWindows: archive.loadWindows,
    addTabToWindow: archive.addTabToWindow,
    windows: archive.windows
  })

  // Destructure IO state and setters for cleaner JSX
  const { 
    importModalOpen, importTitle, importContent,
    exportModalOpen, exportContent, exportTitle,
    importAllModalOpen, importAllContent,
    exportAllModalOpen, exportAllContent,
    addTabModalOpen, addTabUrl 
  } = io.state
  
  const {
     setImportModalOpen, setImportTitle, setImportContent,
     setExportModalOpen, setExportContent,
     setImportAllModalOpen, setImportAllContent,
     setExportAllModalOpen, 
     setAddTabModalOpen, setAddTabUrl
  } = io.setters

  const ctx = useContextMenu({
    windows: archive.windows,
    updateArchivedWindow: archive.updateArchivedWindow
  })

  const dnd = useDragAndDrop({
    windows: archive.windows,
    setWindows: archive.setWindows,
    updateArchivedWindow: archive.updateArchivedWindow
  })

  return (
    <div className="container">
       {/* Header - Full Width / Wider */}
       <div className="header-container">
           <div className="header">
              <div className="header-content">
                  <h1>
                    <Logo width={32} height={32} />
                    READ LATER
                  </h1>
                  <p className="subtitle">Manager</p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn" onClick={archive.createWindow} title="Create a New Empty Window">+ Add Window</button>
                <button className="btn" onClick={() => setImportModalOpen(true)}>Import from List</button>
                <button className="btn" onClick={() => setImportAllModalOpen(true)}>Import All</button>
                <button className="btn" onClick={io.actions.handleExportAll}>Export All</button>
              </div>
           </div>
       </div>

       {/* Main Content - Centered & Fixed Width */}
       <div className="content-container">

       {/* Tabs for Archives / Trash / Manual */}
       <div className="tab-nav">
        <button 
          onClick={() => setActiveTab('archives')}
          className={`tab-btn ${activeTab === 'archives' ? 'active' : ''}`}
        >
          Archives ({archive.windows.length})
        </button>
        <button 
          onClick={() => setActiveTab('trash')}
          className={`tab-btn ${activeTab === 'trash' ? 'active' : ''}`}
        >
          Trash ({archive.trashedItems.length})
        </button>
        <button 
          onClick={() => setActiveTab('manual')}
          className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
        >
          Manual
        </button>
      </div>

       {/* List Content */}
       {activeTab === 'manual' ? (
           <Manual />
       ) : activeTab === 'archives' ? (
           <DragDropContext onDragEnd={dnd.onDragEnd} onDragStart={dnd.onDragStart}>
              <Droppable droppableId="window-list" type="WINDOW">
                 {(provided) => (
                    <div 
                      ref={provided.innerRef} 
                      {...provided.droppableProps}
                      className="window-list"
                    >
                        {archive.windows.length === 0 ? (
                           <div className="empty-state">No archived windows.</div>
                        ) : (
                          archive.windows.map((win, index) => (
                              <Draggable draggableId={win.id} index={index} key={win.id}>
                                {(dragProvided, dragSnapshot) => (
                                    <div
                                        ref={dragProvided.innerRef}
                                        {...dragProvided.draggableProps}
                                        style={{marginBottom: 10, ...dragProvided.draggableProps.style}}
                                        className={dragSnapshot.isDragging ? 'is-dragging' : ''}
                                    >
                                        <WindowCard 
                                            window={win}
                                            dragHandleProps={dragProvided.dragHandleProps}
                                            onToggleStar={(w, e) => { e.stopPropagation(); archive.toggleStar(win) }} 
                                            onUpdateTitle={archive.updateTitle}
                                            onExport={() => io.actions.handleExport(win)}
                                            onDelete={(id, e) => { e.stopPropagation(); archive.deleteWindow(win.id) }} 
                                            onRestore={(w, e) => { e.stopPropagation(); archive.restoreWindow(win) }}
                                            onAddTab={() => io.actions.openAddTabModal(win.id)}
                                            onCreateGroup={archive.createGroup}
                                            onEditGroup={async (winId, gIndex, title, color) => {
                                                const w = archive.windows.find(w => w.id === winId)
                                                if(w) {
                                                    const newGroups = [...w.groups]
                                                    newGroups[gIndex] = { ...newGroups[gIndex], title, color }
                                                    await archive.updateArchivedWindow({ ...w, groups: newGroups })
                                                }
                                            }}
                                            onUngroupTabs={async (winId, gIndex) => {
                                                const w = archive.windows.find(w => w.id === winId)
                                                if(w) {
                                                    const newTabs = w.tabs.map(t => t.groupIndex === gIndex ? { ...t, groupIndex: -1 } : t)
                                                    const newGroups = w.groups.filter((_, i) => i !== gIndex)
                                                    newTabs.forEach(t => { if(t.groupIndex > gIndex) t.groupIndex-- })
                                                    await archive.updateArchivedWindow({ ...w, groups: newGroups, tabs: newTabs })
                                                }
                                            }}
                                            onDeleteTab={archive.deleteTab}
                                            onDeleteGroup={archive.deleteGroup}
                                            onTabContextMenu={ctx.handleTabContextMenu}
                                            isDraggingGroup={dnd.isDraggingGroup}
                                        />
                                    </div>
                                )}
                              </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                    </div>
                 )}
              </Droppable>
           </DragDropContext>
       ) : (
           <div className="trash-list">
               {archive.trashedItems.length === 0 ? (
                   <div className="empty-state">Trash is empty.</div>
               ) : (
                   archive.trashedItems.map(item => (
                       <div key={item.id} className="trash-item">
                           <div className="trash-item-info">
                               <span className="trash-item-type">
                                  {item.type === 'group' ? '📁' : '📄'}
                               </span>
                               <div>
                                   <div className="trash-item-title">
                                      {item.type === 'group' ? (item.item as any).title : (item.item as any).title}
                                   </div>
                                    <small style={{ color: 'var(--secondary-text)' }}>From: {item.windowTitle}</small>
                               </div>
                           </div>
                           <div className="trash-item-actions">
                             <button className="btn" onClick={() => archive.restoreFromTrash(item)}>Restore</button>
                             <button className="btn btn-danger" onClick={() => archive.permanentDelete(item.id)} style={{ marginLeft: "10px" }}>Delete Forever</button>
                           </div>
                       </div>
                   ))
               )}
           </div>
       )}

       {/* Context Menu */}
       {ctx.contextMenu && ctx.contextMenu.visible && (
           <ContextMenu 
               contextMenu={ctx.contextMenu}
               onClose={() => ctx.setContextMenu(null)}
               onMoveToGroup={ctx.handleMoveTabToGroup}
               onMakeNewGroup={ctx.handleMakeNewGroupWithTab}
               windows={archive.windows}
           />
       )}

       {/* Modals */}
       
       {importModalOpen && (
           <div className="modal-overlay">
               <div className="modal-content">
                   <h3>Import from List</h3>
                   <input 
                      type="text" 
                      placeholder="Window Title (Optional)" 
                      value={importTitle} 
                      onChange={(e) => setImportTitle(e.target.value)} 
                      className="modal-input"
                   />
                   <textarea 
                      placeholder="Paste URLs here (one per line)..." 
                      value={importContent} 
                      onChange={(e) => setImportContent(e.target.value)} 
                      className="modal-textarea"
                      style={{ height: "200px" }}
                   />
                   <div className="modal-actions">
                       <button className="btn" onClick={() => setImportModalOpen(false)}>Cancel</button>
                       <button onClick={io.actions.handleImportSubmit} className="btn btn-primary">Import</button>
                   </div>
               </div>
           </div>
       )}

       {exportModalOpen && (
            <div className="modal-overlay">
                <div className="modal-content">
                    <h3>Export Window: {exportTitle}</h3>
                    <textarea 
                       readOnly 
                       value={exportContent} 
                       className="modal-textarea"
                       style={{ height: "200px" }}
                    />
                    <div className="modal-actions">
                        <button className="btn" onClick={() => setExportModalOpen(false)}>Close</button>
                        <button className="btn" onClick={() => {
                            navigator.clipboard.writeText(exportContent)
                            alert("Copied to clipboard!")
                        }}>Copy</button>
                        <button onClick={io.actions.downloadExport} className="btn btn-primary">Download .txt</button>
                    </div>
                </div>
            </div>
       )}

       {importAllModalOpen && (
           <div className="modal-overlay">
               <div className="modal-content">
                   <h3>Import All Data</h3>
                   <p style={{marginBottom: "1rem"}}>Paste the content of a backup JSON file here. <strong>Warning: This will merge with existing data.</strong></p>
                   <textarea 
                      value={importAllContent} 
                      onChange={(e) => setImportAllContent(e.target.value)} 
                      className="modal-textarea"
                      style={{ height: "200px" }}
                   />
                   <div className="modal-actions">
                       <button className="btn" onClick={() => setImportAllModalOpen(false)}>Cancel</button>
                       <button onClick={io.actions.handleImportAllSubmit} className="btn btn-primary">Import</button>
                   </div>
               </div>
           </div>
       )}

       {exportAllModalOpen && (
           <div className="modal-overlay">
               <div className="modal-content">
                   <h3>Export All Data</h3>
                   <textarea 
                      readOnly 
                      value={exportAllContent} 
                      className="modal-textarea"
                      style={{ height: "200px" }}
                   />
                   <div className="modal-actions">
                       <button className="btn" onClick={() => setExportAllModalOpen(false)}>Close</button>
                       <button className="btn" onClick={() => {
                            navigator.clipboard.writeText(exportAllContent)
                            alert("Copied to clipboard!")
                       }}>Copy</button>
                       <button onClick={io.actions.downloadExportAll} className="btn btn-primary">Download .json</button>
                   </div>
               </div>
           </div>
       )}

       {addTabModalOpen && (
           <div className="modal-overlay">
               <div className="modal-content">
                   <h3>Add a Tab</h3>
                   <input 
                      type="text" 
                      placeholder="Enter URL or File Path..." 
                      value={addTabUrl} 
                      onChange={(e) => setAddTabUrl(e.target.value)} 
                      className="modal-input"
                      autoFocus
                   />
                   <div className="modal-actions">
                       <button className="btn" onClick={() => setAddTabModalOpen(false)}>Cancel</button>
                       <button onClick={io.actions.handleAddTabSubmit} className="btn btn-primary">Add Tab</button>
                   </div>
               </div>
           </div>
       )}

    </div>
    </div>
  )
}

export default Manager
