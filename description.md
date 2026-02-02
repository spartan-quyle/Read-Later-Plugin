Develop a chromium-based "Read later" extension (est: 15min -- 1hr) using Plasmo framework.
It will add an option to the context menu (right click) of clicking on a window bar. In the current context, window refers to a group of tabs. Without further explanation, we refer to the currently focused window as "this window".
When clicked, it will save all the URIs and URLs of all the tabs (preserving the order) in this window to a list, to view later.
Have an option to reopen the closed windows.
There will be some UI screen (a page) that can be opened from the extension icon. This page will show a list of multiple archived windows. Can view the list of tabs/ URLs/ URIs / title of all pages inside a window before re-opening them. Each archived window have the option to re-open all tabs inside it.
There will also be a button to delete an archived window or delete individual tabs from an archived window.

Advanced: Support for tab groups (for Brave browser or Edge):
- Definition: Tab group is a collection of tabs, that is named and colored. A tab group can be collapsed or expanded. When collapsed, all the tabs in the group are hidden but the group title is still visible. The tab group feature is implemented in some browsers such as Brave, Edge, Chrome, etc.
- When a window is archived then all of its child tab groups will be archived too. Each archived tab group will be shown correspondingly as a group of tabs in the archived window list.

