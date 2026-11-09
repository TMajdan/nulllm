import { useEffect, useState } from 'react'
import { FileText, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Notice } from '@/components/ui/notice'
import { DocxViewer } from '@/components/files/DocxViewer'
import { PdfViewer } from '@/components/files/PdfViewer'
import { useI18n } from '@/hooks/useI18n'
import { formatBytes, type ParsedDocument } from '@/lib/files/types'
import { cn } from '@/lib/utils'

export interface PendingDocument {
  parsed: ParsedDocument
  bytes: ArrayBuffer
}

interface FilePreviewDialogProps {
  document: PendingDocument | null
  onConfirm: (document: PendingDocument) => void
  onCancel: () => void
}

type ViewMode = 'document' | 'text'

function DocumentView({ doc }: { doc: PendingDocument }) {
  const { parsed, bytes } = doc

  if (parsed.format === 'pdf') return <PdfViewer data={bytes} />
  if (parsed.format === 'docx') return <DocxViewer data={bytes} />

  return (
    <div className="h-full overflow-auto bg-secondary/40 p-4 scrollbar-thin">
      <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-[1.7]">
        {parsed.text || '—'}
      </pre>
    </div>
  )
}

export function FilePreviewDialog({ document, onConfirm, onCancel }: FilePreviewDialogProps) {
  const { t, locale } = useI18n()
  const [view, setView] = useState<ViewMode>('document')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setView('document')
    setExpanded(false)
  }, [document])

  const parsed = document?.parsed

  const stats = parsed
    ? [
        { label: t('files.format'), value: parsed.format.toUpperCase() },
        { label: t('files.size'), value: formatBytes(parsed.size) },
        { label: t('files.words'), value: parsed.wordCount.toLocaleString(locale) },
        parsed.pages !== undefined
          ? { label: t('files.pages'), value: parsed.pages.toLocaleString(locale) }
          : null,
        parsed.paragraphs !== undefined
          ? { label: t('files.paragraphs'), value: parsed.paragraphs.toLocaleString(locale) }
          : null,
      ].filter((item): item is { label: string; value: string } => item !== null)
    : []

  return (
    <Dialog
      open={document !== null}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <DialogContent
        className={cn(
          'max-h-[calc(100vh-2rem)] overflow-hidden transition-[max-width,width] duration-200',
          expanded
            ? 'w-[calc(100vw-1.5rem)] max-w-[1480px]'
            : 'w-[calc(100vw-2.5rem)] max-w-[1100px]',
        )}
      >
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <FileText className="size-4" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-muted-foreground">
              {parsed?.fileName}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setExpanded((value) => !value)}
              title={expanded ? t('files.collapse') : t('files.expand')}
              aria-label={expanded ? t('files.collapse') : t('files.expand')}
              className="mr-5 shrink-0 text-muted-foreground hover:text-foreground"
            >
              {expanded ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </Button>
          </div>
          <DialogTitle>{t('files.title')}</DialogTitle>
          <DialogDescription>{t('files.subtitle')}</DialogDescription>
        </DialogHeader>

        {document && parsed && (
          <div className="mt-3 space-y-3">
            <dl className="flex flex-wrap gap-1.5">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="flex items-baseline gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11.5px]"
                >
                  <dt className="text-muted-foreground">{item.label}</dt>
                  <dd className="font-medium tabular-nums">{item.value}</dd>
                </div>
              ))}
            </dl>

            {parsed.warnings.map((warning) => (
              <Notice key={warning} tone="warning">
                {t(warning)}
              </Notice>
            ))}

            <div className="flex items-center gap-1 rounded-lg bg-secondary/70 p-1">
              {(['document', 'text'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  aria-pressed={view === mode}
                  className={cn(
                    'flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors',
                    view === mode
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {mode === 'document' ? t('files.documentTab') : t('files.textTab')}
                </button>
              ))}
            </div>

            <div
              className={cn(
                'overflow-hidden rounded-xl border border-border/70',
                expanded
                  ? 'h-[calc(100vh-360px)] min-h-[280px]'
                  : 'h-[min(62vh,600px)]',
              )}
            >
              {view === 'document' ? (
                <DocumentView doc={document} />
              ) : (
                <div className="h-full overflow-auto bg-secondary/40 p-4 scrollbar-thin">
                  <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-[1.75]">
                    {parsed.text || '—'}
                  </pre>
                </div>
              )}
            </div>

            {(parsed.format === 'pdf' || parsed.format === 'docx') && (
              <p className="text-[10.5px] text-muted-foreground">{t('files.viewerHint')}</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => document && onConfirm(document)}>{t('files.insert')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
