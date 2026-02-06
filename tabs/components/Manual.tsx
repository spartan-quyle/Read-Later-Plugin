import React from "react"
import { Logo } from "./Logo"

export function Manual() {
    return (
        <div className="window-list" style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div className="window-card" style={{ padding: "2rem", cursor: "default", border: "2px solid var(--text-color)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem", borderBottom: "2px solid var(--text-color)", paddingBottom: "1rem" }}>
                    <Logo width={40} height={40} />
                    <h2 style={{ margin: 0, textTransform: "uppercase", fontSize: "1.5rem" }}>User Manual</h2>
                </div>

                <div style={{ display: "grid", gap: "2rem", fontSize: "1.1rem" }}>
                    
                    <section>
                        <h3 style={{ textTransform: "uppercase", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>1. Saving Windows</h3>
                        <p><strong>Right-Click Context Menu:</strong> Right-click anywhere on a webpage and select "Save this window for later".</p>
                        <p><strong>Keyboard Shortcut:</strong> (Coming Soon)</p>
                        <p>The window will be closed immediately and saved to your "Archives" list.</p>
                    </section>

                    <section>
                        <h3 style={{ textTransform: "uppercase", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>2. Managing Archives</h3>
                        <ul style={{ lineHeight: "1.6", paddingLeft: "1.5rem" }}>
                            <li><strong>Expand/Collapse:</strong> Click on a window card header to reveal or hide its tabs.</li>
                            <li><strong>Edit Title:</strong> Click the pencil icon next to the window title to rename it.</li>
                            <li><strong>Star/Pin:</strong> Click the star icon to keep important windows at the top.</li>
                            <li><strong>Add Tab:</strong> Click the "+ Add Tab" button inside a window to manually add a URL.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 style={{ textTransform: "uppercase", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>3. Drag & Drop Organization</h3>
                        <p><strong>Reorder Windows:</strong> Drag window cards up and down to change their sort order.</p>
                        <p><strong>Organize Tabs:</strong></p>
                        <ul style={{ lineHeight: "1.6", paddingLeft: "1.5rem" }}>
                            <li>Drag tabs between different windows.</li>
                            <li>Drag tabs into Groups to organize them.</li>
                            <li>Drag tabs <em>out</em> of groups to ungroup them.</li>
                            <li><strong>Group Reordering:</strong> You can reorder tabs within a group (Visual feedback is currently limited).</li>
                        </ul>
                    </section>

                    <section>
                        <h3 style={{ textTransform: "uppercase", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>4. Groups</h3>
                        <p><strong>Create Group:</strong> Click "Create Group" inside an expanded window.</p>
                        <p><strong>Auto-Collapse:</strong> When dragging a group, it automatically collapses to make moving easier.</p>
                        <p><strong>Edit Group:</strong> Click the pencil icon on a group header to change its Title and Color.</p>
                    </section>

                    <section>
                        <h3 style={{ textTransform: "uppercase", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>5. Import / Export</h3>
                        <p><strong>Backup:</strong> Use the "Export All" button in the header to save a JSON backup of all your data.</p>
                        <p><strong>Restore:</strong> Use "Import All" to restore from a backup file (This merges with existing data).</p>
                        <p><strong>Single Window:</strong> You can export/import individual windows as text lists of URLs.</p>
                    </section>

                     <section>
                        <h3 style={{ textTransform: "uppercase", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>6. Tips & Tricks</h3>
                        <ul style={{ lineHeight: "1.6", paddingLeft: "1.5rem" }}>
                            <li><strong>Context Menu:</strong> Right-click on any saved tab in the list to quickly Move it to a group or Make a new group.</li>
                            <li><strong>Sanitization:</strong> You can paste local file paths (e.g. <code>E:\MyFolder\File.pdf</code>) and they will be auto-converted to <code>file:///</code> URLs.</li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    )
}
