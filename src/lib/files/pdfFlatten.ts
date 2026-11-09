import { PDFDocument } from 'pdf-lib'
import { renderRedactedPages } from './pdfRender'
import type { ManualRedaction, RedactionEdit } from './types'

/**
 * Rasterizes every page (with the redaction boxes painted onto the canvas) and
 * rebuilds the document from images. Used when the source structure cannot be
 * patched by pdf-lib, and optionally to drop the hidden text layer entirely.
 *
 * The visual result matches the source, but the original values can no longer
 * be copied or text-extracted from the exported file.
 */

const RENDER_SCALE = 1.6
const JPEG_QUALITY = 0.85

export interface FlattenPdfResult {
  bytes: Uint8Array
  applied: number
  skipped: number
}

export async function flattenPdf(
  source: ArrayBuffer,
  edits: RedactionEdit[],
  manual: ManualRedaction[] = [],
): Promise<FlattenPdfResult> {
  const rendered = await renderRedactedPages(source, edits, manual, {
    scale: RENDER_SCALE,
    mime: 'image/jpeg',
    quality: JPEG_QUALITY,
  })

  const output = await PDFDocument.create()

  for (const page of rendered.pages) {
    const image = await output.embedJpg(page.bytes)
    const target = output.addPage([page.width, page.height])
    target.drawImage(image, { x: 0, y: 0, width: page.width, height: page.height })
  }

  output.setProducer('NullLM · local sandbox')

  return {
    bytes: await output.save({ useObjectStreams: false }),
    applied: rendered.applied,
    skipped: rendered.skipped,
  }
}
