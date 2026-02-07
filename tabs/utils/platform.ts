
export const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

export const getModifierKey = () => isMac ? "Cmd" : "Ctrl";

export const getModifierKeySymbol = () => isMac ? "⌘" : "Ctrl";

export const isModifierKeyPressed = (e: KeyboardEvent | React.KeyboardEvent) => 
    isMac ? e.metaKey : e.ctrlKey;
