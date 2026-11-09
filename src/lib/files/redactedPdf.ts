import type { ManualRedaction, RedactionEdit } from './types'

export interface RedactedPdfResult {
  bytes: Uint8Array
  /** Spans that were painted over. */
  applied: number
  /** Spans that could not be located on the pages. */
  skipped: number
  /** True when the pages had to be rasterized instead of patched in place. */
  flattened: boolean
}

export interface RedactedPdfOptions {
  /** Force rasterizing, so the original text layer is removed. */
  flatten?: boolean
  /** Regions drawn by hand over scans, stamps and signatures. */
  manualRedactions?: ManualRedaction[]
}

/**
 * Produces a redacted copy of the source PDF. Vector patching is preferred
 * (keeps text selectable and the layout intact). Encrypted or otherwise
 * unpatchable documents - and explicit `flatten` requests - are rasterized,
 * which always yields a valid file with no recoverable original text.
 */
export async function buildRedactedPdf(
  source: ArrayBuffer,
  edits: RedactionEdit[],
  options: RedactedPdfOptions = {},
): Promise<RedactedPdfResult> {
  const manual = options.manualRedactions ?? []

  if (!options.flatten) {
    try {
      const { redactPdf } = await import('./pdfRedact')
      const result = await redactPdf(source, edits, manual)
      if (result.applied > 0) return { ...result, flattened: false }
    } catch (error) {
      // Encrypted, unsupported structure or nothing matched: fall through to
      // the rasterizer, which can still produce a correct result.
      if (import.meta.env.DEV) console.warn('[nulllm] vector redaction skipped', error)
    }
  }

  if (import.meta.env.DEV) console.info('[nulllm] rasterizing', edits.length, manual.length, 'spans')
  const { flattenPdf } = await import('./pdfFlatten')
  const result = await flattenPdf(source, edits, manual)
  return { ...result, flattened: true }
}
