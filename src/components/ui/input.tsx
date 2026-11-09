import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        'flex h-9 w-full min-w-0 rounded-[10px] border border-border/80 bg-background px-3 py-1 text-[13px] text-foreground shadow-[0_1px_1px_rgba(16,24,40,0.03)] outline-none transition-colors',
        'placeholder:text-muted-foreground/60',
        'hover:border-border focus-visible:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/30',
        'disabled:cursor-not-allowed disabled:bg-secondary/50 disabled:opacity-60',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
