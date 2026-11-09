/** Canonical token shape: `[LABEL_1]`, `[EMAIL_2]`, `[KWOTA_A]`. */
export function normalizeTokenInput(raw: string): string | null {
  const stripped = raw
    .trim()
    .replace(/^[\[({<【]+/, '')
    .replace(/[\])}>】]+$/, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')

  if (!stripped) return null
  if (stripped.length > 40) return null

  return `[${stripped}]`
}

/** Normalised key used to match token variants coming back from an LLM. */
export function normalizeTokenKey(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Heuristic: does the inner text of a bracket group look like one of our tokens?
 * Requires the `LABEL_separator_suffix` shape, so plain words in brackets
 * (e.g. "[Note]") are not reported as broken tokens.
 */
export function looksLikeToken(inner: string): boolean {
  return /^[A-Z][A-Z0-9_]{0,30}[ _-](?:\d{1,3}|[A-Z])$/i.test(inner.trim())
}
