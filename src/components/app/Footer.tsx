import { useI18n } from '@/hooks/useI18n'
import { APP_VERSION } from '@/lib/constants'

export function AppFooter() {
  const { t } = useI18n()

  return (
    <footer className="mt-12 border-t border-border/70">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-2 px-4 py-6 text-[11.5px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>{t('hero.trustLocal')} — NullLM, {t('header.localOnly')}.</p>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.08em]">
          NullLM {APP_VERSION}
        </p>
      </div>
    </footer>
  )
}
