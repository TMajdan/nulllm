import { buildDocxFromImages } from './docxPages'
import { renderRedactedPages } from './pdfRender'
import type { ManualRedaction, RedactionEdit } from './types'

/**
 * Word export for PDF sources: every page is rendered (with the redactions
 * applied) and embedded 1:1, so the document looks exactly like the PDF.
 */

const RENDER_SCALE = 1.8
const JPEG_QUALITY = 0.88

export interface DocxFromPdfResult {
  bytes: Uint8Array
  applied: number
  skipped: number
}

export async function buildDocxFromPdf(
  source: ArrayBuffer,
  edits: RedactionEdit[],
  manual: ManualRedaction[] = [],
): Promise<DocxFromPdfResult> {
  const rendered = await renderRedactedPages(source, edits, manual, {
    scale: RENDER_SCALE,
    mime: 'image/jpeg',
    quality: JPEG_QUALITY,
  })

  return {
    bytes: buildDocxFromImages(rendered.pages),
    applied: rendered.applied,
    skipped: rendered.skipped,
  }
}
