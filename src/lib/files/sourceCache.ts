import type { DocumentFormat } from './types'

export interface CachedSourceFile {
  fileName: string
  format: DocumentFormat
  bytes: ArrayBuffer
}

/**
 * Keeps the raw bytes of the imported document in memory only (never in
 * storage) so the PDF export can redact the original page layout in place.
 */
let cached: CachedSourceFile | null = null

export function setSourceFile(file: CachedSourceFile): void {
  cached = file
}

export function getSourceFile(): CachedSourceFile | null {
  return cached
}

export function clearSourceFile(): void {
  cached = null
}
