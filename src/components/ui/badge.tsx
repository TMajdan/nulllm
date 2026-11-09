import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-5 transition-colors [&_svg]:size-3',
  {
    variants: {
      variant: {
        default: 'bg-secondary text-secondary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border border-border/90 text-muted-foreground',
        pro: 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
        destructive: 'bg-destructive/10 text-destructive',
        success: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
        info: 'bg-primary/10 text-primary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { badgeVariants }
