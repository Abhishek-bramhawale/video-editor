/** Filename without extension — used to match video ↔ image pairs */
export function getBaseName(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot <= 0) return fileName
  return fileName.slice(0, lastDot)
}

/** Natural sort for names like 1_row-1-column-2, 2_row-1-column-1 */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

export function sortByBaseName<T extends { baseName: string }>(items: T[]): T[] {
  return [...items].sort((x, y) => naturalCompare(x.baseName, y.baseName))
}
