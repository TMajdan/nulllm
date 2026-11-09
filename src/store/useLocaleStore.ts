import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { detectLocale, type Locale } from '@/i18n'

interface LocaleStore {
  locale: Locale
  setLocale: (locale: Locale) => void
}

function applyDocumentLang(locale: Locale) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
}

export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set) => ({
      locale: detectLocale(),
      setLocale: (locale) => {
        applyDocumentLang(locale)
        set({ locale })
      },
    }),
    {
      name: 'nllm:locale',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.locale) applyDocumentLang(state.locale)
      },
    },
  ),
)
