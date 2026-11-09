import { KeyRound, Moon, ShieldCheck, Sun } from 'lucide-react'
import { LanguageSwitcher } from '@/components/app/LanguageSwitcher'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/useI18n'
import { useTheme } from '@/hooks/useTheme'
import { APP_NAME } from '@/lib/constants'
import { useIsPro } from '@/store/useLicenseStore'
import { useUiStore } from '@/store/useUiStore'

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useI18n()
  const isPro = useIsPro()
  const openLicenseModal = useUiStore((state) => state.openLicenseModal)

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-[9px] bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="size-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.01em]">{APP_NAME}</span>
          <span className="hidden truncate text-[12.5px] text-muted-foreground lg:inline">
            {t('header.tagline')}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <div
            className="hidden items-center gap-2 rounded-full bg-emerald-500/10 py-1 pl-2.5 pr-3 xl:flex"
            title={t('header.sandbox')}
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-1.5 animate-ping rounded-full bg-emerald-500/70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11.5px] font-medium text-emerald-700 dark:text-emerald-300">
              {t('header.sandbox')}
            </span>
          </div>

          <div
            className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 xl:hidden"
            title={t('header.sandbox')}
          >
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              {t('header.localOnly')}
            </span>
          </div>

          <LanguageSwitcher />

          <Button
            variant="ghost"
            size="sm"
            onClick={openLicenseModal}
            className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            title={isPro ? t('header.proActive') : t('header.activatePro')}
          >
            <KeyRound className="size-3.5" />
            <span className="hidden sm:inline">
              {isPro ? t('header.proActive') : t('header.activatePro')}
            </span>
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t('header.themeLight') : t('header.themeDark')}
            title={theme === 'dark' ? t('header.themeLight') : t('header.themeDark')}
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </div>
    </header>
  )
}
