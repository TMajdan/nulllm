import * as React from 'react'
import { cn } from '@/lib/utils'

export function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-xs font-medium text-muted-foreground select-none',
        className,
      )}
      {...props}
    />
  )
}

export function Separator({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      role="separator"
      data-slot="separator"
      className={cn('h-px w-full shrink-0 bg-border', className)}
      {...props}
    />
  )
}
