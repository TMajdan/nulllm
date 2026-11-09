import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { LICENSE_STORAGE_KEY } from '@/lib/constants'
import { verifyLicenseKey } from '@/lib/license'

export type Plan = 'free' | 'pro'

export interface LicenseStore {
  plan: Plan
  key: string | null
  activatedAt: number | null
  activate: (rawKey: string) => { ok: boolean; error?: string }
  deactivate: () => void
}

export const useLicenseStore = create<LicenseStore>()(
  persist(
    (set) => ({
      plan: 'free',
      key: null,
      activatedAt: null,

      activate: (rawKey) => {
        const result = verifyLicenseKey(rawKey)
        if (!result.valid) {
          return { ok: false, error: result.reason ?? 'Nieprawidłowy klucz.' }
        }

        set({
          plan: 'pro',
          key: rawKey.trim(),
          activatedAt: Date.now(),
        })

        return { ok: true }
      },

      deactivate: () => set({ plan: 'free', key: null, activatedAt: null }),
    }),
    {
      name: LICENSE_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

export function useIsPro(): boolean {
  return useLicenseStore((state) => state.plan === 'pro')
}
