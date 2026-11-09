import { create } from 'zustand'
import { applyTheme, getInitialTheme, type Theme } from '@/lib/theme'

interface ThemeStore {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

/**
 * Single source of truth for the theme so the header toggle and the toast
 * renderer cannot drift apart.
 */
export const useThemeStore = create<ThemeStore>()((set, get) => ({
  theme: getInitialTheme(),
  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    set({ theme: next })
  },
  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },
}))
