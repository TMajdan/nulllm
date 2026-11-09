import type { DetectionRule } from '../types'
import { collect } from './helpers'

const ID_CARD_PATTERN = /(?<![\p{L}\p{N}])[A-Z]{3}[\s-]?\d{6}(?![\p{L}\p{N}])/gdu

/** Three letters + six digits (e.g. `ABC123456`). Cheap false-positive guard. */
const CURRENCY_PREFIXES = new Set([
  'USD',
  'EUR',
  'PLN',
  'GBP',
  'CHF',
  'JPY',
  'VAT',
  'NIP',
  'PES',
  'REG',
  'KRS',
  'BDO',
  'REF',
])

export const idCardRule: DetectionRule = {
  id: 'id-card',
  label: 'Dowód osobisty',
  tokenLabel: 'DOWOD',
  description: 'Seria i numer dowodu osobistego (3 litery + 6 cyfr).',
  category: 'identity',
  tier: 'pro',
  region: 'pl',
  priority: 78,
  defaultEnabled: true,
  detect: (text) =>
    collect(text, ID_CARD_PATTERN, {
      accept: (value) => !CURRENCY_PREFIXES.has(value.slice(0, 3).toUpperCase()),
    }),
}
