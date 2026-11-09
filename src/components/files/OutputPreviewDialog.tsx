import { useEffect, useMemo, useState } from 'react'
import { Crop, Download, Loader2, ScanLine, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PdfViewer } from '@/components/files/PdfViewer'
import { useI18n } from '@/hooks/useI18n'
import { buildRedactionEdits } from '@/lib/files/redactionEdits'
import { getSourceFile } from '@/lib/files/sourceCache'
import { CATEGORY_TOKEN_PAPER } from '@/lib/tokenStyles'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/store/useSessionStore'

interface OutputPreviewDialogProps {
  open: boolean
  onClose: () => void
  onExport: () => void
  exporting: boolean
  exportLabel: string
}

type ViewMode = 'document' | 'text'

/**
 * Preview of the anonymized document as it will be exported. When the source
 * was a PDF, this renders the real (redacted) PDF file instead of an
 * approximation, so the export can be checked before downloading it.
 */
export function OutputPreviewDialog({
  open,
  onClose,
  onExport,
  exporting,
  exportLabel,
}: OutputPreviewDialogProps) {
  const { t, locale } = useI18n()
  const segments = useSessionStore((state) => state.segments)
  const records = useSessionStore((state) => state.records)
  const stats = useSessionStore((state) => state.stats)

  const source = open ? getSourceFile() : null
  const canPreviewDocument = source?.format === 'pdf'

  const manualRedactions = useSessionStore((state) => state.manualRedactions)
  const addManualRedaction = useSessionStore((state) => state.addManualRedaction)
  const removeManualRedaction = useSessionStore((state) => state.removeManualRedaction)
  const clearManualRedactions = useSessionStore((state) => state.clearManualRedactions)

  const edits = useMemo(() => buildRedactionEdits(segments, records), [segments, records])
  const [mode, setMode] = useState<ViewMode>('text')
  const [preview, setPreview] = useState<ArrayBuffer | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [flattened, setFlattened] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [pageInfo, setPageInfo] = useState<{ page: number; width: number; height: number } | null>(
    null,
  )

  useEffect(() => {
    if (!open) return
    setMode(canPreviewDocument ? 'document' : 'text')
    setSelecting(false)
  }, [open, canPreviewDocument])

  useEffect(() => {
    if (!open || !source) {
      setPreview(null)
      setPreparing(false)
      return
    }

    let cancelled = false
    setPreview(null)
    setPreparing(true)

    void (async () => {
      try {
        const { buildRedactedPdf } = await import('@/lib/files/redactedPdf')
        const result = await buildRedactedPdf(source.bytes, edits)
        if (cancelled) return

        const copy = new Uint8Array(result.bytes.byteLength)
        copy.set(result.bytes)
        setPreview(copy.buffer)
        setFlattened(result.flattened)
      } catch {
        if (import.meta.env.DEV) console.warn('[nulllm] preview build failed')
        if (!cancelled) setPreview(null)
      } finally {
        if (!cancelled) setPreparing(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, source, edits])

  const showDocument = mode === 'document' && canPreviewDocument

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2.5rem)] max-w-[1080px] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t('output.previewTitle')}</DialogTitle>
          <DialogDescription>{t('output.previewDescription')}</DialogDescription>
        </DialogHeader>

        {canPreviewDocument && (
          <div className="mt-4 flex items-center gap-1 rounded-lg bg-secondary/70 p-1">
            {(['document', 'text'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors',
                  mode === value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {value === 'document' ? t('files.documentTab') : t('files.textTab')}
              </button>
            ))}
          </div>
        )}

        {canPreviewDocument && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={selecting ? 'default' : 'outline'}
              onClick={() => setSelecting((value) => !value)}
            >
              <Crop className="size-3.5" />
              {t('output.selectArea')}
            </Button>
            {pageInfo && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  addManualRedaction({
                    page: pageInfo.page,
                    x: 0,
                    y: 0,
                    width: pageInfo.width,
                    height: pageInfo.height,
                  })
                }
              >
                <Square className="size-3.5" />
                {t('output.redactPage')}
              </Button>
            )}
            {manualRedactions.length > 0 && (
              <>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {t('output.manualCount', { count: manualRedactions.length })}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const last = manualRedactions[manualRedactions.length - 1]
                    if (last) removeManualRedaction(last.id)
                  }}
                >
                  {t('output.undoArea')}
                </Button>
                <Button size="sm" variant="ghost" onClick={clearManualRedactions}>
                  {t('output.clearAreas')}
                </Button>
              </>
            )}
          </div>
        )}

        {showDocument && selecting && (
          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-primary">
            <Crop className="mt-px size-3 shrink-0" />
            {t('output.selectingHint')}
          </p>
        )}

        <div className="mt-3 h-[min(68vh,620px)] overflow-hidden rounded-xl border border-border/70 bg-secondary/50">
          {showDocument ? (
            preparing || !preview ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-[12px] text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {t('files.rendering')}
              </div>
            ) : (
              <PdfViewer
                data={preview}
                redactions={manualRedactions}
                selecting={selecting}
                onSelect={addManualRedaction}
                onPageChange={setPageInfo}
              />
            )
          ) : (
            <div className="h-full overflow-auto p-4 scrollbar-thin">
              <div className="mx-auto w-full max-w-[660px] rounded-md bg-white px-10 py-12 shadow-[0_2px_20px_rgba(16,24,40,0.16)]">
                <h2 className="mb-1 text-[18px] font-semibold leading-tight tracking-[-0.01em] text-neutral-900">
                  {t('output.title')}
                </h2>
                <p className="mb-7 border-b border-neutral-200 pb-3 text-[10px] text-neutral-500">
                  NullLM · {new Date().toLocaleString(locale)}
                  {stats
                    ? ` · ${t('output.stats', { count: stats.matches, words: stats.processedWords })}`
                    : ''}
                </p>

                <div className="whitespace-pre-wrap break-words text-[12px] leading-[1.75] text-neutral-800">
                  {segments.map((segment, index) =>
                    segment.kind === 'token' ? (
                      <mark
                        key={`${segment.text}-${index}`}
                        className={cn(
                          'mx-[1px] inline-block rounded px-1 py-[1px] font-mono text-[0.85em] font-semibold',
                          CATEGORY_TOKEN_PAPER[segment.category ?? 'custom'],
                        )}
                      >
                        {segment.text}
                      </mark>
                    ) : (
                      <span key={`text-${index}`}>{segment.text}</span>
                    ),
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {showDocument && (
          <p className="mt-2 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-muted-foreground">
            <ScanLine className="mt-px size-3 shrink-0" />
            <span>
              {t('output.previewDocumentHint')}
              {flattened && ` ${t('output.previewFlattened')}`}
            </span>
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t('common.close')}
          </Button>
          <Button onClick={onExport} disabled={exporting}>
            <Download className="size-4" />
            {exporting ? t('export.generating') : exportLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
