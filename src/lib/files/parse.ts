import { countWords } from '@/lib/text'
import { docToText } from './doc'
import { docxToText } from './docx'
import { pdfToText } from './pdf'
import { detectFormat, type ParsedDocument } from './types'

export class FileParseError extends Error {
  readonly messageKey: string
  readonly reason?: string

  constructor(messageKey: string, reason?: string) {
    super(reason ? `${messageKey}: ${reason}` : messageKey)
    this.messageKey = messageKey
    this.reason = reason
  }
}

function decodeTextBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)

  // Strip a UTF-8 BOM if present.
  const start = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0
  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(start))

  if (!decoded.includes('\uFFFD')) return decoded

  // Fall back to cp1252 for legacy Windows exports.
  return new TextDecoder('windows-1252', { fatal: false }).decode(bytes)
}

export async function parseFile(file: File): Promise<ParsedDocument> {
  return parseBuffer({
    buffer: await file.arrayBuffer(),
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
  })
}

export interface ParseBufferInput {
  buffer: ArrayBuffer
  fileName: string
  mimeType?: string
  size: number
}

export async function parseBuffer({
  buffer,
  fileName,
  mimeType = '',
  size,
}: ParseBufferInput): Promise<ParsedDocument> {
  const format = detectFormat(fileName, mimeType)
  if (!format) throw new FileParseError('files.unsupported')

  const warnings: string[] = []

  let text = ''
  let pages: number | undefined
  let paragraphs: number | undefined

  try {
    switch (format) {
      case 'docx': {
        const result = docxToText(buffer)
        text = result.text
        paragraphs = result.paragraphs
        break
      }
      case 'pdf': {
        const result = await pdfToText(buffer)
        text = result.text
        pages = result.pages
        if (!text.trim()) warnings.push('files.pdfEmpty')
        break
      }
      case 'doc': {
        const result = docToText(buffer)
        text = result.text
        warnings.push('files.docWarning')
        break
      }
      default: {
        text = decodeTextBuffer(buffer)
        break
      }
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new FileParseError('files.parseError', reason)
  }

  const normalized = text.replace(/\r\n?/g, '\n').trim()
  if (paragraphs === undefined) {
    paragraphs = normalized ? normalized.split(/\n{2,}/).filter((part) => part.trim()).length : 0
  }

  return {
    fileName,
    format,
    text: normalized,
    size,
    wordCount: countWords(normalized),
    characterCount: normalized.length,
    pages,
    paragraphs,
    warnings,
  }
}
