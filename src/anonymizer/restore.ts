import { looksLikeToken, normalizeTokenKey } from '@/lib/tokens'
import type { RestoreReport, RestoreResult, TokenRecord } from './types'

const BRACKET_GROUP = /[\[({【<]\s*([^\[\]{}()【】<>]{1,80}?)\s*[\])}】>]/g

/** Builds a tolerant regex that finds a token even if the model mangled spacing. */
function buildFuzzyPattern(token: string): RegExp {
  const inner = token.replace(/^\[/, '').replace(/\]$/, '')
  const match = /^([A-Z0-9_]+?)[_-]([0-9A-Z]+)$/.exec(inner)

  if (!match) return new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')

  const [, label, suffix] = match
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  return new RegExp(
    `(?<![\\p{L}\\p{N}_])${escapedLabel}\\s*[-_ ]?\\s*${escapedSuffix}(?![\\p{L}\\p{N}_])`,
    'giu',
  )
}

/**
 * Re-hydrates tokens using the local session dictionary.
 *
 * Pass 1 handles any bracket/parenthesis style wrapper and normalises spacing,
 * so `[PESEL_1]`, `[PESEL 1]`, `【PESEL-1】` and `(pesel_1)` all resolve.
 * Pass 2 catches tokens the model stripped of brackets entirely.
 */
export function restoreText(text: string, records: TokenRecord[]): RestoreResult {
  if (records.length === 0) {
    return {
      text,
      report: {
        restoredCount: 0,
        fuzzyCount: 0,
        missingTokens: [],
        unknownTokens: [],
        noRecords: true,
      },
    }
  }

  const byKey = new Map<string, TokenRecord>()
  for (const record of records) {
    byKey.set(normalizeTokenKey(record.token), record)
  }

  const restoredIds = new Set<string>()
  const unknownTokens: string[] = []
  let restoredCount = 0
  let fuzzyCount = 0

  let output = text.replace(BRACKET_GROUP, (full: string, inner: string) => {
    const record = byKey.get(normalizeTokenKey(inner))

    if (record) {
      restoredCount += 1
      restoredIds.add(record.id)
      if (full.toUpperCase() !== record.token.toUpperCase()) fuzzyCount += 1
      return record.originalValue
    }

    if (looksLikeToken(inner) && !unknownTokens.includes(full.trim())) {
      unknownTokens.push(full.trim())
    }

    return full
  })

  // Pass 2: tokens completely stripped of brackets by the model.
  for (const record of records) {
    if (restoredIds.has(record.id)) continue

    const pattern = buildFuzzyPattern(record.token)
    let occurrences = 0

    output = output.replace(pattern, () => {
      occurrences += 1
      return record.originalValue
    })

    if (occurrences > 0) {
      restoredIds.add(record.id)
      restoredCount += occurrences
      fuzzyCount += occurrences
    }
  }

  const missingTokens = records
    .filter((record) => !restoredIds.has(record.id))
    .map((record) => record.token)

  const report: RestoreReport = {
    restoredCount,
    fuzzyCount,
    missingTokens,
    unknownTokens,
    noRecords: false,
  }

  return { text: output, report }
}
