# Read Later Extension

A powerful Chromium-based extension to "read later" by archiving entire windows, including their tab groups, and restoring them exactly as they were. Built with [Plasmo](https://www.plasmo.com/), React, and TypeScript.

## Features

- **Window Archiving**: Save an entire window including all tabs and metadata.
- **Tab Group Support**: Preserves tab groups (names, colors, collapsed state) when archiving and restoring.
- **Visual Dashboard**: A clean, dark-mode compatible dashboard to manage your saved windows.
- **Manual & Guide**: Built-in visual manual to help you master the extension's features.
- **Granular Control**: Delete individual tabs from an archive or delete entire archives.
- **Context Menu Integration**: distinct "Save this window for later" option in the right-click menu.

## Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

### 1. Clone & Install
```bash
# Clone the repository (if applicable) or navigate to project folder
cd ReadLaterPlugin

# Install dependencies
npm install
```

### 2. Build the Extension
To create a production-ready build for Chrome:

```bash
npm run build
```
This will create a `build/chrome-mv3-prod` directory.

### 3. Load into Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle switch in the top right corner.
3. Click the **Load unpacked** button.
4. Select the `build/chrome-mv3-prod` folder inside your project directory.
5. The extension "Read Later" should now appear in your list.

## Usage Guide

### Archiving a Window
1. Open a window with multiple tabs and/or tab groups that you want to save.
2. **Right-click** anywhere on a webpage background.
3. Select **"Save this window for later"** from the context menu.
4. The window is now saved globally in your browser storage. You can close it safely.

### Viewing & Managing Archives
1. Pin the **Read Later** extension icon to your browser toolbar for easy access.
2. Click the extension icon.
3. Click **"Open Dashboard"**.
4. You will see a list of all archived windows, sorted by date.
   - **Expand**: Click on a window card to view the list of tabs and groups inside.
   - **Delete Tab**: Hover over a tab in the expanded view and click the **×** button to remove just that tab.
   - **Delete Window**: Click the **Delete** button on the window card to remove the entire archive.

### Restoring a Window
1. From the Dashboard, find the window you want to reopen.
2. Click the **Restore** button.
3. A new window will open with all your tabs loaded and organized into their original groups.

## Development

To run the extension in development mode with live reloading:

```bash
npm run dev
```
1. Load the `build/chrome-mv3-dev` folder in `chrome://extensions/`.
2. Changes to the code will automatically rebuild the extension.

## Tech Stack
- **Framework**: Plasmo
- **UI**: React 18, TypeScript
- **Storage**: Chrome Storage API
- **Styling**: Native CSS Variables (Dark mode support)
