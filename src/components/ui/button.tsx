import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[13px] font-medium outline-none transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none active:scale-[0.988] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:brightness-[1.06] disabled:bg-secondary disabled:text-muted-foreground disabled:shadow-none',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70 disabled:opacity-50',
        outline:
          'border border-border bg-card text-foreground hover:bg-secondary/60 hover:border-border disabled:opacity-45',
        ghost: 'text-foreground hover:bg-secondary/70 disabled:opacity-40',
        destructive: 'bg-destructive text-white shadow-sm hover:brightness-[1.06] disabled:opacity-50',
        link: 'text-primary underline-offset-4 hover:underline disabled:opacity-50',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 rounded-[10px] px-3 text-[12.5px]',
        lg: 'h-11 rounded-xl px-6 text-sm',
        icon: 'size-9',
        'icon-sm': 'size-8 rounded-[10px]',
        'icon-xs': 'size-7 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
