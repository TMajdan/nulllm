import { useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react'
import { Eye, FileUp, Loader2, Sparkles, Trash2, Wand2 } from 'lucide-react'
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
import { FilePreviewDialog, type PendingDocument } from '@/components/files/FilePreviewDialog'
import { useI18n } from '@/hooks/useI18n'
import { FREE_WORD_LIMIT, MAX_FILE_BYTES, SUPPORTED_FILE_TYPES } from '@/lib/constants'
import { FileParseError, parseBuffer } from '@/lib/files/parse'
import { clearSourceFile, setSourceFile } from '@/lib/files/sourceCache'
import { formatBytes } from '@/lib/files/types'
import { SAMPLE_TEXT } from '@/lib/sample'
import { countChars, countWords } from '@/lib/text'
import { cn } from '@/lib/utils'
import { useIsPro } from '@/store/useLicenseStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useUiStore } from '@/store/useUiStore'

export function InputPanel() {
  const input = useSessionStore((state) => state.input)
  const setInput = useSessionStore((state) => state.setInput)
  const clearInput = useSessionStore((state) => state.clearInput)
  const runAnonymize = useSessionStore((state) => state.runAnonymize)
  const lastProcessedInput = useSessionStore((state) => state.lastProcessedInput)
  const anonymizedText = useSessionStore((state) => state.anonymizedText)
  const sourceDoc = useSessionStore((state) => state.sourceDoc)
  const setSourceDoc = useSessionStore((state) => state.setSourceDoc)
  const clearManualRedactions = useSessionStore((state) => state.clearManualRedactions)

  const isPro = useIsPro()
  const openLicenseModal = useUiStore((state) => state.openLicenseModal)
  const { t, locale } = useI18n()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [pending, setPending] = useState<PendingDocument | null>(null)
  const [lastDocument, setLastDocument] = useState<PendingDocument | null>(null)

  const words = countWords(input)
  const overLimit = !isPro && words > FREE_WORD_LIMIT
  const stale = anonymizedText.length > 0 && input !== lastProcessedInput

  async function readFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      toast.error(t('input.fileTooLarge', { limit: formatBytes(MAX_FILE_BYTES) }))
      return
    }

    setParsing(true)
    try {
      const buffer = await file.arrayBuffer()
      const parsed = await parseBuffer({
        buffer,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      })
      setPending({ parsed, bytes: buffer })
    } catch (error) {
      if (error instanceof FileParseError) {
        toast.error(t(error.messageKey, { reason: error.reason ?? '' }))
      } else {
        toast.error(t('input.fileError'))
      }
    } finally {
      setParsing(false)
    }
  }

  function confirmImport(doc: PendingDocument) {
    setInput(doc.parsed.text)
    setSourceDoc({
      fileName: doc.parsed.fileName,
      format: doc.parsed.format,
      size: doc.parsed.size,
      pages: doc.parsed.pages,
      paragraphs: doc.parsed.paragraphs,
    })
    // Keep the raw bytes in memory only, so the export can redact the
    // original document instead of rebuilding it from scratch.
    setSourceFile({
      fileName: doc.parsed.fileName,
      format: doc.parsed.format,
      bytes: doc.bytes,
    })
    clearManualRedactions()
    setLastDocument(doc)
    setPending(null)
    toast.success(t('input.fileLoaded', { name: doc.parsed.fileName }))
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) void readFile(file)
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void readFile(file)
  }

  function handleAnonymize() {
    if (!input.trim()) {
      toast.error(t('input.needText'))
      return
    }

    const stats = runAnonymize(isPro)
    if (!stats) return

    if (stats.matches === 0) {
      toast.warning(t('input.noMatches'))
    } else {
      toast.success(t('input.masked', { count: stats.matches, newTokens: stats.newTokens }))
    }

    if (stats.lockedFindings.length > 0) {
      const total = stats.lockedFindings.reduce((sum, finding) => sum + finding.count, 0)
      toast.warning(t('input.lockedToast', { count: total }))
    }

    if (stats.truncated) {
      toast.info(t('input.truncatedToast', { kept: stats.processedWords, total: stats.totalWords }))
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      handleAnonymize()
    }
  }

  return (
    <>
      <Card className="min-w-0">
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-muted-foreground">
              1
            </span>
            <div className="space-y-0.5">
              <CardTitle>{t('input.title')}</CardTitle>
              <CardDescription>{t('input.description')}</CardDescription>
            </div>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[11px] tabular-nums',
              overLimit
                ? 'bg-red-500/10 font-medium text-red-600 dark:text-red-300'
                : 'bg-secondary text-muted-foreground',
            )}
          >
            {words.toLocaleString(locale)}
            {!isPro && ` / ${FREE_WORD_LIMIT}`}
          </span>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept={SUPPORTED_FILE_TYPES}
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={parsing}
              className="-ml-2 text-muted-foreground hover:text-foreground"
            >
              {parsing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FileUp className="size-3.5" />
              )}
              {parsing ? t('files.extracting') : t('input.upload')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setInput(SAMPLE_TEXT)
                setSourceDoc(null)
                setLastDocument(null)
                clearSourceFile()
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <Sparkles className="size-3.5" />
              {t('input.sample')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearInput()
                setLastDocument(null)
                clearSourceFile()
                toast.success(t('input.clearDone'))
              }}
              disabled={!input}
              className="ml-auto text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="size-3.5" />
              {t('input.clear')}
            </Button>
          </div>

          {sourceDoc && (
            <div className="flex items-center gap-2 rounded-lg bg-secondary/60 px-2.5 py-1.5">
              <FileUp className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-[11.5px]">
                {t('input.source', { name: sourceDoc.fileName })}
              </span>
              <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
                {sourceDoc.format.toUpperCase()}
              </Badge>
              {lastDocument && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPending(lastDocument)}
                  className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <Eye className="size-3" />
                  {t('input.preview')}
                </Button>
              )}
            </div>
          )}

          <div
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={cn(
              'relative rounded-xl transition-shadow',
              dragging && 'ring-2 ring-primary/40 ring-offset-2 ring-offset-card',
            )}
          >
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              placeholder={t('input.placeholder')}
              className="h-[300px] bg-secondary/40 font-mono text-[12.5px] leading-[1.7] lg:h-[336px]"
              aria-label={t('input.title')}
            />
            {dragging && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-xl bg-background/85 text-[12.5px] font-medium text-primary">
                {t('input.dropHint')}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="tabular-nums">
              {countChars(input).toLocaleString(locale)} {t('common.characters')}
            </span>
            <span className="flex items-center gap-2">
              {isPro ? t('input.noLimit') : t('input.limitFree')}
              <span className="hidden text-muted-foreground/40 sm:inline">·</span>
              <span className="hidden sm:inline">{t('input.shortcut')}</span>
            </span>
          </div>

          {overLimit && (
            <Notice
              tone="warning"
              title={t('input.overLimitTitle')}
              action={
                <Button size="sm" variant="outline" onClick={openLicenseModal}>
                  {t('input.unlock')}
                </Button>
              }
            >
              {t('input.overLimitBody', {
                kept: FREE_WORD_LIMIT,
                total: words.toLocaleString(locale),
              })}
            </Notice>
          )}

          {stale && <Notice tone="neutral">{t('input.stale')}</Notice>}
        </CardContent>

        <CardFooter className="flex-col items-stretch">
          <Button onClick={handleAnonymize} size="lg" className="w-full">
            <Wand2 className="size-4" />
            {t('input.anonymize')}
          </Button>
        </CardFooter>
      </Card>

      <FilePreviewDialog
        document={pending}
        onConfirm={confirmImport}
        onCancel={() => setPending(null)}
      />
    </>
  )
}
