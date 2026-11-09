import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/hooks/useI18n'

interface DocxViewerProps {
  data: ArrayBuffer
}

/** Renders a DOCX file to styled HTML with docx-preview (lazy loaded). */
export function DocxViewer({ data }: DocxViewerProps) {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ''
    setLoading(true)
    setError(false)

    let cancelled = false

    void (async () => {
      try {
        const { renderAsync } = await import('docx-preview')
        if (cancelled) return
        await renderAsync(data, container, undefined, {
          inWrapper: true,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          renderHeaders: true,
          renderFooters: true,
        })
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [data])

  if (error) {
    return (
      <p className="px-4 py-6 text-center text-[12px] text-muted-foreground">
        {t('files.viewerFailed')}
      </p>
    )
  }

  return (
    <div className="relative h-full">
      {loading && (
        <p className="absolute inset-x-0 top-3 z-10 text-center text-[12px] text-muted-foreground">
          {t('files.rendering')}
        </p>
      )}
      <div
        ref={containerRef}
        className="docx-viewer h-full overflow-auto bg-secondary/50 p-3 scrollbar-thin"
      />
    </div>
  )
}
