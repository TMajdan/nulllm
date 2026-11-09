import { normalizeWhitespace } from './docx'

const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g

/**
 * Best-effort text extraction for legacy Word 97-2003 `.doc` files.
 *
 * A real parser would need the full OLE/CFB + FIB structure. Instead we scan
 * the byte stream in both cp1252 and UTF-16LE, keep printable prose runs and
 * pick whichever decoding yields more letters. Good enough for preview and
 * anonymization; the UI warns about it.
 */
function extractRuns(value: string): string {
  const cleaned = value.replace(CONTROL_CHARS, ' ')

  // Greedy runs of "prose-like" characters, bounded by whitespace/newlines.
  const pattern = /[\p{L}\p{N}][\p{L}\p{N}\p{P}\p{Zs}\t]{9,}/gu
  const runs: string[] = []

  let match: RegExpExecArray | null
  while ((match = pattern.exec(cleaned)) !== null) {
    const run = match[0].replace(/\s{2,}/g, ' ').trim()
    const letters = (run.match(/\p{L}/gu) ?? []).length

    if (letters < 12) continue
    if (letters < run.length * 0.4) continue

    runs.push(run)
  }

  return runs.join('\n')
}

function letterCount(value: string): number {
  return (value.match(/\p{L}/gu) ?? []).length
}

/**
 * Counts real words (3+ letters). UTF-16 bytes read as cp1252 produce
 * single-letter "words" ("U m o w a"), so this reliably picks the right
 * decoding.
 */
function wordScore(value: string): number {
  return (value.match(/\p{L}{3,}/gu) ?? []).length * 3 + letterCount(value) / 100
}

export interface LegacyDocResult {
  text: string
  usedEncoding: 'utf-16le' | 'windows-1252'
}

export function docToText(buffer: ArrayBuffer): LegacyDocResult {
  const bytes = new Uint8Array(buffer)

  const utf16 = extractRuns(new TextDecoder('utf-16le', { fatal: false }).decode(bytes))
  const cp1252 = extractRuns(new TextDecoder('windows-1252', { fatal: false }).decode(bytes))

  const useUtf16 = wordScore(utf16) >= wordScore(cp1252)
  const text = normalizeWhitespace(useUtf16 ? utf16 : cp1252)

  return {
    text,
    usedEncoding: useUtf16 ? 'utf-16le' : 'windows-1252',
  }
}
