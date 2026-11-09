import type { DetectionRule } from '../types'
import { collect } from './helpers'

/** US Social Security Number: 000-00-0000 with structural validation. */
const SSN_PATTERN = /(?<![\p{L}\p{N}])\d{3}-\d{2}-\d{4}(?![\p{L}\p{N}])/gdu

/** UK National Insurance Number, with or without spaces. */
const NINO_PATTERN =
  /(?<![\p{L}\p{N}])[ABCEGHJ-PRSTW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D](?![\p{L}\p{N}])/giu

const NINO_BLOCKED_PREFIXES = new Set(['BG', 'GB', 'NK', 'KN', 'TN', 'NT', 'ZZ'])

/** Area 000/666 and 900-999 are invalid, as are group 00 and serial 0000. */
export function isValidSsn(value: string): boolean {
  const match = /^(\d{3})-(\d{2})-(\d{4})$/.exec(value.trim())
  if (!match) return false

  const area = Number(match[1])
  const group = Number(match[2])
  const serial = Number(match[3])

  if (area === 0 || area === 666 || area >= 900) return false
  if (group === 0) return false
  if (serial === 0) return false

  return true
}

export function isValidNino(value: string): boolean {
  const compact = value.replace(/\s/g, '').toUpperCase()
  if (!/^[ABCEGHJ-PRSTW-Z]{2}\d{6}[A-D]$/.test(compact)) return false
  return !NINO_BLOCKED_PREFIXES.has(compact.slice(0, 2))
}

export const usSsnRule: DetectionRule = {
  id: 'us-ssn',
  label: 'SSN (US)',
  tokenLabel: 'SSN',
  description: 'Numer ubezpieczenia społecznego USA w formacie 000-00-0000.',
  category: 'identity',
  tier: 'pro',
  region: 'en',
  priority: 80,
  defaultEnabled: true,
  detect: (text) => collect(text, SSN_PATTERN, { accept: isValidSsn }),
}

export const gbNinoRule: DetectionRule = {
  id: 'gb-nino',
  label: 'NINO (UK)',
  tokenLabel: 'NINO',
  description: 'Brytyjski numer ubezpieczenia (National Insurance Number).',
  category: 'identity',
  tier: 'pro',
  region: 'en',
  priority: 79,
  defaultEnabled: true,
  detect: (text) => collect(text, NINO_PATTERN, { accept: isValidNino }),
}
