export type RuleCategory = 'identity' | 'technical' | 'contact' | 'finance' | 'custom'

export type RuleTier = 'free' | 'pro'

/** Region a rule belongs to. `intl` rules are always available. */
export type RuleRegion = 'pl' | 'de' | 'en' | 'intl'

export type TokenFormat = 'numeric' | 'alpha'

export interface RawMatch {
  start: number
  end: number
  value: string
}

export interface DetectionRule {
  /** Stable identifier, persisted in the settings. */
  id: string
  /** Human readable name shown in the sidebar. */
  label: string
  /** Prefix used when building tokens, e.g. `PESEL` -> `[PESEL_1]`. */
  tokenLabel: string
  description: string
  category: RuleCategory
  tier: RuleTier
  /** Shown/applied only for this language (defaults to `intl`). */
  region?: RuleRegion
  /** Higher priority wins when two rules match overlapping ranges. */
  priority: number
  defaultEnabled: boolean
  /** `alpha` produces `[KWOTA_A]`, `[KWOTA_B]`, ... */
  tokenFormat?: TokenFormat
  detect: (text: string) => RawMatch[]
}

export interface CustomEntry {
  id: string
  phrase: string
  tokenLabel: string
  createdAt: number
}

export interface TokenRecord {
  id: string
  /** Full token including brackets, e.g. `[EMAIL_1]`. */
  token: string
  tokenLabel: string
  index: number
  ruleId: string
  ruleLabel: string
  category: RuleCategory
  originalValue: string
  createdAt: number
}

export interface Segment {
  kind: 'text' | 'token'
  text: string
  recordId?: string
  category?: RuleCategory
  /** Source range in the original text (token segments only). */
  start?: number
  end?: number
}

export interface LockedFinding {
  ruleId: string
  ruleLabel: string
  tokenLabel: string
  category: RuleCategory
  count: number
  /** `tier` = needs Pro, `region` = hidden by the language filter. */
  reason: 'tier' | 'region'
}

export interface AnonymizeStats {
  matches: number
  newTokens: number
  totalWords: number
  processedWords: number
  truncated: boolean
  /** Matches that were detected but skipped because the rule requires Pro. */
  lockedFindings: LockedFinding[]
}

export interface AnonymizeResult {
  text: string
  segments: Segment[]
  records: TokenRecord[]
  stats: AnonymizeStats
}

export interface RestoreReport {
  restoredCount: number
  fuzzyCount: number
  /** Tokens present in the session dictionary but absent from the AI answer. */
  missingTokens: string[]
  /** Token-looking strings found in the answer that are not in the dictionary. */
  unknownTokens: string[]
  /** True when the session has no mappings at all. */
  noRecords: boolean
}

export interface RestoreResult {
  text: string
  report: RestoreReport
}
