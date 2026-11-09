import { escapeRegExp, collect } from './rules/helpers'
import type { CustomEntry, DetectionRule } from './types'

export function sanitizeTokenLabel(input: string): string {
  const cleaned = input
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24)

  return cleaned || 'KLIENT'
}

/**
 * Turns the user's custom phrases into first-class detection rules so they
 * participate in overlap resolution exactly like the built-in rules.
 */
export function buildCustomRules(entries: CustomEntry[]): DetectionRule[] {
  return entries
    .filter((entry) => entry.phrase.trim().length > 0)
    .map((entry) => {
      const phrase = entry.phrase.trim()
      const pattern = new RegExp(
        `(?<![\\p{L}\\p{N}])${escapeRegExp(phrase)}(?![\\p{L}\\p{N}])`,
        'gdui',
      )

      return {
        id: `custom:${entry.id}`,
        label: entry.tokenLabel || 'KLIENT',
        tokenLabel: sanitizeTokenLabel(entry.tokenLabel),
        description: `Własna fraza: „${phrase}”`,
        category: 'custom' as const,
        tier: 'pro' as const,
        priority: 100,
        defaultEnabled: true,
        detect: (text: string) => collect(text, pattern),
      }
    })
}
