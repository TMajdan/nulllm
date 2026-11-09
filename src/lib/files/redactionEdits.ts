import type { Segment, TokenRecord } from '@/anonymizer/types'
import type { RedactionEdit } from './types'

/**
 * Turns the active token segments into redaction spans of the source document.
 * The original value is kept so the span can be re-located even when the
 * offsets no longer match (e.g. the user edited the imported text).
 */
export function buildRedactionEdits(
  segments: Segment[],
  records: TokenRecord[],
): RedactionEdit[] {
  const byId = new Map(records.map((record) => [record.id, record]))

  return segments.flatMap((segment) => {
    if (segment.kind !== 'token') return []
    if (segment.start === undefined || segment.end === undefined) return []

    const record = segment.recordId ? byId.get(segment.recordId) : undefined
    return [
      {
        start: segment.start,
        end: segment.end,
        token: segment.text,
        value: record?.originalValue,
      },
    ]
  })
}
