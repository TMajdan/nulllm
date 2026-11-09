import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { buildPdfTextLayout } from './pdf'
import { planRedactions } from './pdfGeometry'
import { decryptPdfInPlace, PdfEncryptionError } from './pdfDecrypt'
import type { ManualRedaction, RedactionEdit } from './types'

/**
 * Redaction "in place": the original page content stream is left untouched and
 * the sensitive spans are painted over with opaque boxes (plus a white token
 * label). Layout, tables, images and fonts stay exactly as in the source file.
 *
 * Encrypted sources are decrypted in memory first (AES-256 / V5), so the saved
 * file is a regular PDF with selectable text. Only unsupported encryption
 * schemes make the caller fall back to `flattenPdf`.
 */

const INK = rgb(0.04, 0.04, 0.06)
const LABEL = rgb(1, 1, 1)
const MAX_LABEL_SIZE = 9.5
const MIN_LABEL_SIZE = 4

export class PdfRedactionError extends Error {
  readonly reason: 'encrypted' | 'no-spans' | 'unsupported'

  constructor(reason: 'encrypted' | 'no-spans' | 'unsupported') {
    super(reason)
    this.name = 'PdfRedactionError'
    this.reason = reason
  }
}

export interface RedactPdfResult {
  bytes: Uint8Array
  applied: number
  skipped: number
}

export async function redactPdf(
  source: ArrayBuffer,
  edits: RedactionEdit[],
  manual: ManualRedaction[] = [],
): Promise<RedactPdfResult> {
  if (edits.length === 0 && manual.length === 0) {
    return { bytes: new Uint8Array(source.slice(0)), applied: 0, skipped: 0 }
  }

  const layout = edits.length > 0 ? await buildPdfTextLayout(source) : null

  const pdf = await PDFDocument.load(source.slice(0), {
    ignoreEncryption: true,
    updateMetadata: false,
    throwOnInvalidObject: false,
  })

  // Encrypted documents (e.g. e-signature platforms) are decrypted in memory
  // first, so the export stays a normal vector PDF instead of becoming an
  // image. Only unsupported schemes fall back to rasterizing.
  if (pdf.isEncrypted) {
    try {
      await decryptPdfInPlace(pdf)
    } catch (error) {
      throw new PdfRedactionError(
        error instanceof PdfEncryptionError ? 'encrypted' : 'unsupported',
      )
    }
  }

  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const plan = planRedactions(layout, edits, (text) => font.widthOfTextAtSize(text, 1), manual)

  if (plan.applied === 0) throw new PdfRedactionError('no-spans')

  const pages = pdf.getPages()

  for (const rect of plan.rects) {
    const page = pages[rect.page - 1]
    if (!page) continue

    page.drawRectangle({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      color: INK,
    })
  }

  // Token labels go on top of the boxes, fitted to the covered width.
  for (const label of plan.labels) {
    const page = pages[label.page - 1]
    if (!page) continue

    const available = Math.max(label.availableWidth - 1.4, 1)
    let size = Math.min(label.itemHeight * 0.85, MAX_LABEL_SIZE)

    while (size > MIN_LABEL_SIZE && font.widthOfTextAtSize(label.token, size) > available) {
      size -= 0.2
    }

    if (size < MIN_LABEL_SIZE) continue
    if (font.widthOfTextAtSize(label.token, size) > available + 0.3) continue

    page.drawText(label.token, {
      x: label.x + 0.5,
      y: label.baseline - size * 0.2,
      size,
      font,
      color: LABEL,
    })
  }

  return {
    bytes: await pdf.save({ useObjectStreams: false }),
    applied: plan.applied,
    skipped: plan.skipped,
  }
}
