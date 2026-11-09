import { strToU8, zipSync } from 'fflate'
import fontUrl from '@/assets/fonts/Roboto-Regular.ttf?url'
import { downloadTextFile } from '@/lib/download'
import { getSourceFile } from './sourceCache'
import type { DocumentFormat, ExportFormat, ManualRedaction, RedactionEdit } from './types'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function paragraphsXml(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.replace(/\s+$/, '')
      if (!trimmed.trim()) return '<w:p/>'
      return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(trimmed)}</w:t></w:r></w:p>`
    })
    .join('')
}

/** Builds a minimal but valid WordprocessingML package. */
export function buildDocx(text: string, title: string): Uint8Array {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

  const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults>
<w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
</w:styles>`

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
<w:p><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t xml:space="preserve">${escapeXml(title)}</w:t></w:r></w:p>
<w:p/>
${paragraphsXml(text)}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
</w:body>
</w:document>`

  return zipSync(
    {
      '[Content_Types].xml': strToU8(contentTypes),
      '_rels/.rels': strToU8(rootRels),
      'word/document.xml': strToU8(document),
      'word/styles.xml': strToU8(styles),
      'word/_rels/document.xml.rels': strToU8(documentRels),
    },
    { level: 6 },
  )
}

function downloadBytes(fileName: string, bytes: Uint8Array, mime: string): void {
  const blob = new Blob([bytes], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

let cachedFont: ArrayBuffer | null = null

async function loadPdfFont(): Promise<ArrayBuffer> {
  if (cachedFont) return cachedFont

  // Served from the app itself (same origin), never from a third party.
  const response = await fetch(fontUrl)
  if (!response.ok) throw new Error('Font asset missing')
  cachedFont = await response.arrayBuffer()
  return cachedFont
}

export interface ExportRequest {
  format: ExportFormat
  text: string
  title: string
  subtitle?: string
  fileName: string
  locale: string
  /** Sensitive spans of the imported document (anonymized export only). */
  edits?: RedactionEdit[]
  /** Format of the imported document, used for hints when the bytes are gone. */
  sourceFormat?: DocumentFormat
  /** Remove the hidden text layer by rasterizing the redacted pages. */
  flatten?: boolean
  /** Regions marked by hand on the PDF preview. */
  manualRedactions?: ManualRedaction[]
}

export interface ExportResult {
  status: 'downloaded' | 'failed'
  /** True when the original PDF was redacted instead of regenerated. */
  inPlace?: boolean
  /** Spans painted over in the exported PDF. */
  redacted?: number
  /** Spans that could not be located in the PDF. */
  skipped?: number
  /** A PDF source was imported but its bytes are no longer in memory. */
  regenerated?: boolean
  /** The file had to be rasterized (e.g. an encrypted source PDF). */
  flattened?: boolean
  /** Rasterized automatically, without the user asking for it. */
  autoFlatten?: boolean
}

export async function exportDocument(request: ExportRequest): Promise<ExportResult> {
  const { format, text, title, subtitle, fileName, locale, edits, sourceFormat, flatten, manualRedactions } =
    request

  try {
    switch (format) {
      case 'txt':
        downloadTextFile(`${fileName}.txt`, text)
        return { status: 'downloaded' }
      case 'md':
        downloadTextFile(
          `${fileName}.md`,
          `# ${title}\n\n${text}\n`,
          'text/markdown;charset=utf-8',
        )
        return { status: 'downloaded' }
      case 'docx': {
        const source = getSourceFile()

        // PDF sources keep their exact look: every page is embedded as an image.
        if (source?.format === 'pdf' && edits !== undefined) {
          const { buildDocxFromPdf } = await import('./docxFromPdf')
          const result = await buildDocxFromPdf(source.bytes, edits, manualRedactions ?? [])

          downloadBytes(
            `${fileName}.docx`,
            result.bytes,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          )

          return {
            status: 'downloaded',
            redacted: result.applied,
            skipped: result.skipped,
          }
        }

        downloadBytes(
          `${fileName}.docx`,
          buildDocx(text, title),
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )
        return { status: 'downloaded' }
      }
      case 'pdf': {
        const source = getSourceFile()

        if (source?.format === 'pdf' && edits !== undefined) {
          const manual = manualRedactions ?? []

          // Keep the original document and only paint over the sensitive spans.
          if (edits.length === 0 && manual.length === 0) {
            downloadBytes(`${fileName}.pdf`, new Uint8Array(source.bytes.slice(0)), 'application/pdf')
            return { status: 'downloaded', inPlace: true, redacted: 0, skipped: 0 }
          }

          const { buildRedactedPdf } = await import('./redactedPdf')
          const result = await buildRedactedPdf(source.bytes, edits, { flatten, manualRedactions: manual })
          if (result.applied === 0) throw new Error('No span could be redacted')

          downloadBytes(`${fileName}.pdf`, result.bytes, 'application/pdf')
          return {
            status: 'downloaded',
            inPlace: true,
            redacted: result.applied,
            skipped: result.skipped,
            flattened: result.flattened,
            autoFlatten: result.flattened && !flatten,
          }
        }

        // pdf-lib + fontkit are heavy: load them only when a PDF is exported.
        const { buildPdfDocument } = await import('./pdfExport')
        const bytes = await buildPdfDocument({
          text,
          title,
          subtitle: subtitle ?? new Date().toLocaleString(locale),
          footer: 'NullLM · local sandbox',
          fontBytes: await loadPdfFont(),
        })
        downloadBytes(`${fileName}.pdf`, bytes, 'application/pdf')
        return { status: 'downloaded', regenerated: sourceFormat === 'pdf' }
      }
      default:
        return { status: 'failed' }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('[nulllm] export failed', error)
    return { status: 'failed' }
  }
}
