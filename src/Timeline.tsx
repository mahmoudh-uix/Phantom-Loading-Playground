import type { CSSProperties } from 'react'
import { effectiveSequencing, isLayoutSweep, isMotionConfig, type PlaygroundConfig } from './config'
import { describeTiming } from './css'
import type { Schedule } from './schedule'
import { useRevealScrollbarOnScroll } from './useRevealScrollbarOnScroll'
import styles from './Preview.module.css'

interface Props {
  config: PlaygroundConfig
  schedule: Schedule
  motion: boolean
  onFinished?: () => void
  onActive?: () => void
  /** Visually removed but kept rendering so the playhead can still report the end of a run. */
  collapsed?: boolean
}

interface Segment {
  left: number
  width: number
}

/** Splits [start, start + len) on a ring of length `period` into 1–2 visible segments (fractions). */
function wrap(start: number, len: number, period: number): Segment[] {
  if (period <= 0) return []
  const s = ((start % period) + period) % period
  const end = s + Math.min(len, period)
  if (end <= period) return [{ left: s / period, width: (end - s) / period }]
  return [
    { left: s / period, width: (period - s) / period },
    { left: 0, width: (end - period) / period },
  ]
}

export function Timeline({ config, schedule, motion, onFinished, onActive, collapsed }: Props) {
  const scrollRef = useRevealScrollbarOnScroll()
  const a = config.animation
  const rootClass = `${styles.timeline} ${collapsed ? styles.timelineCollapsed : ''}`

  if (!isMotionConfig(config)) {
    if (collapsed) return null
    return (
      <div className={rootClass}>
        <div className={styles.timelineHead}>
          <span className={styles.timelineTitle}>Timeline</span>
          <span className={styles.timelineMeta}>No animation — placeholders are static.</span>
        </div>
      </div>
    )
  }

  const steps = new Map<number, { startMs: number; count: number }>()
  for (const it of schedule.items) {
    const prev = steps.get(it.step)
    if (prev) prev.count += 1
    else steps.set(it.step, { startMs: it.startMs, count: 1 })
  }
  const rows = [...steps.entries()].sort((x, y) => x[0] - y[0])
  const seq = effectiveSequencing(config)
  const prefix = isLayoutSweep(config) ? 'Sweep' : seq === 'bulk' ? 'G' : seq === 'linear' ? 'Step ' : 'All'

  const playhead = {
    animationDuration: `${schedule.periodMs}ms`,
    animationDelay: `${schedule.baseDelayMs}ms`,
    animationIterationCount: a.infinite ? 'infinite' : a.iterationCount,
  } as CSSProperties

  return (
    <div className={rootClass} aria-hidden={collapsed || undefined}>
      <div className={styles.timelineHead}>
        <span className={styles.timelineTitle}>Timeline</span>
        <span className={styles.timelineMeta}>
          {describeTiming(config, schedule)} One iteration = {Math.round(schedule.periodMs)}ms
          {a.repeat === 'independent' && seq !== 'sync' ? ' (each item loops on its own; offsets wrap).' : '.'}
        </span>
      </div>
      <div ref={scrollRef} className={styles.timelineScroll}>
        <div className={styles.timelineRows}>
          {rows.map(([step, info]) => (
            <div key={step} className={styles.timelineRow}>
              <span className={styles.timelineLabel}>
                {seq === 'sync' ? prefix : `${prefix}${step + 1}`}
                {info.count > 1 && seq !== 'sync' ? ` ×${info.count}` : ''}
              </span>
              <span className={styles.timelineTrack}>
                {wrap(info.startMs, schedule.cycleMs, schedule.periodMs).map((seg, i) => (
                  <span
                    key={`w${i}`}
                    className={styles.timelineWindow}
                    style={{ left: `${seg.left * 100}%`, width: `${seg.width * 100}%` }}
                  />
                ))}
                {wrap(info.startMs, schedule.motionMs, schedule.periodMs).map((seg, i) => (
                  <span
                    key={`m${i}`}
                    className={styles.timelineMotion}
                    style={{ left: `${seg.left * 100}%`, width: `${seg.width * 100}%` }}
                  />
                ))}
                <span
                  className={styles.timelineStart}
                  style={{ left: `${schedule.periodMs > 0 ? ((info.startMs % schedule.periodMs) / schedule.periodMs) * 100 : 0}%` }}
                />
              </span>
            </div>
          ))}
          <span className={styles.playheadLayer} aria-hidden="true">
            <span
              className={`${styles.playhead} ${motion ? styles.playheadOn : ''}`}
              style={playhead}
              onAnimationStart={onActive}
              onAnimationEnd={onFinished}
            />
          </span>
        </div>
      </div>
    </div>
  )
}
