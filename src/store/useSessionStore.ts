import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { anonymizeText, resolveActiveRules, type PreviewRule } from '@/anonymizer/anonymize'
import { restoreText } from '@/anonymizer/restore'
import { sanitizeTokenLabel } from '@/anonymizer/customRules'
import { DEFAULT_ENABLED_RULE_IDS, RULES } from '@/anonymizer/rules'
import { ruleIsVisible } from '@/anonymizer/rules/regions'
import type {
  AnonymizeStats,
  CustomEntry,
  RestoreReport,
  Segment,
  TokenRecord,
} from '@/anonymizer/types'
import { FREE_WORD_LIMIT, SESSION_STORAGE_KEY } from '@/lib/constants'
import type { DocumentFormat, ManualRedaction } from '@/lib/files/types'
import { normalizeTokenInput } from '@/lib/tokens'
import { useLocaleStore } from './useLocaleStore'

export interface SourceDocument {
  fileName: string
  format: DocumentFormat
  size: number
  pages?: number
  paragraphs?: number
}

/**
 * Everything is kept in `sessionStorage` (cleared when the tab closes) and in
 * memory only. There is no backend, no telemetry and no external request.
 */
const memoryFallback = new Map<string, string>()

const safeSessionStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.sessionStorage.getItem(name)
    } catch {
      return memoryFallback.get(name) ?? null
    }
  },
  setItem: (name, value) => {
    try {
      window.sessionStorage.setItem(name, value)
    } catch {
      memoryFallback.set(name, value)
    }
  },
  removeItem: (name) => {
    try {
      window.sessionStorage.removeItem(name)
    } catch {
      /* ignore */
    }
    memoryFallback.delete(name)
  },
}

function uid(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `entry-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  }
}

export interface SessionStore {
  input: string
  lastProcessedInput: string
  anonymizedText: string
  segments: Segment[]
  records: TokenRecord[]
  stats: AnonymizeStats | null
  response: string
  restoredText: string
  restoreReport: RestoreReport | null
  enabledRuleIds: string[]
  customEntries: CustomEntry[]
  sourceDoc: SourceDocument | null
  /** Regions manually marked on the PDF preview (scans, signatures, …). */
  manualRedactions: ManualRedaction[]
  /** Show rules from every region instead of only the current language. */
  showAllRegions: boolean

  setInput: (value: string) => void
  clearInput: () => void
  setResponse: (value: string) => void
  clearResponse: () => void
  toggleRule: (id: string) => void
  setRuleEnabled: (id: string, enabled: boolean) => void
  setAllRules: (enabled: boolean, isPro: boolean) => void
  resetRules: () => void
  addCustomEntry: (phrase: string, tokenLabel: string) => CustomEntry | null
  removeCustomEntry: (id: string) => void
  setSourceDoc: (doc: SourceDocument | null) => void
  addManualRedaction: (rect: Omit<ManualRedaction, 'id'>) => void
  removeManualRedaction: (id: string) => void
  clearManualRedactions: () => void
  setShowAllRegions: (value: boolean) => void
  runAnonymize: (isPro: boolean) => AnonymizeStats | null
  runRestore: () => RestoreReport | null
  renameRecord: (id: string, token: string) => { ok: boolean; reason?: string }
  removeRecord: (id: string) => void
  clearSession: () => void
}

const initialState = {
  input: '',
  lastProcessedInput: '',
  anonymizedText: '',
  segments: [] as Segment[],
  records: [] as TokenRecord[],
  stats: null as AnonymizeStats | null,
  response: '',
  restoredText: '',
  restoreReport: null as RestoreReport | null,
  enabledRuleIds: DEFAULT_ENABLED_RULE_IDS,
  customEntries: [] as CustomEntry[],
  sourceDoc: null as SourceDocument | null,
  manualRedactions: [] as ManualRedaction[],
  showAllRegions: false,
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setInput: (value) => set({ input: value }),
      clearInput: () =>
        set({
          input: '',
          lastProcessedInput: '',
          anonymizedText: '',
          segments: [],
          stats: null,
          sourceDoc: null,
          manualRedactions: [],
        }),
      setResponse: (value) => set({ response: value }),
      clearResponse: () => set({ response: '', restoredText: '', restoreReport: null }),

      toggleRule: (id) =>
        set((state) => ({
          enabledRuleIds: state.enabledRuleIds.includes(id)
            ? state.enabledRuleIds.filter((ruleId) => ruleId !== id)
            : [...state.enabledRuleIds, id],
        })),

      setRuleEnabled: (id, enabled) =>
        set((state) => ({
          enabledRuleIds: enabled
            ? Array.from(new Set([...state.enabledRuleIds, id]))
            : state.enabledRuleIds.filter((ruleId) => ruleId !== id),
        })),

      setAllRules: (enabled, isPro) =>
        set(() => ({
          enabledRuleIds: enabled
            ? RULES.filter((rule) => isPro || rule.tier === 'free').map((rule) => rule.id)
            : [],
        })),

      resetRules: () => set({ enabledRuleIds: DEFAULT_ENABLED_RULE_IDS }),

      addCustomEntry: (phrase, tokenLabel) => {
        const trimmed = phrase.trim()
        if (trimmed.length < 2) return null

        const exists = get().customEntries.some(
          (entry) => entry.phrase.trim().toLowerCase() === trimmed.toLowerCase(),
        )
        if (exists) return null

        const entry: CustomEntry = {
          id: uid(),
          phrase: trimmed,
          tokenLabel: sanitizeTokenLabel(tokenLabel || 'KLIENT'),
          createdAt: Date.now(),
        }

        set((state) => ({ customEntries: [...state.customEntries, entry] }))
        return entry
      },

      removeCustomEntry: (id) =>
        set((state) => ({
          customEntries: state.customEntries.filter((entry) => entry.id !== id),
        })),

      setSourceDoc: (doc) => set({ sourceDoc: doc }),

      addManualRedaction: (rect) =>
        set((state) => ({
          manualRedactions: [...state.manualRedactions, { ...rect, id: uid() }],
        })),

      removeManualRedaction: (id) =>
        set((state) => ({
          manualRedactions: state.manualRedactions.filter((rect) => rect.id !== id),
        })),

      clearManualRedactions: () => set({ manualRedactions: [] }),

      setShowAllRegions: (value) => set({ showAllRegions: value }),

      runAnonymize: (isPro) => {
        const state = get()
        if (!state.input.trim()) return null

        const locale = useLocaleStore.getState().locale

        const rules = resolveActiveRules({
          enabledRuleIds: state.enabledRuleIds,
          customEntries: state.customEntries,
          isPro,
          locale,
          showAllRegions: state.showAllRegions,
        })

        // Everything that is enabled in the settings but skipped for this run:
        // hidden by the language filter or locked behind the Pro plan.
        const previewRules: PreviewRule[] = []
        for (const rule of RULES) {
          if (!state.enabledRuleIds.includes(rule.id)) continue

          if (!ruleIsVisible(rule, locale, state.showAllRegions)) {
            previewRules.push({ rule, reason: 'region' })
          } else if (!isPro && rule.tier === 'pro') {
            previewRules.push({ rule, reason: 'tier' })
          }
        }

        const result = anonymizeText({
          text: state.input,
          rules,
          existingRecords: state.records,
          wordLimit: isPro ? undefined : FREE_WORD_LIMIT,
          previewRules,
        })

        set({
          anonymizedText: result.text,
          segments: result.segments,
          records: result.records,
          stats: result.stats,
          lastProcessedInput: state.input,
        })

        return result.stats
      },

      runRestore: () => {
        const state = get()
        if (!state.response.trim()) return null

        const { text, report } = restoreText(state.response, state.records)
        set({ restoredText: text, restoreReport: report })
        return report
      },

      renameRecord: (id, token) => {
        const nextToken = normalizeTokenInput(token)
        if (!nextToken) {
          return { ok: false, reason: 'Token może zawierać tylko litery, cyfry i podkreślenia.' }
        }

        const state = get()
        const record = state.records.find((item) => item.id === id)
        if (!record) return { ok: false, reason: 'Nie znaleziono mapowania.' }

        const taken = state.records.some(
          (item) => item.id !== id && item.token.toUpperCase() === nextToken.toUpperCase(),
        )
        if (taken) return { ok: false, reason: 'Taki token już istnieje w mapowaniu.' }

        const records = state.records.map((item) =>
          item.id === id ? { ...item, token: nextToken } : item,
        )
        const segments = state.segments.map((segment) =>
          segment.recordId === id ? { ...segment, text: nextToken } : segment,
        )

        set({
          records,
          segments,
          anonymizedText: segments.map((segment) => segment.text).join(''),
        })

        return { ok: true }
      },

      removeRecord: (id) => {
        const state = get()
        const segments = state.segments.map((segment) =>
          segment.recordId === id ? { ...segment, text: '[REDACTED]', recordId: undefined } : segment,
        )

        set({
          records: state.records.filter((record) => record.id !== id),
          segments,
          anonymizedText: segments.map((segment) => segment.text).join(''),
        })
      },

      clearSession: () =>
        set({
          input: '',
          lastProcessedInput: '',
          anonymizedText: '',
          segments: [],
          records: [],
          stats: null,
          response: '',
          restoredText: '',
          restoreReport: null,
          customEntries: [],
          sourceDoc: null,
          manualRedactions: [],
        }),
    }),
    {
      name: SESSION_STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => safeSessionStorage),
      migrate: (persistedState, version) => {
        const state = persistedState as SessionStore
        if (version < 2) {
          // Rule ids changed (language-aware person rules), so start from the
          // current defaults instead of silently disabling the new ones.
          return { ...state, enabledRuleIds: DEFAULT_ENABLED_RULE_IDS, sourceDoc: null }
        }
        return state
      },
    },
  ),
)
