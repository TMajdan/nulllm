export interface WordStats {
  text: string
  truncated: boolean
  totalWords: number
  keptWords: number
}

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

/**
 * Cuts the text after `limit` whitespace-separated words without breaking the
 * last word. Used by the free tier gate.
 */
export function truncateToWords(text: string, limit: number): WordStats {
  const totalWords = countWords(text)
  if (totalWords <= limit) {
    return { text, truncated: false, totalWords, keptWords: totalWords }
  }

  const wordPattern = /\S+/g
  let seen = 0
  let cutAt = 0
  let match: RegExpExecArray | null

  while ((match = wordPattern.exec(text)) !== null) {
    seen += 1
    if (seen === limit) {
      cutAt = match.index + match[0].length
      break
    }
  }

  return {
    text: text.slice(0, cutAt),
    truncated: true,
    totalWords,
    keptWords: limit,
  }
}

export function countChars(text: string): number {
  return text.length
}
