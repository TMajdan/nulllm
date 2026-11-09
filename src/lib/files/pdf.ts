import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { normalizeWhitespace } from './docx'

interface TextItemLike {
  str: string
  hasEOL?: boolean
  transform?: number[]
  width?: number
  height?: number
}

/** Lazily loads pdf.js and points it at the locally bundled worker. */
export async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  return pdfjs
}

/** Geometry of a single text item, in PDF user space (origin bottom-left). */
export interface PdfTextItemMetrics {
  str: string
  x: number
  y: number
  width: number
  height: number
  /** Text is rotated/skewed, so an axis aligned redaction box is unreliable. */
  rotated: boolean
}

export interface PdfTextOrigin {
  page: number
  item: number
  charIndex: number
}

export interface PdfTextLayout {
  /** Normalized text - identical to what the editor receives. */
  text: string
  pages: number
  /** Raw, un-normalized text as extracted from the pages. */
  raw: string
  /** For every char of `raw`: where it came from, `null` for separators. */
  origins: Array<PdfTextOrigin | null>
  /** For every char of `text`: index of the matching char in `raw`. */
  rawIndex: number[]
  /** All text items grouped by page (index `page - 1`). */
  items: PdfTextItemMetrics[][]
}

function toMetrics(item: TextItemLike): PdfTextItemMetrics {
  const transform = item.transform ?? [1, 0, 0, 1, 0, 0]
  const fallbackHeight = Math.abs(transform[3]) || 10
  const height =
    typeof item.height === 'number' && Number.isFinite(item.height) && item.height > 0
      ? item.height
      : fallbackHeight
  const width =
    typeof item.width === 'number' && Number.isFinite(item.width) && item.width >= 0
      ? item.width
      : item.str.length * height * 0.5

  return {
    str: item.str,
    x: transform[4] ?? 0,
    y: transform[5] ?? 0,
    width,
    height,
    rotated:
      Math.abs(transform[1]) > 0.01 || Math.abs(transform[2]) > 0.01 || (transform[0] ?? 1) <= 0,
  }
}

interface MappedText {
  text: string
  /** `rawIndex[i]` = index in the raw string of `text[i]`. */
  rawIndex: number[]
}

function replaceMapped(value: MappedText, pattern: RegExp, replacement: string): MappedText {
  const out: string[] = []
  const rawIndex: number[] = []
  const source = value.text

  let cursor = 0
  let match: RegExpExecArray | null
  pattern.lastIndex = 0

  while ((match = pattern.exec(source)) !== null) {
    for (let index = cursor; index < match.index; index += 1) {
      out.push(source[index])
      rawIndex.push(value.rawIndex[index])
    }

    const anchor = value.rawIndex[match.index] ?? 0
    for (const char of replacement) {
      out.push(char)
      rawIndex.push(anchor)
    }

    cursor = match.index + match[0].length
    if (match[0].length === 0) pattern.lastIndex += 1
  }

  for (let index = cursor; index < source.length; index += 1) {
    out.push(source[index])
    rawIndex.push(value.rawIndex[index])
  }

  return { text: out.join(''), rawIndex }
}

/**
 * Mirrors `normalizeWhitespace` while keeping a pointer back to the raw
 * offsets, so redaction ranges can be traced to concrete PDF text items.
 */
function normalizeMapped(raw: string): MappedText {
  let value: MappedText = {
    text: raw,
    rawIndex: Array.from({ length: raw.length }, (_, index) => index),
  }

  value = replaceMapped(value, /\u0000/g, '')
  value = replaceMapped(value, /[ \t]+\n/g, '\n')
  value = replaceMapped(value, /\n{3,}/g, '\n\n')
  value = replaceMapped(value, /[ \t]{2,}/g, ' ')

  let start = 0
  let end = value.text.length
  while (start < end && /\s/.test(value.text[start])) start += 1
  while (end > start && /\s/.test(value.text[end - 1])) end -= 1

  return {
    text: value.text.slice(start, end),
    rawIndex: value.rawIndex.slice(start, end),
  }
}

function extractPage(
  items: unknown[],
  pageNumber: number,
  metrics: PdfTextItemMetrics[],
  origins: Array<PdfTextOrigin | null>,
): string {
  let text = ''
  let lastY: number | null = null

  for (const rawItem of items) {
    const item = rawItem as TextItemLike
    if (!item || typeof item.str !== 'string') continue

    const y = item.transform?.[5]

    if (typeof y === 'number' && lastY !== null && Math.abs(y - lastY) > 2) {
      text += '\n'
      origins.push(null)
    } else if (text && !text.endsWith('\n') && !text.endsWith(' ')) {
      text += ' '
      origins.push(null)
    }

    const itemIndex = metrics.length
    metrics.push(toMetrics(item))

    for (let charIndex = 0; charIndex < item.str.length; charIndex += 1) {
      text += item.str[charIndex]
      origins.push({ page: pageNumber, item: itemIndex, charIndex })
    }

    if (typeof y === 'number') lastY = y
    if (item.hasEOL) {
      text += '\n'
      origins.push(null)
    }
  }

  return text
}

/**
 * Extracts the document text together with the geometry needed to redact the
 * original pages in place. Runs fully inside the browser.
 */
export async function buildPdfTextLayout(buffer: ArrayBuffer): Promise<PdfTextLayout> {
  const pdfjs = await loadPdfjs()

  const task = pdfjs.getDocument({
    // pdf.js takes ownership of the buffer, so hand it a copy.
    data: new Uint8Array(buffer.slice(0)),
    useSystemFonts: true,
  })

  const document = await task.promise
  const pageCount = document.numPages

  const rawChunks: string[] = []
  const origins: Array<PdfTextOrigin | null> = []
  const items: PdfTextItemMetrics[][] = []

  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()

      if (pageNumber > 1) {
        rawChunks.push('\n\n')
        origins.push(null, null)
      }

      const metrics: PdfTextItemMetrics[] = []
      rawChunks.push(extractPage(content.items as unknown[], pageNumber, metrics, origins))
      items.push(metrics)
      page.cleanup()
    }
  } finally {
    await task.destroy()
  }

  const raw = rawChunks.join('')
  const mapped = normalizeMapped(raw)
  const text = normalizeWhitespace(raw)

  // Safety net: if the normalization ever diverges, keep the editor text
  // canonical and drop the offset map (redaction falls back to value search).
  const aligned = mapped.text === text && mapped.rawIndex.length === mapped.text.length

  return {
    text,
    pages: pageCount,
    raw,
    origins,
    rawIndex: aligned ? mapped.rawIndex : [],
    items,
  }
}

export interface PdfResult {
  text: string
  pages: number
}

export async function pdfToText(buffer: ArrayBuffer): Promise<PdfResult> {
  const layout = await buildPdfTextLayout(buffer)
  return { text: layout.text, pages: layout.pages }
}
