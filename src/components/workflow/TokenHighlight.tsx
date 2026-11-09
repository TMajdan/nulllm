import { Fragment } from 'react'
import type { Segment } from '@/anonymizer/types'
import { cn } from '@/lib/utils'
import { CATEGORY_TOKEN_CLASS } from '@/lib/tokenStyles'

interface TokenHighlightProps {
  segments: Segment[]
  className?: string
}

/** Renders anonymized output with soft, category-tinted token pills. */
export function TokenHighlight({ segments, className }: TokenHighlightProps) {
  return (
    <div
      className={cn(
        'whitespace-pre-wrap break-words font-mono text-[12.5px] leading-[1.75] text-foreground/90',
        className,
      )}
    >
      {segments.map((segment, index) =>
        segment.kind === 'token' ? (
          <mark
            key={`${segment.text}-${index}`}
            className={cn(
              'mx-[1px] inline-block rounded-md px-1.5 py-[1px] font-mono text-[0.85em] font-semibold',
              CATEGORY_TOKEN_CLASS[segment.category ?? 'custom'],
            )}
          >
            {segment.text}
          </mark>
        ) : (
          <Fragment key={`text-${index}`}>{segment.text}</Fragment>
        ),
      )}
    </div>
  )
}
