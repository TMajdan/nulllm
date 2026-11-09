import { Check, ClipboardCopy, RotateCcw, Upload } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/store/useSessionStore'

export function StepIndicator() {
  const { t } = useI18n()
  const hasInput = useSessionStore((state) => state.input.trim().length > 0)
  const hasOutput = useSessionStore((state) => state.anonymizedText.length > 0)
  const hasRestored = useSessionStore((state) => state.restoredText.length > 0)

  const steps = [
    { id: 'input', icon: Upload, title: t('steps.input.title'), description: t('steps.input.description') },
    { id: 'output', icon: ClipboardCopy, title: t('steps.output.title'), description: t('steps.output.description') },
    { id: 'restore', icon: RotateCcw, title: t('steps.restore.title'), description: t('steps.restore.description') },
  ]

  const completed = [hasInput, hasOutput, hasRestored]
  const activeIndex = completed.findIndex((done) => !done)

  return (
    <ol className="flex w-full items-center gap-1 rounded-2xl bg-secondary/60 p-1">
      {steps.map((step, index) => {
        const done = completed[index]
        const active =
          activeIndex === index || (activeIndex === -1 && index === steps.length - 1)
        const Icon = step.icon

        return (
          <li
            key={step.id}
            className={cn(
              'flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all sm:px-3',
              active && 'bg-card shadow-[0_1px_2px_rgba(16,24,40,0.06)]',
            )}
          >
            <span
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors',
                done
                  ? 'bg-primary text-primary-foreground'
                  : active
                    ? 'bg-primary/12 text-primary'
                    : 'bg-black/[0.045] text-muted-foreground dark:bg-white/10',
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : <Icon className="size-3.5" />}
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  'truncate text-[12.5px] font-medium leading-tight',
                  done || active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {step.title}
              </p>
              <p className="hidden truncate text-[11px] leading-tight text-muted-foreground sm:block">
                {step.description}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
