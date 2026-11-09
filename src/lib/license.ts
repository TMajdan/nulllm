import { DEMO_LICENSE_KEY } from './constants'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const BRANDED_PATTERN = /^NULLLM(?:-[A-Z0-9]{4}){3}$/i

export interface LicenseCheck {
  valid: boolean
  reason?: string
}

/**
 * MOCK licence verification.
 *
 * This runs entirely in the browser and intentionally performs no network call.
 * In production you would replace this with a real verification: send the key
 * to your LemonSqueezy / Gumroad / Paddle endpoint (only the key, never any
 * user content), cache the signed entitlement and re-check it on load.
 */
export function verifyLicenseKey(rawKey: string): LicenseCheck {
  const key = rawKey.trim()
  if (!key) return { valid: false, reason: 'Podaj klucz licencyjny.' }

  if (key.toUpperCase() === DEMO_LICENSE_KEY) return { valid: true }

  if (UUID_PATTERN.test(key)) return { valid: true }

  if (BRANDED_PATTERN.test(key)) {
    const blocks = key.toUpperCase().split('-')
    // Reject obviously placeholder keys such as NULLLM-0000-0000-0000.
    const isPlaceholder = blocks.slice(1).every((block) => /^(.)\1{3}$/.test(block))
    if (isPlaceholder) {
      return { valid: false, reason: 'To miejsce na klucz - wklej klucz z zakupu.' }
    }
    return { valid: true }
  }

  return {
    valid: false,
    reason: 'Nieprawidłowy format. Oczekiwano UUID lub klucza NULLLM-XXXX-XXXX-XXXX.',
  }
}

export function maskLicenseKey(key: string | null): string {
  if (!key) return '-'
  if (key.length <= 8) return '••••'
  return `${key.slice(0, 4)}••••${key.slice(-4)}`
}
