import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb } from 'pdf-lib'

export interface PdfExportInput {
  text: string
  title: string
  subtitle?: string
  footer?: string
  fontBytes: ArrayBuffer
}

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 52
const BODY_SIZE = 10.5
const LINE_HEIGHT = 16.5
const TITLE_SIZE = 18
const META_SIZE = 8.5

const INK = rgb(0.12, 0.12, 0.14)
const MUTED = rgb(0.44, 0.44, 0.47)
const HAIRLINE = rgb(0.85, 0.85, 0.87)

/** Removes control characters that cannot be drawn. */
function normalize(value: string): string {
  return value.replace(/\t/g, '    ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
}

function wrapLine(
  value: string,
  font: PDFFontLike,
  size: number,
  maxWidth: number,
): string[] {
  const lines: string[] = []
  const words = value.split(' ')
  let current = ''

  const widthOf = (text: string) => {
    try {
      return font.widthOfTextAtSize(text, size)
    } catch {
      return text.length * size * 0.5
    }
  }

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word

    if (widthOf(candidate) <= maxWidth) {
      current = candidate
      continue
    }

    if (current) lines.push(current)

    if (widthOf(word) > maxWidth) {
      let chunk = ''
      for (const char of word) {
        if (widthOf(chunk + char) > maxWidth && chunk) {
          lines.push(chunk)
          chunk = char
        } else {
          chunk += char
        }
      }
      current = chunk
    } else {
      current = word
    }
  }

  if (current) lines.push(current)
  return lines
}

interface PDFFontLike {
  widthOfTextAtSize: (text: string, size: number) => number
}

export async function buildPdfDocument({
  text,
  title,
  subtitle,
  footer = 'NullLM',
  fontBytes,
}: PdfExportInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)

  const font = await pdf.embedFont(fontBytes, { subset: true })
  const maxWidth = PAGE_WIDTH - MARGIN * 2

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let cursorY = PAGE_HEIGHT - MARGIN
  let pageNumber = 1

  function drawFooter() {
    const label = String(pageNumber)
    const labelWidth = font.widthOfTextAtSize(label, 8)
    page.drawText(label, {
      x: (PAGE_WIDTH - labelWidth) / 2,
      y: MARGIN / 2,
      size: 8,
      font,
      color: MUTED,
    })
    page.drawText(footer, {
      x: MARGIN,
      y: MARGIN / 2,
      size: 7,
      font,
      color: rgb(0.68, 0.68, 0.71),
    })
  }

  // Header
  page.drawText(normalize(title), {
    x: MARGIN,
    y: cursorY - TITLE_SIZE,
    size: TITLE_SIZE,
    font,
    color: INK,
  })
  cursorY -= TITLE_SIZE + 10

  if (subtitle) {
    page.drawText(normalize(subtitle), {
      x: MARGIN,
      y: cursorY - META_SIZE,
      size: META_SIZE,
      font,
      color: MUTED,
    })
    cursorY -= META_SIZE + 8
  }

  page.drawLine({
    start: { x: MARGIN, y: cursorY },
    end: { x: PAGE_WIDTH - MARGIN, y: cursorY },
    thickness: 0.7,
    color: HAIRLINE,
  })
  cursorY -= 20

  // Body
  for (const paragraph of normalize(text).split('\n')) {
    if (!paragraph.trim()) {
      cursorY -= LINE_HEIGHT * 0.6
      continue
    }

    for (const line of wrapLine(paragraph, font, BODY_SIZE, maxWidth)) {
      if (cursorY - LINE_HEIGHT < MARGIN + 26) {
        drawFooter()
        page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
        pageNumber += 1
        cursorY = PAGE_HEIGHT - MARGIN
      }

      page.drawText(line, {
        x: MARGIN,
        y: cursorY - BODY_SIZE,
        size: BODY_SIZE,
        font,
        color: INK,
      })
      cursorY -= LINE_HEIGHT
    }
  }

  drawFooter()

  return pdf.save()
}
