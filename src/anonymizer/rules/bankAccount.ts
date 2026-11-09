import { isValidIban, isValidPolishAccount } from '../checksums'
import type { DetectionRule } from '../types'
import { collect } from './helpers'

/** 26 digits, optionally grouped every 4 characters, optionally prefixed with PL. */
const POLISH_ACCOUNT = /(?<![\p{N}])(?:PL[\s-]?)?\d{2}(?:[\s-]?\d{4}){6}(?![\p{N}])/gdu

/** Generic IBAN for other countries. */
const IBAN = /(?<![\p{L}\p{N}])[A-Z]{2}\d{2}(?:[\s]?[A-Z0-9]{4}){2,7}(?:[\s]?[A-Z0-9]{1,3})?(?![\p{L}\p{N}])/gdu

export const bankAccountRule: DetectionRule = {
  id: 'bank-account',
  label: 'Konto / IBAN',
  tokenLabel: 'KONTO',
  description: 'Numer konta (26 cyfr) oraz IBAN, weryfikowane sumą kontrolną mod-97.',
  category: 'finance',
  tier: 'pro',
  priority: 86,
  defaultEnabled: true,
  detect: (text) => {
    const polish = collect(text, POLISH_ACCOUNT, {
      accept: (value) => isValidPolishAccount(value),
    })
    const international = collect(text, IBAN, { accept: (value) => isValidIban(value) })
    return [...polish, ...international]
  },
}
