import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/useI18n'
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT } from '@/i18n'
import { cn } from '@/lib/utils'

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointer(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('header.language')}
        title={t('header.language')}
        className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
      >
        <Languages className="size-4" />
        <span className="text-[12px] font-medium">{LOCALE_SHORT[locale]}</span>
        <ChevronDown
          className={cn('size-3 transition-transform duration-150', open && 'rotate-180')}
        />
      </Button>

      {open && (
        <div
          role="listbox"
          aria-label={t('header.language')}
          className="absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-[0_12px_40px_-12px_rgba(16,24,40,0.25)]"
        >
          {LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              role="option"
              aria-selected={code === locale}
              onClick={() => {
                setLocale(code)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] transition-colors hover:bg-secondary"
            >
              <span className="w-6 font-mono text-[10.5px] text-muted-foreground">
                {LOCALE_SHORT[code]}
              </span>
              <span className="flex-1">{LOCALE_LABELS[code]}</span>
              {code === locale && <Check className="size-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
