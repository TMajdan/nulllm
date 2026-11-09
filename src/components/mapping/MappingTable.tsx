import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { TokenRecord } from '@/anonymizer/types'
import { ruleText, useI18n } from '@/hooks/useI18n'
import { APP_VERSION } from '@/lib/constants'
import { downloadJson, timestampSlug } from '@/lib/download'
import { CATEGORY_DOT_CLASS, CATEGORY_TOKEN_CLASS } from '@/lib/tokenStyles'
import { cn } from '@/lib/utils'
import { useIsPro } from '@/store/useLicenseStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useUiStore } from '@/store/useUiStore'

export function MappingTable() {
  const records = useSessionStore((state) => state.records)
  const renameRecord = useSessionStore((state) => state.renameRecord)
  const removeRecord = useSessionStore((state) => state.removeRecord)
  const clearSession = useSessionStore((state) => state.clearSession)

  const isPro = useIsPro()
  const openLicenseModal = useUiStore((state) => state.openLicenseModal)
  const { t, locale } = useI18n()

  const [query, setQuery] = useState('')
  const [reveal, setReveal] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftToken, setDraftToken] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    if (!confirmClear) return
    const timer = window.setTimeout(() => setConfirmClear(false), 4000)
    return () => window.clearTimeout(timer)
  }, [confirmClear])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return records
    return records.filter(
      (record) =>
        record.token.toLowerCase().includes(needle) ||
        record.originalValue.toLowerCase().includes(needle) ||
        record.ruleLabel.toLowerCase().includes(needle),
    )
  }, [records, query])

  function startEdit(record: TokenRecord) {
    setEditingId(record.id)
    setDraftToken(record.token)
  }

  function commitEdit(record: TokenRecord) {
    const result = renameRecord(record.id, draftToken)
    if (!result.ok) {
      toast.error(result.reason ?? t('mapping.tokenInvalid'))
      return
    }
    toast.success(t('mapping.tokenUpdated'))
    setEditingId(null)
  }

  function handleExport() {
    if (!isPro) {
      openLicenseModal()
      return
    }
    if (records.length === 0) {
      toast.info(t('export.noContent'))
      return
    }

    downloadJson(`nulllm-mapping-${timestampSlug()}.json`, {
      app: 'NullLM',
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      warning: 'This file contains original sensitive data. Store it securely.',
      tokens: records.map((record) => ({
        token: record.token,
        type: ruleText(t, record.ruleId, 'label', record.ruleLabel),
        category: record.category,
        original: record.originalValue,
        createdAt: new Date(record.createdAt).toISOString(),
      })),
    })
    toast.success(t('export.done'))
  }

  function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    clearSession()
    setConfirmClear(false)
    setQuery('')
    toast.success(t('mapping.cleared'))
  }

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <CardTitle>{t('mapping.title')}</CardTitle>
            <Badge variant="secondary" className="tabular-nums">
              {records.length}
            </Badge>
          </div>
          <CardDescription>{t('mapping.description')}</CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('mapping.searchPlaceholder')}
              className="h-8 w-[148px] pl-8 text-[12px]"
              aria-label={t('mapping.searchPlaceholder')}
            />
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setReveal((current) => !current)}
            title={reveal ? t('mapping.hide') : t('mapping.reveal')}
            aria-label={reveal ? t('mapping.hide') : t('mapping.reveal')}
            className="text-muted-foreground hover:text-foreground"
          >
            {reveal ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            {isPro ? <Download className="size-3.5" /> : <Lock className="size-3.5" />}
            {t('mapping.export')}
          </Button>
          <Button
            variant={confirmClear ? 'destructive' : 'ghost'}
            size="sm"
            onClick={handleClear}
            disabled={records.length === 0 && !confirmClear}
            className={cn(!confirmClear && 'text-muted-foreground hover:text-foreground')}
          >
            <Trash2 className="size-3.5" />
            {confirmClear ? t('mapping.confirmClear') : t('mapping.clearSession')}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        {records.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <div className="grid size-10 place-items-center rounded-full bg-secondary text-muted-foreground">
              <KeyRound className="size-4" />
            </div>
            <p className="text-[13.5px] font-medium">{t('mapping.emptyTitle')}</p>
            <p className="mx-auto max-w-[46ch] text-[12px] leading-relaxed text-muted-foreground">
              {t('mapping.emptyBody')}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-10 text-center text-[12px] text-muted-foreground">
            {t('mapping.noResults', { query })}
          </p>
        ) : (
          <div className="max-h-[400px] overflow-auto scrollbar-thin">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t('mapping.original')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('mapping.type')}</TableHead>
                  <TableHead>{t('mapping.token')}</TableHead>
                  <TableHead className="w-[92px] text-right">{t('mapping.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((record) => {
                  const label = ruleText(t, record.ruleId, 'label', record.ruleLabel)

                  return (
                    <TableRow key={record.id}>
                      <TableCell className="max-w-[320px]">
                        <span
                          className={cn(
                            'block truncate font-mono text-[12px]',
                            !reveal && 'select-none text-muted-foreground',
                          )}
                          title={reveal ? record.originalValue : t('mapping.hiddenValue')}
                        >
                          {reveal ? record.originalValue : '••••••••'}
                        </span>
                        <span className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] text-muted-foreground sm:hidden">
                          <span
                            className={cn(
                              'size-1.5 rounded-full',
                              CATEGORY_DOT_CLASS[record.category],
                            )}
                          />
                          {label}
                        </span>
                      </TableCell>

                      <TableCell className="hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-[12px]">
                          <span
                            className={cn(
                              'size-1.5 rounded-full',
                              CATEGORY_DOT_CLASS[record.category],
                            )}
                          />
                          {label}
                        </span>
                      </TableCell>

                      <TableCell>
                        {editingId === record.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={draftToken}
                              onChange={(event) => setDraftToken(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') commitEdit(record)
                                if (event.key === 'Escape') setEditingId(null)
                              }}
                              className="h-7 w-[148px] font-mono text-[11px]"
                              autoFocus
                              aria-label={t('mapping.token')}
                            />
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => commitEdit(record)}
                              aria-label={t('common.save')}
                            >
                              <Check className="size-3.5 text-emerald-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setEditingId(null)}
                              aria-label={t('common.cancel')}
                            >
                              <X className="size-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <span
                            className={cn(
                              'inline-block rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold',
                              CATEGORY_TOKEN_CLASS[record.category],
                            )}
                          >
                            {record.token}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => startEdit(record)}
                            title={t('common.edit')}
                            aria-label={`${t('common.edit')} ${record.token}`}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => {
                              removeRecord(record.id)
                              toast.warning(t('mapping.removed'))
                            }}
                            title={t('common.delete')}
                            aria-label={`${t('common.delete')} ${record.token}`}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {records.length > 0 && (
        <p className="px-5 pb-4 pt-2 text-[10.5px] text-muted-foreground">
          {records.length.toLocaleString(locale)} {t('common.mappings')}
        </p>
      )}
    </Card>
  )
}
