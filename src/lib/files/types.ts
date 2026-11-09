export type DocumentFormat = 'txt' | 'md' | 'csv' | 'json' | 'doc' | 'docx' | 'pdf'

export type ExportFormat = 'txt' | 'md' | 'docx' | 'pdf'

/** A region of a PDF page marked for redaction by the user (e.g. a scan). */
export interface ManualRedaction {
  id: string
  /** 1-based page number. */
  page: number
  /** PDF user space rectangle (points, origin bottom-left). */
  x: number
  y: number
  width: number
  height: number
}

/** A sensitive span to paint over in the original PDF. */
export interface RedactionEdit {
  /** Offsets into the (normalized) extracted text. */
  start: number
  end: number
  /** Token that replaces the value, e.g. `[PESEL_1]`. */
  token: string
  /** Original value - used to re-locate the span if the offsets drifted. */
  value?: string
}

export interface ParsedDocument {
  fileName: string
  format: DocumentFormat
  text: string
  size: number
  wordCount: number
  characterCount: number
  pages?: number
  paragraphs?: number
  /** i18n keys of warnings to show in the preview. */
  warnings: string[]
}

export const SUPPORTED_EXTENSIONS = ['txt', 'md', 'log', 'csv', 'json', 'doc', 'docx', 'pdf']

export function extensionOf(fileName: string): string {
  const index = fileName.lastIndexOf('.')
  return index === -1 ? '' : fileName.slice(index + 1).toLowerCase()
}

export function detectFormat(fileName: string, mimeType = ''): DocumentFormat | null {
  const extension = extensionOf(fileName)

  switch (extension) {
    case 'txt':
    case 'log':
      return 'txt'
    case 'md':
    case 'markdown':
      return 'md'
    case 'csv':
      return 'csv'
    case 'json':
      return 'json'
    case 'doc':
      return 'doc'
    case 'docx':
      return 'docx'
    case 'pdf':
      return 'pdf'
    default:
      break
  }

  if (mimeType.includes('pdf')) return 'pdf'
  if (mimeType.includes('wordprocessingml')) return 'docx'
  if (mimeType.includes('msword')) return 'doc'
  if (mimeType.startsWith('text/')) return 'txt'

  return null
}

/** Default export format for a given source document. */
export function preferredExportFormat(format?: DocumentFormat): ExportFormat {
  switch (format) {
    case 'md':
      return 'md'
    case 'docx':
    case 'doc':
      return 'docx'
    case 'pdf':
      return 'pdf'
    default:
      return 'txt'
  }
}

export function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '')
}

/** 1 -> A, only used for labels in the UI. */
export function formatLabel(format: DocumentFormat): string {
  return format.toUpperCase()
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
