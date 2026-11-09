import { strToU8, zipSync } from 'fflate'
import type { RenderedPage } from './pdfRender'

/**
 * Builds a Word document where every page is the rendered page image, sized
 * exactly like the source page and with zero margins. The result looks
 * identical to the PDF (no re-flowing, no lost tables or graphics).
 */

const EMU_PER_PT = 12700
const TWIPS_PER_PT = 20

const NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const NS_WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const NS_PIC = 'http://schemas.openxmlformats.org/drawingml/2006/picture'
const NS_REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
const NS_IMAGE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image'

function paragraphXml(
  index: number,
  relId: string,
  fileName: string,
  cx: number,
  cy: number,
): string {
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="0" w:right="0" w:firstLine="0"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${index}" name="Page ${index}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="${NS_PIC}"><pic:pic><pic:nvPicPr><pic:cNvPr id="${index}" name="${fileName}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`
}

export function buildDocxFromImages(pages: RenderedPage[]): Uint8Array {
  if (pages.length === 0) throw new Error('No pages to export')

  const pageWidth = Math.max(...pages.map((page) => page.width))
  const pageHeight = Math.max(...pages.map((page) => page.height))

  const media: Record<string, Uint8Array> = {}
  const relationships: string[] = []
  const paragraphs: string[] = []

  pages.forEach((page, index) => {
    const fileName = `page${index + 1}.${page.ext}`
    const relId = `rIdImg${index + 1}`

    media[`word/media/${fileName}`] = page.bytes
    relationships.push(
      `<Relationship Id="${relId}" Type="${NS_IMAGE}" Target="media/${fileName}"/>`,
    )

    const scale = pageWidth / page.width
    const cx = Math.round(page.width * scale * EMU_PER_PT)
    const cy = Math.round(page.height * scale * EMU_PER_PT)

    paragraphs.push(paragraphXml(index + 1, relId, fileName, cx, cy))
  })

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="jpg" ContentType="image/jpeg"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${NS_REL}">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

  const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${NS_REL}">
${relationships.join('\n')}
</Relationships>`

  const section = `<w:sectPr><w:pgSz w:w="${Math.round(pageWidth * TWIPS_PER_PT)}" w:h="${Math.round(
    pageHeight * TWIPS_PER_PT,
  )}"/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>`

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${NS_W}" xmlns:r="${NS_R}" xmlns:wp="${NS_WP}" xmlns:a="${NS_A}" xmlns:pic="${NS_PIC}">
<w:body>
${paragraphs.join('\n')}
${section}
</w:body>
</w:document>`

  return zipSync(
    {
      '[Content_Types].xml': strToU8(contentTypes),
      '_rels/.rels': strToU8(rootRels),
      'word/document.xml': strToU8(document),
      'word/_rels/document.xml.rels': strToU8(documentRels),
      ...media,
    },
    { level: 6 },
  )
}
