import { countWords, truncateToWords } from '@/lib/text'
import { buildCustomRules } from './customRules'
import { RULES } from './rules'
import { ruleIsVisible } from './rules/regions'
import type {
  AnonymizeResult,
  CustomEntry,
  DetectionRule,
  LockedFinding,
  RawMatch,
  Segment,
  TokenRecord,
  TokenFormat,
} from './types'

interface Candidate extends RawMatch {
  rule: DetectionRule
}

function uid(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  }
}

/** 1 -> A, 26 -> Z, 27 -> AA. Used by rules with `tokenFormat: 'alpha'`. */
export function alphaIndex(value: number): string {
  let n = Math.max(1, Math.floor(value))
  let out = ''

  while (n > 0) {
    const remainder = (n - 1) % 26
    out = String.fromCharCode(65 + remainder) + out
    n = Math.floor((n - 1) / 26)
  }

  return out
}

export function formatToken(
  rule: Pick<DetectionRule, 'tokenLabel' | 'tokenFormat'>,
  index: number,
  format?: TokenFormat,
): string {
  const resolvedFormat = format ?? rule.tokenFormat ?? 'numeric'
  const suffix = resolvedFormat === 'alpha' ? alphaIndex(index) : String(index)
  return `[${rule.tokenLabel}_${suffix}]`
}

/** Same entity (label + value) always gets the same token inside a session. */
function reuseKey(tokenLabel: string, value: string): string {
  return `${tokenLabel}::${value.trim().toLowerCase()}`
}

/**
 * Resolves overlapping candidates: earlier start wins, then higher rule
 * priority, then the longer match.
 */
function resolveOverlaps(candidates: Candidate[]): Candidate[] {
  const sorted = [...candidates].sort(
    (a, b) =>
      a.start - b.start ||
      b.rule.priority - a.rule.priority ||
      b.end - b.start - (a.end - a.start),
  )

  const accepted: Candidate[] = []
  let lastEnd = -1

  for (const candidate of sorted) {
    if (candidate.start < lastEnd) continue
    accepted.push(candidate)
    lastEnd = candidate.end
  }

  return accepted
}

export interface PreviewRule {
  rule: DetectionRule
  /** Why the rule is not applied: licence tier or the language filter. */
  reason: 'tier' | 'region'
}

export interface AnonymizeInput {
  text: string
  rules: DetectionRule[]
  existingRecords?: TokenRecord[]
  /** Free tier limit; `undefined` means unlimited. */
  wordLimit?: number
  /** Rules that are skipped - only counted, never masked. */
  previewRules?: PreviewRule[]
}

function collectCandidates(text: string, rules: DetectionRule[]): Candidate[] {
  const candidates: Candidate[] = []

  for (const rule of rules) {
    let matches: RawMatch[] = []
    try {
      matches = rule.detect(text)
    } catch {
      // A single faulty rule must never break the whole anonymization run.
      matches = []
    }

    for (const match of matches) {
      if (match.end <= match.start || match.start < 0 || match.end > text.length) continue
      candidates.push({ ...match, rule })
    }
  }

  return candidates
}

function overlaps(start: number, end: number, spans: Candidate[]): boolean {
  return spans.some((span) => start < span.end && end > span.start)
}

/**
 * Detects what the locked (Pro) rules would have masked, without touching the
 * output. Used to warn free users that sensitive data is still visible.
 */
function findLockedMatches(
  text: string,
  previewRules: PreviewRule[],
  masked: Candidate[],
): LockedFinding[] {
  if (previewRules.length === 0) return []

  const reasons = new Map(previewRules.map((entry) => [entry.rule.id, entry.reason]))
  const previewMatches = resolveOverlaps(
    collectCandidates(
      text,
      previewRules.map((entry) => entry.rule),
    ),
  )
  const findings = new Map<string, LockedFinding>()

  for (const match of previewMatches) {
    if (overlaps(match.start, match.end, masked)) continue

    const existing = findings.get(match.rule.id)
    if (existing) {
      existing.count += 1
    } else {
      findings.set(match.rule.id, {
        ruleId: match.rule.id,
        ruleLabel: match.rule.label,
        tokenLabel: match.rule.tokenLabel,
        category: match.rule.category,
        count: 1,
        reason: reasons.get(match.rule.id) ?? 'tier',
      })
    }
  }

  return [...findings.values()].sort((a, b) => b.count - a.count)
}

export function anonymizeText({
  text,
  rules,
  existingRecords = [],
  wordLimit,
  previewRules = [],
}: AnonymizeInput): AnonymizeResult {
  const totalWords = countWords(text)

  let source = text
  let truncated = false
  let processedWords = totalWords

  if (wordLimit !== undefined && totalWords > wordLimit) {
    const sliced = truncateToWords(text, wordLimit)
    source = sliced.text
    truncated = sliced.truncated
    processedWords = sliced.keptWords
  }

  const accepted = resolveOverlaps(collectCandidates(source, rules))
  const lockedFindings = findLockedMatches(source, previewRules, accepted)

  const records = [...existingRecords]
  const byKey = new Map<string, TokenRecord>()
  const nextIndex = new Map<string, number>()

  for (const record of records) {
    byKey.set(reuseKey(record.tokenLabel, record.originalValue), record)
    nextIndex.set(record.tokenLabel, Math.max(nextIndex.get(record.tokenLabel) ?? 0, record.index))
  }

  const segments: Segment[] = []
  let cursor = 0
  let newTokens = 0

  for (const candidate of accepted) {
    const label = candidate.rule.tokenLabel
    const key = reuseKey(label, candidate.value)
    let record = byKey.get(key)

    if (!record) {
      const index = (nextIndex.get(label) ?? 0) + 1
      nextIndex.set(label, index)
      record = {
        id: uid(),
        token: formatToken(candidate.rule, index),
        tokenLabel: label,
        index,
        ruleId: candidate.rule.id,
        ruleLabel: candidate.rule.label,
        category: candidate.rule.category,
        originalValue: candidate.value,
        createdAt: Date.now(),
      }
      records.push(record)
      byKey.set(key, record)
      newTokens += 1
    }

    if (candidate.start > cursor) {
      segments.push({ kind: 'text', text: source.slice(cursor, candidate.start) })
    }

    segments.push({
      kind: 'token',
      text: record.token,
      recordId: record.id,
      category: record.category,
      start: candidate.start,
      end: candidate.end,
    })

    cursor = candidate.end
  }

  if (cursor < source.length) {
    segments.push({ kind: 'text', text: source.slice(cursor) })
  }

  return {
    text: segments.map((segment) => segment.text).join(''),
    segments,
    records,
    stats: {
      matches: accepted.length,
      newTokens,
      totalWords,
      processedWords,
      truncated,
      lockedFindings,
    },
  }
}

/**
 * Builds the effective rule list for a run: user toggles + licence gating +
 * custom phrases (Pro only).
 */
export function resolveActiveRules({
  enabledRuleIds,
  customEntries,
  isPro,
  locale,
  showAllRegions = false,
}: {
  enabledRuleIds: string[]
  customEntries: CustomEntry[]
  isPro: boolean
  locale: string
  showAllRegions?: boolean
}): DetectionRule[] {
  const enabled = new Set(enabledRuleIds)
  const custom = isPro ? buildCustomRules(customEntries) : []
  const builtin = RULES.filter(
    (rule) =>
      enabled.has(rule.id) &&
      (isPro || rule.tier === 'free') &&
      ruleIsVisible(rule, locale, showAllRegions),
  )

  return [...custom, ...builtin]
}
