import { PDFDocument, StandardFonts } from 'pdf-lib'
import { buildPdfTextLayout, loadPdfjs } from './pdf'
import { planRedactions, type RedactionPlan } from './pdfGeometry'
import type { ManualRedaction, RedactionEdit } from './types'

/**
 * Renders every page with the redaction boxes painted onto the canvas.
 * Shared by the PDF rasterizer and the Word exporter.
 */

const INK = '#08080c'
const LABEL = '#ffffff'
const MAX_LABEL_PX = 15
const MIN_LABEL_PX = 5

export interface RenderedPage {
  /** Page size in points (scale 1). */
  width: number
  height: number
  bytes: Uint8Array
  ext: 'jpg' | 'png'
}

export interface RenderPagesResult {
  pages: RenderedPage[]
  applied: number
  skipped: number
}

export interface RenderOptions {
  scale: number
  mime: 'image/jpeg' | 'image/png'
  quality?: number
}

async function canvasToBytes(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, quality))
  if (!blob) throw new Error('Canvas export failed')
  return new Uint8Array(await blob.arrayBuffer())
}

export async function renderRedactedPages(
  source: ArrayBuffer,
  edits: RedactionEdit[],
  manual: ManualRedaction[],
  options: RenderOptions,
): Promise<RenderPagesResult> {
  const layout = edits.length > 0 ? await buildPdfTextLayout(source) : null

  const pdfjs = await loadPdfjs()
  const task = pdfjs.getDocument({ data: new Uint8Array(source.slice(0)) })
  const document = await task.promise

  try {
    let plan: RedactionPlan = { rects: [], labels: [], applied: 0, skipped: 0 }

    if (layout || manual.length > 0) {
      const metrics = await PDFDocument.create()
      const font = await metrics.embedFont(StandardFonts.Helvetica)
      plan = planRedactions(layout, edits, (text) => font.widthOfTextAtSize(text, 1), manual)
    }

    const pages: RenderedPage[] = []

    for (let index = 1; index <= document.numPages; index += 1) {
      const page = await document.getPage(index)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: options.scale })

      const canvas = window.document.createElement('canvas')
      canvas.width = Math.max(1, Math.ceil(viewport.width))
      canvas.height = Math.max(1, Math.ceil(viewport.height))

      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas 2D is unavailable')

      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)

      await page.render({ canvasContext: context, viewport }).promise

      for (const rect of plan.rects) {
        if (rect.page !== index) continue

        const [x1, y1] = viewport.convertToViewportPoint(rect.x, rect.y)
        const [x2, y2] = viewport.convertToViewportPoint(rect.x + rect.width, rect.y + rect.height)

        context.fillStyle = INK
        context.fillRect(
          Math.min(x1, x2),
          Math.min(y1, y2),
          Math.abs(x2 - x1),
          Math.abs(y2 - y1),
        )
      }

      for (const label of plan.labels) {
        if (label.page !== index) continue

        const [x, y] = viewport.convertToViewportPoint(label.x, label.baseline)
        const available = Math.max(label.availableWidth * options.scale - 2, 1)

        let size = Math.min(label.itemHeight * 0.85 * options.scale, MAX_LABEL_PX)
        context.font = `600 ${size}px Helvetica, Arial, sans-serif`

        while (size > MIN_LABEL_PX && context.measureText(label.token).width > available) {
          size -= 0.5
          context.font = `600 ${size}px Helvetica, Arial, sans-serif`
        }

        if (size < MIN_LABEL_PX) continue
        if (context.measureText(label.token).width > available + 1) continue

        context.fillStyle = LABEL
        context.textBaseline = 'alphabetic'
        context.fillText(label.token, x + 1, y - size * 0.2)
      }

      const bytes = await canvasToBytes(canvas, options.mime, options.quality)
      pages.push({
        width: base.width,
        height: base.height,
        bytes,
        ext: options.mime === 'image/png' ? 'png' : 'jpg',
      })

      page.cleanup()
      canvas.width = 0
      canvas.height = 0
    }

    return { pages, applied: plan.applied, skipped: plan.skipped }
  } finally {
    await task.destroy()
  }
}
