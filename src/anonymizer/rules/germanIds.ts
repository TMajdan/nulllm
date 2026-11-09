import type { DetectionRule } from '../types'
import { collect } from './helpers'

/**
 * German identifiers with checksums.
 *
 * USt-IdNr: DE + 9 digits, ISO 7064 MOD 11,10 over the first 8 digits.
 * Steuer-ID: 11 digits, the same MOD 11,10 procedure over the first 10 digits.
 */

const UST_ID_PATTERN = /(?<![\p{L}\p{N}])DE[\s]?\d{3}[\s]?\d{3}[\s]?\d{3}(?![\p{L}\p{N}])/gdu
const TAX_ID_PATTERN = /(?<![\p{L}\p{N}])\d{2}[\s]?\d{3}[\s]?\d{3}[\s]?\d{3}(?![\p{L}\p{N}])/gdu

export function isValidUstId(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 9) return false

  const numbers = digits.split('').map(Number)
  let product = 10

  for (let i = 0; i < 8; i += 1) {
    let sum = (numbers[i] + product) % 10
    if (sum === 0) sum = 10
    product = (2 * sum) % 11
  }

  let check = 11 - product
  if (check === 10) check = 0

  return check === numbers[8]
}

export function isValidGermanTaxId(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 11) return false
  if (digits[0] === '0') return false

  const numbers = digits.split('').map(Number)
  let product = 10

  for (let i = 0; i < 10; i += 1) {
    let sum = (numbers[i] + product) % 10
    if (sum === 0) sum = 10
    product = (2 * sum) % 11
  }

  let check = 11 - product
  if (check === 10) check = 0

  return check === numbers[10]
}

export const deUstIdRule: DetectionRule = {
  id: 'de-ust-id',
  label: 'USt-IdNr (DE)',
  tokenLabel: 'UST_ID',
  description: 'Niemiecki numer VAT UE (DE + 9 cyfr) z sumą kontrolną.',
  category: 'identity',
  tier: 'pro',
  region: 'de',
  priority: 83,
  defaultEnabled: true,
  detect: (text) => collect(text, UST_ID_PATTERN, { accept: isValidUstId }),
}

export const deTaxIdRule: DetectionRule = {
  id: 'de-tax-id',
  label: 'Steuer-ID (DE)',
  tokenLabel: 'STEUER_ID',
  description: 'Niemiecki identyfikator podatkowy (11 cyfr) z sumą kontrolną.',
  category: 'identity',
  tier: 'pro',
  region: 'de',
  priority: 81,
  defaultEnabled: true,
  detect: (text) => collect(text, TAX_ID_PATTERN, { accept: isValidGermanTaxId }),
}
