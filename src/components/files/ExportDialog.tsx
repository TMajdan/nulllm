import { useEffect, useState } from 'react'
import { FileCode, FileText, FileType, Loader2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useI18n } from '@/hooks/useI18n'
import { exportDocument } from '@/lib/files/export'
import type { ExportFormat } from '@/lib/files/types'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/store/useUiStore'

const FORMATS: Array<{
  id: ExportFormat
  icon: typeof FileText
  labelKey: string
  hintKey?: string
}> = [
  { id: 'txt', icon: FileText, labelKey: 'export.txt' },
  { id: 'md', icon: FileCode, labelKey: 'export.md' },
  { id: 'docx', icon: FileType, labelKey: 'export.docx' },
  { id: 'pdf', icon: Printer, labelKey: 'export.pdf', hintKey: 'export.pdfHint' },
]

export function ExportDialog() {
  const payload = useUiStore((state) => state.exportPayload)
  const close = useUiStore((state) => state.closeExport)
  const { t, locale } = useI18n()

  const [format, setFormat] = useState<ExportFormat>('txt')
  const [exporting, setExporting] = useState(false)
  const [flatten, setFlatten] = useState(false)

  useEffect(() => {
    if (payload) {
      setFormat(payload.preferred)
      setFlatten(false)
    }
  }, [payload])

  async function handleExport() {
    if (!payload) return

    setExporting(true)
    const result = await exportDocument({
      format,
      text: payload.text,
      title: payload.title,
      fileName: payload.baseName,
      locale,
      edits: payload.edits,
      sourceFormat: payload.sourceFormat,
      flatten: format === 'pdf' && flatten,
      manualRedactions: payload.manualRedactions,
    })
    setExporting(false)

    if (result.status === 'failed') {
      toast.error(t('export.failed'))
      return
    }

    if (result.inPlace && result.redacted) {
      toast.success(t('export.inPlaceDone', { count: result.redacted }))
    } else {
      toast.success(t('export.done'))
    }

    if (result.skipped) {
      toast.warning(t('export.redactSkipped', { count: result.skipped }))
    }

    if (result.regenerated) {
      toast.info(t('export.sourceGone'))
    }

    if (result.autoFlatten) {
      toast.info(t('export.autoFlatten'))
    }

    close()
  }

  const activeHint = FORMATS.find((item) => item.id === format)?.hintKey

  return (
    <Dialog
      open={payload !== null}
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('export.title')}</DialogTitle>
          <DialogDescription>{t('export.description')}</DialogDescription>
        </DialogHeader>

        <div className="mt-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('export.title')}>
          {FORMATS.map((item) => {
            const Icon = item.icon
            const active = format === item.id
            const isPreferred = payload?.preferred === item.id

            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setFormat(item.id)}
                className={cn(
                  'relative flex flex-col items-start gap-1.5 rounded-xl border px-3 py-3 text-left transition-colors',
                  active
                    ? 'border-primary/50 bg-primary/[0.06]'
                    : 'border-border/80 hover:bg-secondary/60',
                )}
              >
                <Icon className={cn('size-4', active ? 'text-primary' : 'text-muted-foreground')} />
                <span className="text-[12.5px] font-medium">{t(item.labelKey)}</span>
                {isPreferred && (
                  <Badge variant="secondary" className="absolute right-2 top-2">
                    {t('export.sameAsSource')}
                  </Badge>
                )}
              </button>
            )
          })}
        </div>

        {activeHint && (
          <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
            {t(activeHint)}
          </p>
        )}

        {format === 'pdf' && payload?.sourceFormat === 'pdf' && (
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/80 px-3 py-2.5 transition-colors hover:bg-secondary/50">
            <input
              type="checkbox"
              checked={flatten}
              onChange={(event) => setFlatten(event.target.checked)}
              className="mt-0.5 size-3.5 shrink-0 accent-primary"
            />
            <span className="space-y-0.5">
              <span className="block text-[12px] font-medium">{t('export.flattenLabel')}</span>
              <span className="block text-[11px] leading-relaxed text-muted-foreground">
                {t('export.flattenHint')}
              </span>
            </span>
          </label>
        )}

        {format === 'docx' && payload?.sourceFormat === 'pdf' && (
          <p className="mt-3 rounded-xl border border-border/80 bg-secondary/40 px-3 py-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
            {t('export.docxHint')}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleExport} disabled={!payload?.text.trim() || exporting}>
            {exporting && <Loader2 className="size-4 animate-spin" />}
            {exporting ? t('export.generating') : t('export.export')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
