import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, ShieldAlert, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NoticeTone = 'info' | 'warning' | 'danger' | 'success' | 'neutral'

const TONE_CONTAINER: Record<NoticeTone, string> = {
  info: 'border-primary/20 bg-primary/[0.05]',
  warning: 'border-amber-500/25 bg-amber-500/[0.06]',
  danger: 'border-red-500/25 bg-red-500/[0.06]',
  success: 'border-emerald-500/25 bg-emerald-500/[0.06]',
  neutral: 'border-border/80 bg-secondary/50',
}

const TONE_ICON: Record<NoticeTone, string> = {
  info: 'text-primary',
  warning: 'text-amber-500',
  danger: 'text-red-500',
  success: 'text-emerald-500',
  neutral: 'text-muted-foreground',
}

const DEFAULT_ICONS = {
  info: Info,
  warning: TriangleAlert,
  danger: ShieldAlert,
  success: CircleCheck,
  neutral: CircleAlert,
} as const

interface NoticeProps {
  tone?: NoticeTone
  title?: ReactNode
  icon?: React.ComponentType<{ className?: string }>
  action?: ReactNode
  className?: string
  children?: ReactNode
}

export function Notice({
  tone = 'neutral',
  title,
  icon,
  action,
  className,
  children,
}: NoticeProps) {
  const Icon = icon ?? DEFAULT_ICONS[tone]

  return (
    <div className={cn('rounded-xl border px-3 py-2.5', TONE_CONTAINER[tone], className)}>
      <div className="flex gap-2.5">
        <Icon className={cn('mt-px size-4 shrink-0', TONE_ICON[tone])} />
        <div className="min-w-0 flex-1 space-y-1 text-[12px] leading-relaxed text-foreground">
          {title && <p className="font-medium">{title}</p>}
          {children}
          {action && <div className="pt-1.5">{action}</div>}
        </div>
      </div>
    </div>
  )
}
