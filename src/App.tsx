import { Check } from 'lucide-react'
import { Header } from '@/components/app/Header'
import { AppFooter } from '@/components/app/Footer'
import { ExportDialog } from '@/components/files/ExportDialog'
import { LicenseModal } from '@/components/license/LicenseModal'
import { MappingTable } from '@/components/mapping/MappingTable'
import { CustomDictionary } from '@/components/settings/CustomDictionary'
import { PlanCard } from '@/components/settings/PlanCard'
import { RulesSidebar } from '@/components/settings/RulesSidebar'
import { AnonymizedPanel } from '@/components/workflow/AnonymizedPanel'
import { InputPanel } from '@/components/workflow/InputPanel'
import { RestorePanel } from '@/components/workflow/RestorePanel'
import { StepIndicator } from '@/components/workflow/StepIndicator'
import { useI18n } from '@/hooks/useI18n'
import { useTheme } from '@/hooks/useTheme'
import { Toaster } from 'sonner'

export default function App() {
  const { theme } = useTheme()
  const { t } = useI18n()

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      <div
        aria-hidden
        className="canvas-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]"
      />

      <Header />

      <main className="relative mx-auto w-full max-w-[1440px] flex-1 px-4 pb-8 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <div className="max-w-3xl">
          <h1 className="text-balance text-[27px] font-semibold leading-[1.12] tracking-[-0.025em] sm:text-[36px]">
            {t('hero.title')}
          </h1>
          <p className="mt-3 max-w-2xl text-pretty text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
            {t('hero.subtitle')}
          </p>
          <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-muted-foreground">
            {[t('hero.trustBackend'), t('hero.trustTelemetry'), t('hero.trustLocal')].map(
              (point) => (
                <li key={point} className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-emerald-500" strokeWidth={3} />
                  {point}
                </li>
              ),
            )}
          </ul>
        </div>

        <div className="mt-7">
          <StepIndicator />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_336px]">
          <div className="min-w-0 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <InputPanel />
              <AnonymizedPanel />
              <RestorePanel />
            </div>
            <MappingTable />
          </div>

          <aside className="min-w-0 space-y-4">
            <RulesSidebar />
            <CustomDictionary />
            <PlanCard />
          </aside>
        </div>
      </main>

      <AppFooter />
      <LicenseModal />
      <ExportDialog />

      <Toaster
        theme={theme}
        position="top-center"
        offset={16}
        closeButton
        toastOptions={{
          classNames: {
            toast:
              'rounded-2xl border border-border/80 bg-popover text-popover-foreground shadow-lg text-[13px]',
            description: 'text-muted-foreground',
          },
        }}
      />
    </div>
  )
}
