import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useRevealScrollbarOnScroll } from './useRevealScrollbarOnScroll'
import { effectiveSequencing, isLayoutSweep, isMotionConfig, type PlaygroundConfig } from './config'
import { buildAnimationCss } from './css'
import { ListingChrome } from './ListingChrome'
import { computeSchedule, effectiveColumns, type ItemTiming, type Schedule } from './schedule'
import { SkeletonItem } from './SkeletonItem'
import { Timeline } from './Timeline'
import styles from './Preview.module.css'

/** Must match `--pl-canvas-pad` in Preview.module.css (DS listing grid padding). */
const CANVAS_PAD = 16

interface Props {
  paneId: string
  config: PlaygroundConfig
  playing: boolean
  runId: number
  motionAllowed: boolean
  showLabels: boolean
  showTimeline?: boolean
  title?: string
  subtitle?: string
  onMeasure?: (columns: number, width: number) => void
  onFinished?: () => void
  onActive?: () => void
}

function labelFor(c: PlaygroundConfig, it: ItemTiming): string {
  const d = `${Math.round(it.delayMs)}ms`
  if (!isMotionConfig(c)) return `#${it.index + 1}`
  if (isLayoutSweep(c)) return 'x-sweep'
  const seq = effectiveSequencing(c)
  if (seq === 'bulk') return `G${it.step + 1} · ${d}`
  if (seq === 'linear') return `#${it.rank + 1} · ${d}`
  return d
}

export function PreviewPane({
  paneId,
  config,
  playing,
  runId,
  motionAllowed,
  showLabels,
  showTimeline,
  title,
  subtitle,
  onMeasure,
  onFinished,
  onActive,
}: Props) {
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const revealRef = useRevealScrollbarOnScroll()
  const setCanvasRef = useCallback(
    (el: HTMLDivElement | null) => {
      canvasRef.current = el
      revealRef(el)
    },
    [revealRef],
  )
  const [box, setBox] = useState({ width: 0, left: 0 })

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      const next = { width: Math.floor(el.clientWidth), left: Math.round(r.left) }
      setBox((b) => (b.width === next.width && b.left === next.left ? b : next))
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    measure()
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const { layout } = config
  const contentWidth = layout.type === 'grid' ? box.width - 2 * CANVAS_PAD : box.width
  const columns = effectiveColumns(config, contentWidth)
  useEffect(() => {
    onMeasure?.(columns, box.width)
  }, [columns, box.width, onMeasure])

  const schedule: Schedule = useMemo(() => computeSchedule(config, columns, box.width), [config, columns, box.width])
  const motion = motionAllowed && isMotionConfig(config)
  const css = useMemo(
    () =>
      buildAnimationCss(
        config,
        schedule,
        { root: `[data-pl-pane="${paneId}"]`, item: '.pl-item', bone: '.pl-bone', name: `pl-${paneId}-${config.animation.type}` },
        {
          motion,
          sweep: {
            from: `${box.left - config.appearance.shimmerBand}px`,
            to: `${box.left + box.width}px`,
          },
        },
      ),
    [config, schedule, paneId, motion, box.left, box.width],
  )

  const vars = {
    '--pl-play-state': playing && motion ? 'running' : 'paused',
    '--pl-cols': columns,
    '--pl-gap-x': `${layout.gapX}px`,
    '--pl-gap-y': `${layout.gapY}px`,
    '--pl-list-gap': `${layout.listGap}px`,
    '--pl-card-h': `${layout.cardHeight}px`,
    '--pl-row-h': `${layout.rowHeight}px`,
    '--pl-radius': `${layout.cardRadius}px`,
    '--pl-bone-radius': `${layout.boneRadius}px`,
    '--pl-block-radius': `${layout.blockRadius}px`,
    '--pl-pad': `${layout.padding}px`,
    '--pl-avatar': `${layout.avatarSize}px`,
    '--pl-line': `${layout.lineHeight}px`,
  } as CSSProperties

  const itemsClass =
    layout.type === 'grid'
      ? styles.grid
      : `${styles.list} ${layout.listGap > 0 ? styles.listSeparated : ''}`

  return (
    <section className={styles.pane} data-pl-pane={paneId} style={vars} aria-label={title ?? 'Skeleton preview'}>
      <style>{css}</style>
      {title && (
        <header className={styles.paneHeader}>
          <span className={styles.paneTitle}>{title}</span>
          {subtitle && <span className={styles.paneSubtitle}>{subtitle}</span>}
        </header>
      )}
      <div ref={setCanvasRef} className={styles.canvasBody}>
        {layout.chrome && <ListingChrome layout={layout} />}
        <div
          key={runId}
          className={itemsClass}
          role="img"
          aria-label={`${layout.itemCount} loading placeholders in a ${layout.type}`}
        >
          {schedule.items.map((it) => (
            <SkeletonItem
              key={it.index}
              layout={layout}
              index={it.index}
              delayMs={it.delayMs}
              label={showLabels ? labelFor(config, it) : null}
            />
          ))}
        </div>
      </div>
      {(showTimeline || onFinished) && (
        <Timeline
          key={runId}
          config={config}
          schedule={schedule}
          motion={motion}
          collapsed={!showTimeline}
          onFinished={onFinished}
          onActive={onActive}
        />
      )}
    </section>
  )
}
