/** Checksum validators for Polish identifiers. All run locally, no network. */

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * PESEL: 11 digits, weighted checksum (1,3,7,9,1,3,7,9,1,3) plus a sanity check
 * of the encoded birth date (month is offset per century).
 */
export function isValidPesel(value: string): boolean {
  const digits = onlyDigits(value)
  if (digits.length !== 11) return false

  const numbers = digits.split('').map(Number)
  const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3]

  let sum = 0
  for (let i = 0; i < weights.length; i += 1) {
    sum += weights[i] * numbers[i]
  }

  const control = (10 - (sum % 10)) % 10
  if (control !== numbers[10]) return false

  const month = numbers[2] * 10 + numbers[3]
  const day = numbers[4] * 10 + numbers[5]

  const centuryOffset = [
    { from: 1, to: 12, base: 1900 },
    { from: 21, to: 32, base: 2000 },
    { from: 41, to: 52, base: 2100 },
    { from: 61, to: 72, base: 2200 },
    { from: 81, to: 92, base: 1800 },
  ].find((range) => month >= range.from && month <= range.to)

  if (!centuryOffset) return false
  if (day < 1 || day > 31) return false

  const year = centuryOffset.base + numbers[0] * 10 + numbers[1]
  const monthIndex = month - centuryOffset.from

  const date = new Date(year, monthIndex, day)
  return date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day
}

/** NIP: 10 digits, weighted checksum (6,5,7,2,3,4,5,6,7), mod 11. */
export function isValidNip(value: string): boolean {
  const digits = onlyDigits(value)
  if (digits.length !== 10) return false

  const numbers = digits.split('').map(Number)
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7]

  let sum = 0
  for (let i = 0; i < weights.length; i += 1) {
    sum += weights[i] * numbers[i]
  }

  const control = sum % 11
  return control !== 10 && control === numbers[9]
}

/** IBAN mod-97 validation (works for any country, including `PL`). */
export function isValidIban(value: string): boolean {
  const clean = value.replace(/[\s-]/g, '').toUpperCase()
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(clean)) return false
  if (clean.length < 15 || clean.length > 34) return false

  const rearranged = clean.slice(4) + clean.slice(0, 4)
  let remainder = 0

  for (const char of rearranged) {
    const numeric =
      char >= 'A' && char <= 'Z' ? String(char.charCodeAt(0) - 55) : char
    for (const digit of numeric) {
      remainder = (remainder * 10 + Number(digit)) % 97
    }
  }

  return remainder === 1
}

/** Polish bank account: 26 digits, validated as an `PL` IBAN. */
export function isValidPolishAccount(value: string): boolean {
  const digits = onlyDigits(value)
  if (digits.length !== 26) return false
  return isValidIban(`PL${digits}`)
}

/** Luhn check used for payment card numbers. */
export function isValidLuhn(value: string): boolean {
  const digits = onlyDigits(value)
  if (digits.length < 13 || digits.length > 19) return false

  let sum = 0
  let double = false

  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i])
    if (double) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    double = !double
  }

  return sum % 10 === 0
}

export function isPaymentCard(value: string): boolean {
  const digits = onlyDigits(value)
  if (!/^[3-6]/.test(digits)) return false
  return isValidLuhn(digits)
}
