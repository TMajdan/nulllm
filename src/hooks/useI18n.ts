import { useCallback } from 'react'
import { translate, type Locale, type MessageKey, type TFunction } from '@/i18n'
import { useLocaleStore } from '@/store/useLocaleStore'

export interface I18n {
  t: TFunction
  locale: Locale
  setLocale: (locale: Locale) => void
  /** Locale-aware number formatting. */
  n: (value: number) => string
}

export function useI18n(): I18n {
  const locale = useLocaleStore((state) => state.locale)
  const setLocale = useLocaleStore((state) => state.setLocale)

  const t = useCallback<TFunction>(
    (key, vars) => translate(locale, key as string, vars),
    [locale],
  )

  const n = useCallback((value: number) => value.toLocaleString(locale), [locale])

  return { t, locale, setLocale, n }
}

/** Translates a rule label/description, falling back to the rule's own text. */
export function ruleText(
  t: TFunction,
  ruleId: string,
  field: 'label' | 'description',
  fallback: string,
): string {
  const key = `catalog.${ruleId}.${field}`
  const value = t(key)
  return value === key ? fallback : value
}

export { type MessageKey }
