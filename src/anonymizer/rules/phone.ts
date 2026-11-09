import { onlyDigits } from '../checksums'
import type { DetectionRule } from '../types'
import { collect } from './helpers'

/** International format: +48 …, 0049 …, +1 (555) 123-4567 … */
const INTERNATIONAL =
  /(?<![\p{L}\p{N}])(?:\+|00)\d{1,3}[\s.-]?(?:\(\d{1,4}\)[\s.-]?)?(?:\d{2,4}[\s.-]?){2,5}\d{2,4}(?![\p{L}\p{N}])/gdu

/** Polish / generic local grouping: 512 345 678, 123 456 789, 123456789. */
const LOCAL = /(?<![\p{L}\p{N}])(?:\d{3}[\s.-]\d{3}[\s.-]\d{3}|\d{9})(?![\p{L}\p{N}])/gdu

/** German national format: 030 12345678, 0171 1234567. */
const GERMAN_LOCAL = /(?<![\p{L}\p{N}])0\d{2,4}[\s/-]\d{3,9}(?![\p{L}\p{N}])/gdu

/** UK national format: 020 7946 0958, 07700 900123, 0161 496 0000. */
const UK_LOCAL = /(?<![\p{L}\p{N}])0\d{2,4}\s\d{3,4}\s?\d{3,4}(?![\p{L}\p{N}])/gdu

function plausiblePhone(value: string): boolean {
  const digits = onlyDigits(value)
  if (digits.length < 9 || digits.length > 15) return false
  // Reject obvious runs (000000000, 111111111).
  if (/^(\d)\1+$/.test(digits)) return false
  return true
}

/**
 * Registry identifiers (KRS, REGON, NIP) look exactly like 9-10 digit phone
 * numbers. The label right before them tells them apart.
 */
const IDENTIFIER_LABEL = /(?:KRS|REGON|NIP|PESEL|IBAN|VAT|EUID|NCR|GMP|konto|rachunek|account)[\s:#-]*$/i

function followsIdentifierLabel(text: string, start: number): boolean {
  return IDENTIFIER_LABEL.test(text.slice(Math.max(0, start - 28), start))
}

export const phoneRule: DetectionRule = {
  id: 'phone',
  label: 'Numery telefonów',
  tokenLabel: 'TELEFON',
  description: 'Numery w formacie polskim, niemieckim, brytyjskim i międzynarodowym.',
  category: 'contact',
  tier: 'free',
  priority: 62,
  defaultEnabled: true,
  detect: (text) => {
    const international = collect(text, INTERNATIONAL, { accept: plausiblePhone })
    const local = collect(text, LOCAL, { accept: plausiblePhone })
    const german = collect(text, GERMAN_LOCAL, { accept: plausiblePhone })
    const uk = collect(text, UK_LOCAL, { accept: plausiblePhone })

    return [...international, ...local, ...german, ...uk].filter(
      (match) => !followsIdentifierLabel(text, match.start),
    )
  },
}
