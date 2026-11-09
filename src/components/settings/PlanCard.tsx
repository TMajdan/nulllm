import { ArrowUpRight, Download, KeyRound, ShieldCheck, Sparkles } from 'lucide-react'
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
import { useI18n } from '@/hooks/useI18n'
import { APP_VERSION, FREE_WORD_LIMIT } from '@/lib/constants'
import { downloadJson, timestampSlug } from '@/lib/download'
import { maskLicenseKey } from '@/lib/license'
import { useIsPro, useLicenseStore } from '@/store/useLicenseStore'
import { useSessionStore } from '@/store/useSessionStore'
import { useUiStore } from '@/store/useUiStore'

export function PlanCard() {
  const isPro = useIsPro()
  const key = useLicenseStore((state) => state.key)
  const records = useSessionStore((state) => state.records)
  const openLicenseModal = useUiStore((state) => state.openLicenseModal)
  const { t, locale } = useI18n()

  const features = [
    t('plan.featureUnlimited'),
    t('plan.featureIds'),
    t('plan.featureNames'),
    t('plan.featureCustom'),
  ]

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
        type: record.ruleLabel,
        category: record.category,
        original: record.originalValue,
        createdAt: new Date(record.createdAt).toISOString(),
      })),
    })

    toast.success(t('export.done'))
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div className="space-y-0.5">
          <CardTitle>{isPro ? t('plan.proTitle') : t('plan.freeTitle')}</CardTitle>
          <CardDescription>
            {isPro ? t('plan.active', { key: maskLicenseKey(key) }) : t('plan.freeDescription')}
          </CardDescription>
        </div>
        <Badge variant={isPro ? 'success' : 'secondary'} className="mt-0.5">
          {isPro ? t('plan.lifetime') : t('plan.wordsBadge', { count: FREE_WORD_LIMIT })}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3">
        <ul className="space-y-1.5">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-[12px] text-muted-foreground">
              {isPro ? (
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
              ) : (
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
              )}
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {isPro ? (
          <Button variant="outline" className="w-full" onClick={handleExport}>
            <Download className="size-4" />
            {t('plan.export')}
          </Button>
        ) : (
          <Button className="w-full" onClick={openLicenseModal}>
            <KeyRound className="size-4" />
            {t('plan.activate')}
          </Button>
        )}

        <div className="flex items-center justify-between gap-2 text-[10.5px] text-muted-foreground">
          <span>{t('plan.localVerify')}</span>
          <button
            type="button"
            onClick={openLicenseModal}
            className="inline-flex items-center gap-0.5 font-medium text-foreground/70 hover:text-foreground"
          >
            {t('plan.price')}
            <ArrowUpRight className="size-3" />
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground/70">
          {records.length.toLocaleString(locale)} {t('common.mappings')}
        </p>
      </CardContent>
    </Card>
  )
}
