export const APP_NAME = 'NullLM'
export const APP_TAGLINE = 'Local PII & Sensitive Data Anonymizer for LLMs'
export const APP_VERSION = '0.1.0'

/** Free tier: maximum number of words that can be anonymized per run. */
export const FREE_WORD_LIMIT = 500

export const SUPPORTED_FILE_TYPES = '.txt,.log,.md,.csv,.json,.doc,.docx,.pdf'
export const MAX_FILE_BYTES = 10 * 1024 * 1024

export const SESSION_STORAGE_KEY = 'nllm:session:v1'
export const LICENSE_STORAGE_KEY = 'nllm:license:v1'
export const THEME_STORAGE_KEY = 'nllm:theme'

/**
 * Mock checkout URL. Replace with your LemonSqueezy / Gumroad product link.
 * Nothing from the editor is ever sent here - it is a plain external navigation.
 */
export const CHECKOUT_URL = 'https://REPLACE-WITH-YOUR-STORE.lemonsqueezy.com/buy/CHECKOUT_ID'

/** Local demo key that unlocks Pro without any network call. */
export const DEMO_LICENSE_KEY = 'NULLLM-PRO1-2025-DEMO'
