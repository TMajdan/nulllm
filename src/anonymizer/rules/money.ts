import type { DetectionRule } from '../types'
import { collect } from './helpers'

/**
 * Currency amounts in both conventions:
 *   15 000 PLN | 2 500,00 zł | 1.500,00 € | $500.00 | £1,200 | EUR 2.000,50
 */
const NUMBER = String.raw`\d{1,3}(?:[., \u00A0]\d{3})*(?:[.,]\d{1,2})?`

const MONEY_PATTERN = new RegExp(
  String.raw`(?<![\p{L}\p{N}])(?:` +
    String.raw`(?:USD|EUR|PLN|GBP|CHF|JPY)\s?${NUMBER}` +
    String.raw`|[$€£]\s?${NUMBER}` +
    String.raw`|${NUMBER}\s?(?:PLN|zł|EUR|USD|GBP|CHF|€|\$|£)` +
    String.raw`)(?![\p{L}\p{N}])`,
  'gdu',
)

export const moneyRule: DetectionRule = {
  id: 'money',
  label: 'Kwoty walutowe',
  tokenLabel: 'KWOTA',
  description: 'Kwoty typu 15 000 PLN, 1.500,00 €, $500.00.',
  category: 'finance',
  tier: 'pro',
  priority: 50,
  defaultEnabled: true,
  tokenFormat: 'alpha',
  detect: (text) => collect(text, MONEY_PATTERN, { trimTrailingJunk: true }),
}
