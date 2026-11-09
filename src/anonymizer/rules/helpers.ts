import type { RawMatch } from '../types'

export interface CollectOptions {
  /** Capture group to use as the match. Defaults to the whole match. */
  group?: number
  /** Extra validation for the captured value. */
  accept?: (value: string) => boolean
  /** Trim trailing punctuation (`.,;:)`) from the captured value. */
  trimTrailingJunk?: boolean
}

const TRAILING_JUNK = /[.,;:)\]}]+$/

/**
 * Runs a regex over the text and returns every accepted match with exact
 * offsets. Relies on the `d` flag (indices) when available and falls back to
 * `indexOf` for older engines.
 */
export function collect(text: string, pattern: RegExp, options: CollectOptions = {}): RawMatch[] {
  const group = options.group ?? 0
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
  const regex = new RegExp(pattern.source, flags)
  const matches: RawMatch[] = []

  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    if (match[0] === '') {
      regex.lastIndex += 1
      continue
    }

    const captured = match[group]
    if (captured === undefined) continue

    let start: number
    let end: number

    if (match.indices?.[group]) {
      start = match.indices[group][0]
      end = match.indices[group][1]
    } else {
      const offset = group === 0 ? 0 : match[0].indexOf(captured)
      start = match.index + Math.max(offset, 0)
      end = start + captured.length
    }

    let value = text.slice(start, end)

    if (options.trimTrailingJunk) {
      const trimmed = value.replace(TRAILING_JUNK, '')
      const removed = value.length - trimmed.length
      value = trimmed
      end -= removed
    }

    if (!value) continue
    if (options.accept && !options.accept(value)) continue

    matches.push({ start, end, value })
  }

  return matches
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
