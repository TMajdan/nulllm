import type { RuleCategory } from '@/anonymizer/types'

/** Token pill styling per data category - muted tints, no rings. */
export const CATEGORY_TOKEN_CLASS: Record<RuleCategory, string> = {
  identity:
    'bg-violet-500/10 text-violet-700 dark:bg-violet-400/12 dark:text-violet-300',
  technical: 'bg-sky-500/10 text-sky-700 dark:bg-sky-400/12 dark:text-sky-300',
  contact:
    'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/12 dark:text-emerald-300',
  finance: 'bg-amber-500/12 text-amber-700 dark:bg-amber-400/12 dark:text-amber-300',
  custom: 'bg-pink-500/10 text-pink-700 dark:bg-pink-400/12 dark:text-pink-300',
}

export const CATEGORY_DOT_CLASS: Record<RuleCategory, string> = {
  identity: 'bg-violet-400',
  technical: 'bg-sky-400',
  contact: 'bg-emerald-400',
  finance: 'bg-amber-400',
  custom: 'bg-pink-400',
}

/** Token pills for the white "paper" preview (always light colours). */
export const CATEGORY_TOKEN_PAPER: Record<RuleCategory, string> = {
  identity: 'bg-violet-100 text-violet-800',
  technical: 'bg-sky-100 text-sky-800',
  contact: 'bg-emerald-100 text-emerald-800',
  finance: 'bg-amber-100 text-amber-800',
  custom: 'bg-pink-100 text-pink-800',
}
