import type { DetectionRule, RuleRegion } from '../types'

/** Region of a rule; defaults to the language-neutral pack. */
export function ruleRegion(rule: DetectionRule): RuleRegion {
  return rule.region ?? 'intl'
}

/**
 * Region-aware visibility: language-specific rules are only offered for their
 * own language, unless the user explicitly asks to see every region.
 */
export function isRegionVisible(
  region: RuleRegion,
  locale: string,
  showAllRegions: boolean,
): boolean {
  return showAllRegions || region === 'intl' || region === locale
}

export function ruleIsVisible(
  rule: DetectionRule,
  locale: string,
  showAllRegions: boolean,
): boolean {
  return isRegionVisible(ruleRegion(rule), locale, showAllRegions)
}
