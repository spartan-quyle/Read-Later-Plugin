export const sanitizeUrl = (input: string): string => {
  const trimmed = input.trim()
  
  // Check if it's a Windows file path (e.g., E:\path\file.pdf or C:\Users\...)
  const windowsPathRegex = /^[A-Za-z]:\\/
  if (windowsPathRegex.test(trimmed)) {
    // Convert backslashes to forward slashes
    let path = trimmed.replace(/\\/g, '/')
    // Add file:/// protocol
    path = 'file:///' + path
    // URL encode spaces and special characters
    const parts = path.split('/')
    const encoded = parts.map((part, idx) => {
      if (idx < 3) return part // Don't encode 'file:///'
      return encodeURIComponent(part).replace(/%2F/g, '/')
    }).join('/')
    return encoded
  }
  
  // Check if it already has a protocol (http, https, file, chrome-extension, etc.)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    return trimmed
  }
  
  // Otherwise, assume it's a regular URL and add https://
  if (trimmed.includes('.') && !trimmed.includes(' ')) {
    return 'https://' + trimmed
  }
  
  return trimmed
}
