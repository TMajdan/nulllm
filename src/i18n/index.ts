import { de } from './messages/de'
import { en } from './messages/en'
import { pl, type Messages } from './messages/pl'

export type Locale = 'pl' | 'en' | 'de'
export type { Messages }

export const LOCALES: Locale[] = ['pl', 'en', 'de']

export const MESSAGES: Record<Locale, Messages> = { pl, en, de }

export const LOCALE_LABELS: Record<Locale, string> = {
  pl: 'Polski',
  en: 'English',
  de: 'Deutsch',
}

export const LOCALE_SHORT: Record<Locale, string> = {
  pl: 'PL',
  en: 'EN',
  de: 'DE',
}

export type DeepKeys<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object ? `${K}.${DeepKeys<T[K]>}` : K
    }[keyof T & string]
  : never

export type MessageKey = DeepKeys<Messages>

export type TFunction = (
  key: MessageKey | (string & {}),
  vars?: Record<string, string | number>,
) => string

function lookup(messages: unknown, path: string): string | undefined {
  let current: unknown = messages

  for (const part of path.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined
    current = (current as Record<string, unknown>)[part]
  }

  return typeof current === 'string' ? current : undefined
}

export function hasMessage(locale: Locale, key: string): boolean {
  return lookup(MESSAGES[locale], key) !== undefined
}

export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const raw = lookup(MESSAGES[locale], key) ?? lookup(MESSAGES.pl, key) ?? key
  if (!vars) return raw

  return raw.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name]
    return value === undefined ? match : String(value)
  })
}

/** Detects a sensible starting locale from the browser. */
export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'pl'

  const candidates = [...(navigator.languages ?? []), navigator.language].filter(Boolean)
  for (const candidate of candidates) {
    const base = candidate.toLowerCase().split('-')[0]
    if (base === 'pl' || base === 'en' || base === 'de') return base
  }

  return 'pl'
}
