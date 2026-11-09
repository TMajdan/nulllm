import { useMemo, useState } from 'react'
import {
  ChevronDown,
  Copy,
  Download,
  Eye,
  Loader2,
  Lock,
  ScanLine,
  ShieldCheck,
} from 'lucide-react'
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
import { OutputPreviewDialog } from '@/components/files/OutputPreviewDialog'
import { TokenHighlight } from '@/components/workflow/TokenHighlight'
import { ruleText, useI18n } from '@/hooks/useI18n'
import { copyToClipboard } from '@/lib/clipboard'
import { timestampSlug } from '@/lib/download'
import { exportDocument } from '@/lib/files/export'
import { buildRedactionEdits } from '@/lib/files/redactionEdits'
import { preferredExportFormat, stripExtension, type ExportFormat } from '@/lib/files/types'
import { useIsPro } from '@/store/useLicenseStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useUiStore } from '@/store/useUiStore'

export function AnonymizedPanel() {
  const segments = useSessionStore((state) => state.segments)
  const records = useSessionStore((state) => state.records)
  const anonymizedText = useSessionStore((state) => state.anonymizedText)
  const stats = useSessionStore((state) => state.stats)
  const sourceDoc = useSessionStore((state) => state.sourceDoc)
  const manualRedactions = useSessionStore((state) => state.manualRedactions)
  const showAllRegions = useSessionStore((state) => state.showAllRegions)
  const setShowAllRegions = useSessionStore((state) => state.setShowAllRegions)
  const runAnonymize = useSessionStore((state) => state.runAnonymize)
  const isPro = useIsPro()
  const openLicenseModal = useUiStore((state) => state.openLicenseModal)
  const openExport = useUiStore((state) => state.openExport)
  const { t, locale } = useI18n()

  const [previewOpen, setPreviewOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const uniqueTokens = useMemo(() => {
    const tokens = new Set<string>()
    for (const segment of segments) {
      if (segment.kind === 'token') tokens.add(segment.text)
    }
    return tokens.size
  }, [segments])

  // Spans of the source document that must be painted over on export.
  const edits = useMemo(() => buildRedactionEdits(segments, records), [segments, records])

  const locked = stats?.lockedFindings ?? []
  const tierFindings = locked.filter((finding) => finding.reason === 'tier')
  const regionFindings = locked.filter((finding) => finding.reason === 'region')
  const tierTotal = tierFindings.reduce((sum, finding) => sum + finding.count, 0)
  const regionTotal = regionFindings.reduce((sum, finding) => sum + finding.count, 0)
  const lockedTotal = tierTotal + regionTotal
  const hasOutput = anonymizedText.length > 0

  const directFormat = preferredExportFormat(sourceDoc?.format)
  const baseName = sourceDoc
    ? `${stripExtension(sourceDoc.fileName)}-anonymized`
    : `nulllm-prompt-${timestampSlug()}`
  const directLabel = t('export.directTooltip', { format: directFormat.toUpperCase() })

  async function copyNow() {
    const ok = await copyToClipboard(anonymizedText)
    if (ok) toast.success(t('output.copySuccess'))
    else toast.error(t('output.copyFailed'))
  }

  function handleCopy() {
    if (!hasOutput) return

    if (lockedTotal > 0) {
      toast.warning(t('output.copyWarnTitle'), {
        description: locked
          .slice(0, 3)
          .map((finding) => ruleText(t, finding.ruleId, 'label', finding.ruleLabel))
          .join(', '),
        duration: 10000,
        action: {
          label: t('output.copyAnyway'),
          onClick: () => {
            void copyNow()
          },
        },
      })
      return
    }

    void copyNow()
  }

  async function runExport(format: ExportFormat) {
    if (!hasOutput) return

    setExporting(true)
    const result = await exportDocument({
      format,
      text: anonymizedText,
      title: t('output.title'),
      fileName: baseName,
      locale,
      edits,
      sourceFormat: sourceDoc?.format,
      manualRedactions,
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
  }

  function handleExportDirect() {
    void runExport(directFormat)
  }

  function handleShowAllRegions() {
    setShowAllRegions(true)
    runAnonymize(isPro)
  }

  function handleExportOptions() {
    if (!hasOutput) return
    openExport({
      text: anonymizedText,
      title: t('output.title'),
      baseName,
      preferred: directFormat,
      edits,
      sourceFormat: sourceDoc?.format,
      manualRedactions,
    })
  }

  return (
    <>
      <Card className="min-w-0">
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-muted-foreground">
              2
            </span>
            <div className="space-y-0.5">
              <CardTitle>{t('output.title')}</CardTitle>
              <CardDescription>{t('output.description')}</CardDescription>
            </div>
          </div>
          {uniqueTokens > 0 ? (
            <Badge variant="secondary" className="mt-0.5 tabular-nums">
              {t('output.tokenCount', { count: uniqueTokens })}
            </Badge>
          ) : null}
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {tierTotal > 0 && (
            <Notice
              tone="danger"
              title={t('output.lockedTitle', { count: tierTotal })}
              action={
                !isPro ? (
                  <Button size="sm" onClick={openLicenseModal}>
                    <Lock className="size-3.5" />
                    {t('output.unlock')}
                  </Button>
                ) : undefined
              }
            >
              <p>{t('output.lockedBody')}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tierFindings.map((finding) => (
                  <span
                    key={finding.ruleId}
                    className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:text-red-300"
                  >
                    {ruleText(t, finding.ruleId, 'label', finding.ruleLabel)}
                    <span className="ml-1 tabular-nums opacity-70">
                      ×{finding.count.toLocaleString(locale)}
                    </span>
                  </span>
                ))}
              </div>
            </Notice>
          )}

          {regionTotal > 0 && (
            <Notice
              tone="warning"
              title={t('output.regionTitle', { count: regionTotal })}
              action={
                !showAllRegions ? (
                  <Button size="sm" variant="outline" onClick={handleShowAllRegions}>
                    {t('output.regionCta')}
                  </Button>
                ) : undefined
              }
            >
              <p>{t('output.regionBody')}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {regionFindings.map((finding) => (
                  <span
                    key={finding.ruleId}
                    className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300"
                  >
                    {ruleText(t, finding.ruleId, 'label', finding.ruleLabel)}
                    <span className="ml-1 tabular-nums opacity-70">
                      ×{finding.count.toLocaleString(locale)}
                    </span>
                  </span>
                ))}
              </div>
            </Notice>
          )}

          {stats?.truncated && (
            <Notice
              tone="warning"
              title={t('output.truncatedTitle', {
                kept: stats.processedWords,
                total: stats.totalWords,
              })}
            >
              {t('output.truncatedBody')}
            </Notice>
          )}

          {hasOutput ? (
            <div className="h-[300px] overflow-auto rounded-xl border border-border/70 bg-secondary/35 p-3.5 scrollbar-thin lg:h-[336px]">
              <TokenHighlight segments={segments} />
            </div>
          ) : (
            <div className="flex h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-border/60 bg-secondary/35 px-6 text-center lg:h-[336px]">
              <div className="grid size-10 place-items-center rounded-full bg-card text-muted-foreground shadow-sm">
                <ScanLine className="size-[18px]" />
              </div>
              <div className="space-y-1">
                <p className="text-[13.5px] font-medium">{t('output.emptyTitle')}</p>
                <p className="mx-auto max-w-[30ch] text-[12px] leading-relaxed text-muted-foreground">
                  {t('output.emptyBody')}
                </p>
              </div>
            </div>
          )}

          {hasOutput && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {lockedTotal === 0 ? (
                <>
                  <ShieldCheck className="size-3.5 text-emerald-500" />
                  {t('output.noIssues')}
                </>
              ) : (
                <>
                  <Lock className="size-3.5 text-red-500" />
                  {t('output.risky')}
                </>
              )}
              {stats && (
                <span className="ml-auto tabular-nums">
                  {t('output.stats', {
                    count: stats.matches,
                    words: stats.processedWords.toLocaleString(locale),
                  })}
                </span>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="gap-2">
          <Button onClick={handleCopy} disabled={!hasOutput} className="flex-1">
            <Copy className="size-4" />
            {t('output.copy')}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setPreviewOpen(true)}
            disabled={!hasOutput}
            title={t('output.previewTitle')}
            aria-label={t('output.previewTitle')}
          >
            <Eye className="size-4" />
          </Button>

          <div className="flex items-stretch">
            <Button
              variant="outline"
              size="icon"
              onClick={handleExportDirect}
              disabled={!hasOutput || exporting}
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
              disabled={!hasOutput}
              title={t('export.moreFormats')}
              aria-label={t('export.moreFormats')}
              className="w-6 rounded-l-none border-l-0"
            >
              <ChevronDown className="size-3" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      <OutputPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onExport={() => {
          setPreviewOpen(false)
          handleExportDirect()
        }}
        exporting={exporting}
        exportLabel={directLabel}
      />
    </>
  )
}
