import type { PdfTextItemMetrics, PdfTextLayout } from './pdf'
import type { ManualRedaction, RedactionEdit } from './types'

/**
 * Turns token offsets into concrete rectangles on the source PDF pages.
 * Shared by the vector redactor (pdf-lib) and the rasterizer (canvas), so both
 * export modes highlight exactly the same spans.
 */

export interface RedactionRect {
  page: number
  x: number
  y: number
  width: number
  height: number
}

export interface RedactionLabel {
  page: number
  token: string
  /** Left edge of the redacted span (PDF user space). */
  x: number
  /** Text baseline in PDF user space. */
  baseline: number
  /** Width available for the label on this page. */
  availableWidth: number
  itemHeight: number
}

export interface RedactionPlan {
  rects: RedactionRect[]
  labels: RedactionLabel[]
  /** Number of spans that were located. */
  applied: number
  /** Spans that could not be mapped onto the page. */
  skipped: number
}

/** Width of `text` at 1pt. Helvetica is a close proxy for common document fonts. */
export type MeasureText = (text: string) => number

interface Run {
  page: number
  itemIndex: number
  charStart: number
  charEnd: number
}

/** Characters a standard font cannot measure are approximated by `x`. */
export function sanitizeForMetrics(value: string): string {
  return value.replace(/[^\x20-\x7e]/g, 'x')
}

function locateRuns(layout: PdfTextLayout, rawStart: number, rawEnd: number): Run[] {
  const runs = new Map<string, Run>()

  for (let index = rawStart; index < rawEnd; index += 1) {
    const origin = layout.origins[index]
    if (!origin) continue

    const item = layout.items[origin.page - 1]?.[origin.item]
    if (!item || item.rotated || item.str.length === 0) continue

    const key = `${origin.page}:${origin.item}`
    const existing = runs.get(key)

    if (existing) {
      if (origin.charIndex < existing.charStart) existing.charStart = origin.charIndex
      if (origin.charIndex + 1 > existing.charEnd) existing.charEnd = origin.charIndex + 1
    } else {
      runs.set(key, {
        page: origin.page,
        itemIndex: origin.item,
        charStart: origin.charIndex,
        charEnd: origin.charIndex + 1,
      })
    }
  }

  return [...runs.values()]
}

function findOccurrences(text: string, value: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = []
  if (!value) return ranges

  let from = 0
  while (from <= text.length - value.length) {
    const index = text.indexOf(value, from)
    if (index === -1) break
    ranges.push({ start: index, end: index + value.length })
    from = index + value.length
  }

  return ranges
}

function widthOf(measure: MeasureText, value: string): number {
  try {
    return measure(sanitizeForMetrics(value))
  } catch {
    return 0
  }
}

function charRatio(
  measure: MeasureText,
  item: PdfTextItemMetrics,
  charIndex: number,
  totalCache: WeakMap<PdfTextItemMetrics, number>,
): number {
  const length = item.str.length || 1
  const index = Math.min(Math.max(charIndex, 0), length)
  const fallback = index / length

  let total = totalCache.get(item)
  if (total === undefined) {
    total = widthOf(measure, item.str)
    totalCache.set(item, total)
  }

  if (!(total > 0)) return fallback

  const prefix = widthOf(measure, item.str.slice(0, index))
  return Math.min(1, Math.max(0, prefix / total))
}

function locateForRange(
  layout: PdfTextLayout,
  start: number,
  end: number,
): Run[] | null {
  if (layout.rawIndex.length !== layout.text.length) return null
  if (start < 0 || end > layout.text.length || end <= start) return null

  const runs = locateRuns(layout, layout.rawIndex[start], layout.rawIndex[end - 1] + 1)
  return runs.length > 0 ? runs : null
}

export function planRedactions(
  layout: PdfTextLayout | null,
  edits: RedactionEdit[],
  measure: MeasureText,
  manual: ManualRedaction[] = [],
): RedactionPlan {
  const rects: RedactionRect[] = manual.map((rect) => ({
    page: rect.page,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  }))
  const labels: RedactionLabel[] = []
  const totalCache = new WeakMap<PdfTextItemMetrics, number>()

  let applied = manual.length
  let skipped = 0

  if (!layout) return { rects, labels, applied, skipped }

  for (const edit of edits) {
    const targets: Run[][] = []
    const matchesValue = !edit.value || layout.text.slice(edit.start, edit.end) === edit.value
    const byOffset = matchesValue ? locateForRange(layout, edit.start, edit.end) : null

    if (byOffset) targets.push(byOffset)

    // Offsets drift as soon as the user edits the text - fall back to search.
    if (targets.length === 0 && edit.value) {
      for (const range of findOccurrences(layout.text, edit.value)) {
        const runs = locateForRange(layout, range.start, range.end)
        if (runs) targets.push(runs)
      }
    }

    if (targets.length === 0) {
      skipped += 1
      continue
    }

    for (const runs of targets) {
      const first = runs[0]
      if (!first) continue

      let labelWidth = 0

      for (const run of runs) {
        const item = layout.items[run.page - 1][run.itemIndex]
        const length = item.str.length || 1
        const start = charRatio(measure, item, run.charStart, totalCache)
        const end = Math.max(charRatio(measure, item, run.charEnd, totalCache), start + 0.5 / length)
        const x0 = item.x + item.width * start
        const x1 = item.x + item.width * end

        const padX = Math.max(1.1, item.height * 0.28)
        const padY = Math.max(0.7, item.height * 0.12)

        rects.push({
          page: run.page,
          x: x0 - padX,
          y: item.y - item.height * 0.26 - padY,
          width: Math.max(x1 - x0, 0.8) + padX * 2,
          height: item.height * 1.02 + padY * 2,
        })

        if (run.page === first.page) labelWidth += x1 - x0
      }

      const firstItem = layout.items[first.page - 1][first.itemIndex]
      const firstStart = charRatio(measure, firstItem, first.charStart, totalCache)

      labels.push({
        page: first.page,
        token: edit.token,
        x: firstItem.x + firstItem.width * firstStart,
        baseline: firstItem.y,
        availableWidth: labelWidth,
        itemHeight: firstItem.height,
      })

      applied += 1
    }
  }

  return { rects, labels, applied, skipped }
}
