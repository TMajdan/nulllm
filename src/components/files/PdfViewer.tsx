import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/useI18n'
import { loadPdfjs } from '@/lib/files/pdf'

interface PdfPageLike {
  getViewport: (params: { scale: number }) => {
    width: number
    height: number
    convertToViewportPoint: (x: number, y: number) => [number, number]
    convertToPdfPoint: (x: number, y: number) => [number, number]
  }
  render: (params: {
    canvasContext: CanvasRenderingContext2D
    viewport: unknown
    transform?: number[]
  }) => { promise: Promise<void>; cancel: () => void }
}

interface PdfDocumentLike {
  numPages: number
  getPage: (pageNumber: number) => Promise<PdfPageLike>
}

export interface PdfRedactionBox {
  page: number
  x: number
  y: number
  width: number
  height: number
}

interface ViewportInfo {
  width: number
  height: number
  toPdf: (x: number, y: number) => [number, number]
  toCanvas: (x: number, y: number) => [number, number]
}

interface PdfViewerProps {
  data: ArrayBuffer
  /** Rectangles (PDF space) to shade on top of the page. */
  redactions?: PdfRedactionBox[]
  /** Enables drag-to-select; used to mark scans and images by hand. */
  selecting?: boolean
  onSelect?: (rect: PdfRedactionBox) => void
  /** Reports the rendered page and its size in points (scale 1). */
  onPageChange?: (info: { page: number; width: number; height: number }) => void
}

interface DragRect {
  x: number
  y: number
  width: number
  height: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Renders real PDF pages to a canvas - nothing leaves the browser. */
export function PdfViewer({
  data,
  redactions = [],
  selecting = false,
  onSelect,
  onPageChange,
}: PdfViewerProps) {
  const { t } = useI18n()
  const [pdf, setPdf] = useState<PdfDocumentLike | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [availableWidth, setAvailableWidth] = useState(0)
  const [viewportInfo, setViewportInfo] = useState<ViewportInfo | null>(null)
  const [drag, setDrag] = useState<DragRect | null>(null)
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const dragOrigin = useRef<{ x: number; y: number } | null>(null)

  // Track the available width so the page always fits the dialog.
  useEffect(() => {
    if (!scrollElement) return

    const update = () => setAvailableWidth(Math.max(scrollElement.clientWidth - 32, 240))
    update()

    const observer = new ResizeObserver(update)
    observer.observe(scrollElement)
    return () => observer.disconnect()
  }, [scrollElement])

  useEffect(() => {
    let cancelled = false
    let task: { destroy: () => void } | null = null

    setPdf(null)
    setPageNumber(1)
    setError(false)

    void (async () => {
      try {
        const pdfjs = await loadPdfjs()
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) })
        task = loadingTask
        const loaded = (await loadingTask.promise) as unknown as PdfDocumentLike
        if (cancelled) return
        setPdf(loaded)
      } catch (error) {
        if (import.meta.env.DEV) console.warn('[nulllm] viewer failed', error)
        if (!cancelled) setError(true)
      }
    })()

    return () => {
      cancelled = true
      task?.destroy()
    }
  }, [data])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!pdf || !canvas || availableWidth <= 0) return

    let cancelled = false
    let renderTask: { cancel: () => void } | null = null
    setRenderError(null)

    void (async () => {
      try {
        const page = await pdf.getPage(pageNumber)
        if (cancelled) return

        const base = page.getViewport({ scale: 1 })
        const targetWidth = Math.min(availableWidth * zoom, 1800)
        const viewport = page.getViewport({ scale: targetWidth / base.width })
        const dpr = window.devicePixelRatio || 1

        canvas.width = Math.floor(viewport.width * dpr)
        canvas.height = Math.floor(viewport.height * dpr)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`

        setViewportInfo({
          width: viewport.width,
          height: viewport.height,
          toPdf: (x, y) => viewport.convertToPdfPoint(x, y),
          toCanvas: (x, y) => viewport.convertToViewportPoint(x, y),
        })
        onPageChange?.({ page: pageNumber, width: base.width, height: base.height })

        const context = canvas.getContext('2d')
        if (!context) return

        const task = page.render({
          canvasContext: context,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        })

        renderTask = task
        await task.promise
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : String(error)
          if (!/cancel/i.test(message)) setRenderError(message)
        }
      }
    })()

    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [pdf, pageNumber, zoom, availableWidth, onPageChange])

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!selecting) return
      const bounds = event.currentTarget.getBoundingClientRect()
      const origin = {
        x: clamp(event.clientX - bounds.left, 0, bounds.width),
        y: clamp(event.clientY - bounds.top, 0, bounds.height),
      }

      dragOrigin.current = origin
      setDrag({ ...origin, width: 0, height: 0 })
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [selecting],
  )

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const origin = dragOrigin.current
      if (!origin) return

      const bounds = event.currentTarget.getBoundingClientRect()
      const x = clamp(event.clientX - bounds.left, 0, bounds.width)
      const y = clamp(event.clientY - bounds.top, 0, bounds.height)

      setDrag({
        x: Math.min(x, origin.x),
        y: Math.min(y, origin.y),
        width: Math.abs(x - origin.x),
        height: Math.abs(y - origin.y),
      })
    },
    [],
  )

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const origin = dragOrigin.current
      dragOrigin.current = null
      setDrag(null)

      if (!origin || !viewportInfo) return

      const bounds = event.currentTarget.getBoundingClientRect()
      const x = clamp(event.clientX - bounds.left, 0, bounds.width)
      const y = clamp(event.clientY - bounds.top, 0, bounds.height)

      if (Math.abs(x - origin.x) < 6 || Math.abs(y - origin.y) < 6) return

      const [left, bottom] = viewportInfo.toPdf(Math.min(x, origin.x), Math.max(y, origin.y))
      const [right, top] = viewportInfo.toPdf(Math.max(x, origin.x), Math.min(y, origin.y))

      onSelect?.({
        page: pageNumber,
        x: Math.min(left, right),
        y: Math.min(bottom, top),
        width: Math.abs(right - left),
        height: Math.abs(top - bottom),
      })
    },
    [onSelect, pageNumber, viewportInfo],
  )

  if (error) {
    return (
      <p className="px-4 py-6 text-center text-[12px] text-muted-foreground">
        {t('files.viewerFailed')}
      </p>
    )
  }

  if (!pdf) {
    return (
      <p className="px-4 py-6 text-center text-[12px] text-muted-foreground">
        {t('files.rendering')}
      </p>
    )
  }

  const pageRedactions = redactions.filter((rect) => rect.page === pageNumber)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-1.5">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setPageNumber((value) => Math.max(1, value - 1))}
            disabled={pageNumber <= 1}
            aria-label={t('files.prevPage')}
            title={t('files.prevPage')}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="min-w-[70px] text-center text-[11px] tabular-nums text-muted-foreground">
            {t('files.pageOf', { current: pageNumber, total: pdf.numPages })}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setPageNumber((value) => Math.min(pdf.numPages, value + 1))}
            disabled={pageNumber >= pdf.numPages}
            aria-label={t('files.nextPage')}
            title={t('files.nextPage')}
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setZoom((value) => Math.max(0.5, Math.round((value - 0.25) * 100) / 100))}
            disabled={zoom <= 0.5}
            aria-label={t('files.zoomOut')}
            title={t('files.zoomOut')}
          >
            <Minus className="size-3.5" />
          </Button>
          <span className="w-10 text-center text-[10.5px] tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setZoom((value) => Math.min(2.5, Math.round((value + 0.25) * 100) / 100))}
            disabled={zoom >= 2.5}
            aria-label={t('files.zoomIn')}
            title={t('files.zoomIn')}
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
      </div>

      <div
        ref={setScrollElement}
        className="flex-1 overflow-auto bg-secondary/50 p-4 scrollbar-thin"
      >
        {renderError && (
          <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 font-mono text-[11px] text-red-600 dark:text-red-300">
            {renderError}
          </p>
        )}
        <div className="relative mx-auto w-fit shadow-[0_2px_18px_rgba(16,24,40,0.18)]">
          <canvas ref={canvasRef} className="block" />

          {viewportInfo && pageRedactions.length > 0 && (
            <svg
              className="pointer-events-none absolute inset-0"
              width={Math.floor(viewportInfo.width)}
              height={Math.floor(viewportInfo.height)}
              viewBox={`0 0 ${Math.floor(viewportInfo.width)} ${Math.floor(viewportInfo.height)}`}
              aria-hidden="true"
            >
              {pageRedactions.map((rect) => {
                const [x1, y1] = viewportInfo.toCanvas(rect.x, rect.y)
                const [x2, y2] = viewportInfo.toCanvas(rect.x + rect.width, rect.y + rect.height)
                return (
                  <rect
                    key={`${rect.page}-${rect.x.toFixed(1)}-${rect.y.toFixed(1)}`}
                    x={Math.min(x1, x2)}
                    y={Math.min(y1, y2)}
                    width={Math.abs(x2 - x1)}
                    height={Math.abs(y2 - y1)}
                    fill="rgba(8, 8, 12, 0.94)"
                  />
                )
              })}
            </svg>
          )}

          {selecting && (
            <div
              className="absolute inset-0 z-10 cursor-crosshair"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
          )}

          {drag && (
            <div
              className="pointer-events-none absolute z-20 border border-dashed border-black/70 bg-black/30"
              style={{
                left: drag.x,
                top: drag.y,
                width: drag.width,
                height: drag.height,
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
