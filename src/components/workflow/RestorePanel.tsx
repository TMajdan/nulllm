import { useState } from 'react'
import { ChevronDown, CircleCheck, Copy, Download, Loader2, Lock, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Notice } from '@/components/ui/notice'
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/hooks/useI18n'
import type { RestoreReport } from '@/anonymizer/types'
import { copyToClipboard } from '@/lib/clipboard'
import { timestampSlug } from '@/lib/download'
import { exportDocument } from '@/lib/files/export'
import { preferredExportFormat, stripExtension, type ExportFormat } from '@/lib/files/types'
import { useIsPro } from '@/store/useLicenseStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useUiStore } from '@/store/useUiStore'

export function RestorePanel() {
  const response = useSessionStore((state) => state.response)
  const setResponse = useSessionStore((state) => state.setResponse)
  const clearResponse = useSessionStore((state) => state.clearResponse)
  const restoredText = useSessionStore((state) => state.restoredText)
  const report = useSessionStore((state) => state.restoreReport)
  const recordCount = useSessionStore((state) => state.records.length)
  const sourceDoc = useSessionStore((state) => state.sourceDoc)
  const runRestore = useSessionStore((state) => state.runRestore)

  const isPro = useIsPro()
  const openLicenseModal = useUiStore((state) => state.openLicenseModal)
  const openExport = useUiStore((state) => state.openExport)
  const { t, locale } = useI18n()

  const [exporting, setExporting] = useState(false)

  const directFormat = preferredExportFormat(sourceDoc?.format)
  const baseName = sourceDoc
    ? `${stripExtension(sourceDoc.fileName)}-restored`
    : `nulllm-restored-${timestampSlug()}`
  const directLabel = t('export.directTooltip', { format: directFormat.toUpperCase() })

  function handleRestore() {
    if (!response.trim()) {
      toast.error(t('restore.needResponse'))
      return
    }

    const result = runRestore()
    if (!result) return

    if (result.noRecords) {
      toast.warning(t('restore.noRecords'))
    } else if (result.restoredCount === 0) {
      toast.warning(t('restore.noMatch'))
    } else {
      toast.success(t('restore.restored', { count: result.restoredCount }))
    }
  }

  async function handleCopy() {
    if (!restoredText) return
    const ok = await copyToClipboard(restoredText)
    if (ok) toast.success(t('restore.copySuccess'))
    else toast.error(t('restore.copyFailed'))
  }

  async function runExport(format: ExportFormat) {
    if (!restoredText) return

    setExporting(true)
    const result = await exportDocument({
      format,
      text: restoredText,
      title: t('restore.previewLabel'),
      fileName: baseName,
      locale,
      sourceFormat: sourceDoc?.format,
    })
    setExporting(false)

    if (result.status === 'downloaded') toast.success(t('export.done'))
    else toast.error(t('export.failed'))
  }

  function handleExportOptions() {
    if (!restoredText) return
    openExport({
      text: restoredText,
      title: t('restore.previewLabel'),
      baseName,
      preferred: directFormat,
      sourceFormat: sourceDoc?.format,
    })
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-muted-foreground">
            3
          </span>
          <div className="space-y-0.5">
            <CardTitle>{t('restore.title')}</CardTitle>
            <CardDescription>{t('restore.description')}</CardDescription>
          </div>
        </div>
        <Badge variant="secondary" className="mt-0.5 tabular-nums">
          {t('restore.mappingCount', { count: recordCount })}
        </Badge>
      </CardHeader>

      <CardContent>
        <div className="grid items-start gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-muted-foreground">{t('restore.responseLabel')}</p>
            <Textarea
              value={response}
              onChange={(event) => setResponse(event.target.value)}
              spellCheck={false}
              placeholder={t('restore.placeholder')}
              className="h-[168px] bg-secondary/40 font-mono text-[12.5px] leading-[1.7]"
              aria-label={t('restore.responseLabel')}
            />

            <div className="flex items-center gap-2">
              <Button
                onClick={handleRestore}
                disabled={!response.trim() || recordCount === 0}
                className="flex-1"
              >
                <RotateCcw className="size-4" />
                {t('restore.restore')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  clearResponse()
                  toast.success(t('restore.clearDone'))
                }}
                disabled={!response && !restoredText}
                className="text-muted-foreground hover:text-foreground"
              >
                {t('common.clear')}
              </Button>
            </div>

            {!isPro && (
              <p className="flex items-start gap-1.5 pt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                <Lock className="mt-px size-3 shrink-0" />
                <span>
                  {t('restore.freeNote')}{' '}
                  <button
                    type="button"
                    onClick={openLicenseModal}
                    className="font-medium text-foreground underline-offset-2 hover:underline"
                  >
                    {t('restore.freeNoteCta')}
                  </button>{' '}
                  {t('restore.freeNoteRest')}
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">{t('restore.previewLabel')}</p>
              {restoredText && (
                <span className="text-[10.5px] tabular-nums text-muted-foreground">
                  {restoredText.length.toLocaleString(locale)} {t('common.characters')}
                </span>
              )}
            </div>
            <div className="h-[168px] overflow-auto rounded-xl border border-border/70 bg-secondary/35 p-3 scrollbar-thin">
              {restoredText ? (
                <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-[1.75]">
                  {restoredText}
                </pre>
              ) : (
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  {t('restore.previewPlaceholder')}
                </p>
              )}
            </div>
            {report && <RestoreWarnings report={report} />}
          </div>
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        <Button variant="outline" onClick={handleCopy} disabled={!restoredText} className="flex-1">
          <Copy className="size-4" />
          {t('restore.copy')}
        </Button>

        <div className="flex items-stretch">
          <Button
            variant="outline"
            size="icon"
            onClick={() => void runExport(directFormat)}
            disabled={!restoredText || exporting}
            title={directLabel}
            aria-label={directLabel}
            className="rounded-r-none"
          >
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleExportOptions}
            disabled={!restoredText}
            title={t('export.moreFormats')}
            aria-label={t('export.moreFormats')}
            className="w-6 rounded-l-none border-l-0"
          >
            <ChevronDown className="size-3" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

function RestoreWarnings({ report }: { report: RestoreReport }) {
  const { t } = useI18n()
  const nothingRestored = !report.noRecords && report.restoredCount === 0
  const hasIssues =
    report.noRecords ||
    nothingRestored ||
    report.unknownTokens.length > 0 ||
    report.missingTokens.length > 0

  if (!hasIssues) {
    return (
      <Notice tone="success" icon={CircleCheck}>
        {t('restore.successNotice', {
          count: report.restoredCount,
          fuzzy: report.fuzzyCount > 0 ? t('restore.fuzzyPart', { count: report.fuzzyCount }) : '',
        })}
      </Notice>
    )
  }

  return (
    <div className="space-y-2">
      {report.noRecords && <Notice tone="warning">{t('restore.noRecordsNotice')}</Notice>}

      {nothingRestored && !report.noRecords && (
        <Notice tone="warning">{t('restore.noMatchNotice')}</Notice>
      )}

      {report.unknownTokens.length > 0 && (
        <Notice tone="warning" title={t('restore.unknownTitle')}>
          <span className="font-mono text-[11.5px]">
            {report.unknownTokens.slice(0, 6).join(', ')}
          </span>
          {report.unknownTokens.length > 6 && ` +${report.unknownTokens.length - 6}`}.{' '}
          {t('restore.unknownBody')}
        </Notice>
      )}

      {report.missingTokens.length > 0 && (
        <Notice tone="neutral">
          {t('restore.missingInfo', { count: report.missingTokens.length })}
        </Notice>
      )}
    </div>
  )
}
