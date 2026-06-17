/** Build a file:// URL that works for local media on Windows and POSIX. */
export function pathToFileURL(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  if (normalized.startsWith('file://')) return normalized

  const encoded = normalized
    .split('/')
    .map((segment, i) => (i === 0 && /^[a-zA-Z]:$/.test(segment) ? segment : encodeURIComponent(segment)))
    .join('/')

  if (/^[a-zA-Z]:\//.test(encoded) || encoded.startsWith('/')) {
    return `file:///${encoded}`
  }
  return `file://${encoded}`
}
