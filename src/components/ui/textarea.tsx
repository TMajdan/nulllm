import * as React from 'react'
import { cn } from '@/lib/utils'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        'flex w-full rounded-xl border border-border/80 bg-background px-3.5 py-3 text-[13px] text-foreground outline-none transition-colors',
        'placeholder:text-muted-foreground/55',
        'hover:border-border focus-visible:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/25',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'scrollbar-thin resize-none',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export { Textarea }
