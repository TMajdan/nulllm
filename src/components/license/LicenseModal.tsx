import { useState, type FormEvent } from 'react'
import { ArrowUpRight, BadgeCheck, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Notice } from '@/components/ui/notice'
import { useI18n } from '@/hooks/useI18n'
import { CHECKOUT_URL, DEMO_LICENSE_KEY, FREE_WORD_LIMIT } from '@/lib/constants'
import { maskLicenseKey } from '@/lib/license'
import { useLicenseStore } from '@/store/useLicenseStore'
import { useUiStore } from '@/store/useUiStore'

export function LicenseModal() {
  const open = useUiStore((state) => state.licenseModalOpen)
  const close = useUiStore((state) => state.closeLicenseModal)

  const plan = useLicenseStore((state) => state.plan)
  const key = useLicenseStore((state) => state.key)
  const activatedAt = useLicenseStore((state) => state.activatedAt)
  const activate = useLicenseStore((state) => state.activate)
  const deactivate = useLicenseStore((state) => state.deactivate)

  const { t, locale } = useI18n()

  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isPro = plan === 'pro'

  async function handleActivate(rawKey: string) {
    setError(null)
    setLoading(true)

    // Mock latency. No request is made: verification is 100% local.
    await new Promise((resolve) => window.setTimeout(resolve, 600))

    const result = activate(rawKey)
    setLoading(false)

    if (result.ok) {
      setValue('')
      toast.success(t('license.activated'))
      close()
      return
    }

    setError(result.error ?? t('license.invalid'))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void handleActivate(value)
  }

  function handlePurchase() {
    if (CHECKOUT_URL.includes('REPLACE-WITH-YOUR-STORE')) {
      toast.info(t('license.checkoutMissing'))
      return
    }
    window.open(CHECKOUT_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <KeyRound className="size-4" />
            </span>
            <Badge variant="secondary">{t('license.badge')}</Badge>
          </div>
          <DialogTitle>{isPro ? t('license.activeTitle') : t('license.title')}</DialogTitle>
          <DialogDescription>
            {isPro ? t('license.activeDescription') : t('license.description')}
          </DialogDescription>
        </DialogHeader>

        {isPro ? (
          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
              <div className="flex items-center gap-2 text-[13px] font-medium">
                <BadgeCheck className="size-4 text-emerald-500" />
                {t('license.planLabel')}
              </div>
              <dl className="mt-3 space-y-1.5 text-[12px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t('license.keyLabel')}</dt>
                  <dd className="font-mono">{maskLicenseKey(key)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t('license.activatedLabel')}</dt>
                  <dd className="font-mono">
                    {activatedAt ? new Date(activatedAt).toLocaleString(locale) : '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t('license.limitLabel')}</dt>
                  <dd className="font-mono">{t('license.limitNone')}</dd>
                </div>
              </dl>
            </div>

            <Notice tone="neutral" icon={ShieldCheck}>
              {t('license.storedLocally')}
            </Notice>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  deactivate()
                  toast.success(t('license.deactivated'))
                }}
              >
                {t('license.deactivate')}
              </Button>
              <Button variant="outline" onClick={close}>
                {t('license.close')}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="license-key">{t('license.keyField')}</Label>
              <Input
                id="license-key"
                value={value}
                onChange={(event) => {
                  setValue(event.target.value)
                  setError(null)
                }}
                placeholder={t('license.keyPlaceholder')}
                autoComplete="off"
                spellCheck={false}
                className="h-10 font-mono text-[12.5px]"
                aria-invalid={Boolean(error)}
              />
              {error ? (
                <p className="text-[11.5px] font-medium text-destructive">{error}</p>
              ) : (
                <p className="text-[11.5px] text-muted-foreground">{t('license.keyFormat')}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="lg" disabled={loading || !value.trim()} className="flex-1">
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <KeyRound className="size-4" />
                )}
                {t('license.activate')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => {
                  setValue(DEMO_LICENSE_KEY)
                  void handleActivate(DEMO_LICENSE_KEY)
                }}
                disabled={loading}
              >
                {t('license.demo')}
              </Button>
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-2">
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                {t('license.freeInfo', { count: FREE_WORD_LIMIT })}
              </p>
              <Button type="button" variant="secondary" className="w-full" onClick={handlePurchase}>
                {t('license.buy')}
                <ArrowUpRight className="size-4" />
              </Button>
            </div>

            <p className="text-[10.5px] leading-relaxed text-muted-foreground">
              {t('license.mockNote')}
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
