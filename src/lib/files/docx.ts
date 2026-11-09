import { strFromU8, unzipSync } from 'fflate'

const XML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&nbsp;': ' ',
}

export function decodeXmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&[a-z]+;/gi, (entity) => XML_ENTITIES[entity.toLowerCase()] ?? entity)
}

export function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

/**
 * Converts `word/document.xml` into plain text.
 * Keeps paragraph and tab structure, drops tracked deletions and field codes.
 */
export function xmlToPlainText(xml: string): string {
  let value = xml

  value = value.replace(/<w:del\b[\s\S]*?<\/w:del>/g, '')
  value = value.replace(/<w:instrText\b[^>]*>[\s\S]*?<\/w:instrText>/g, '')
  value = value.replace(/<w:tab\b[^>]*\/>/g, '\t')
  value = value.replace(/<w:(?:br|cr)\b[^>]*\/>/g, '\n')
  // An empty paragraph becomes a blank line, a regular one a line break.
  value = value.replace(/<w:p\b[^>]*\/>/g, '\n\n')
  value = value.replace(/<\/w:tc>/g, '\t')
  value = value.replace(/<\/w:p>/g, '\n')
  value = value.replace(/<[^>]+>/g, '')
  value = decodeXmlEntities(value)

  return normalizeWhitespace(
    value
      .split('\n')
      .map((line) => line.replace(/[ \t]+$/, ''))
      .join('\n'),
  )
}

export interface DocxResult {
  text: string
  paragraphs: number
}

export function docxToText(buffer: ArrayBuffer): DocxResult {
  const archive = unzipSync(new Uint8Array(buffer))
  const entry = archive['word/document.xml']

  if (!entry) {
    throw new Error('Brak word/document.xml w pliku .docx')
  }

  const text = xmlToPlainText(strFromU8(entry))
  const paragraphs = text ? text.split(/\n{2,}/).filter((part) => part.trim()).length : 0

  return { text, paragraphs }
}
