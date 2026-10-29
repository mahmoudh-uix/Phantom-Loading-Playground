import { effectiveSequencing, isLayoutSweep, type PlaygroundConfig } from './config'

export const MIN_CARD_WIDTH = 140

export interface ItemTiming {
  index: number
  row: number
  col: number
  /** Position in the playback order (0-based). */
  rank: number
  /** Linear: shared step index (ties start together). Bulk: group index. Sync: 0. */
  step: number
  /** Start offset inside the period, before the base delay (effective ms, speed applied). */
  startMs: number
  /** Value written to `--pl-delay` on the item (base delay + start offset). */
  delayMs: number
}

export interface Schedule {
  columns: number
  rows: number
  items: ItemTiming[]
  /** Effective per-item cycle length (ms). */
  cycleMs: number
  /** Portion of the cycle that actually moves (shimmer sweep can be shorter than the cycle). */
  motionMs: number
  /** Length of one CSS iteration (ms). Equals cycle for independent loops, the whole sequence otherwise. */
  periodMs: number
  baseDelayMs: number
  steps: number
  /** Effective gap between consecutive steps/groups (ms). */
  stepIntervalMs: number
  /** Layout sweep only: px the band travels (canvas width + band width). 0 otherwise. */
  sweepPx: number
}

/** Fallback travel distance before the canvas has been measured. */
const DEFAULT_SWEEP_WIDTH = 1200

export function effectiveColumns(c: PlaygroundConfig, width: number): number {
  if (c.layout.type === 'list') return 1
  if (width <= 0) return c.layout.columns
  const fit = Math.floor((width + c.layout.gapX) / (MIN_CARD_WIDTH + c.layout.gapX))
  return Math.max(1, Math.min(c.layout.columns, fit))
}

function seededRandom(seed: number) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const round = (n: number) => Math.round(n * 10) / 10

export function computeSchedule(c: PlaygroundConfig, columns: number, canvasWidth = 0): Schedule {
  const a = c.animation
  const ap = c.appearance
  const speed = Math.max(0.05, a.playbackSpeed)
  const sequencing = effectiveSequencing(c)
  const n = c.layout.itemCount
  const cols = Math.max(1, columns)
  const rows = Math.ceil(n / cols)

  let cycleMs = a.durationMs / speed
  let motionMs = a.type === 'shimmer' ? Math.min(ap.shimmerDurationMs, a.durationMs) / speed : cycleMs
  let sweepPx = 0
  if (isLayoutSweep(c)) {
    sweepPx = (canvasWidth > 0 ? canvasWidth : DEFAULT_SWEEP_WIDTH) + ap.shimmerBand
    motionMs = (sweepPx / Math.max(1, ap.shimmerSpeed)) * 1000 / speed
    // The loop stretches when one sweep across this canvas outlasts the configured duration.
    cycleMs = Math.max(cycleMs, motionMs)
  }
  const baseDelayMs = a.delayMs / speed

  const rand = seededRandom(7)
  const rc = (rows - 1) / 2
  const cc = (cols - 1) / 2
  const base = Array.from({ length: n }, (_, index) => {
    const row = Math.floor(index / cols)
    const col = index % cols
    let key: number
    switch (a.order) {
      case 'column':
        key = col * rows + row
        break
      case 'diagonal':
        key = row + col
        break
      case 'center':
        key = Math.round(Math.hypot(row - rc, col - cc))
        break
      case 'random':
        key = rand()
        break
      default:
        key = index
    }
    return { index, row, col, key }
  })

  if (a.reverseOrder) {
    const max = Math.max(...base.map((b) => b.key))
    base.forEach((b) => (b.key = max - b.key))
  }

  const sorted = [...base].sort((x, y) => x.key - y.key || x.index - y.index)
  const rankOf = new Map<number, number>()
  const stepOf = new Map<number, number>()
  let step = -1
  let lastKey = Number.NaN
  sorted.forEach((b, rank) => {
    rankOf.set(b.index, rank)
    if (b.key !== lastKey) {
      step += 1
      lastKey = b.key
    }
    stepOf.set(b.index, step)
  })

  let stepIntervalMs = 0
  const groupSize = Math.max(1, a.groupSize)
  const items: ItemTiming[] = base.map((b) => {
    const rank = rankOf.get(b.index)!
    let s = 0
    let startMs = 0
    if (sequencing === 'linear') {
      s = stepOf.get(b.index)!
      stepIntervalMs = a.staggerMs / speed
      startMs = s * stepIntervalMs
    } else if (sequencing === 'bulk') {
      s = Math.floor(rank / groupSize)
      // Sequential groups wait for the previous group's cycle to finish, then the group delay.
      const sequential = a.groupOverlap === 'sequential' && a.repeat === 'sequence'
      stepIntervalMs = sequential ? cycleMs + a.groupDelayMs / speed : a.groupDelayMs / speed
      startMs = s * stepIntervalMs
    }
    return {
      index: b.index,
      row: b.row,
      col: b.col,
      rank,
      step: s,
      startMs: round(startMs),
      delayMs: round(baseDelayMs + startMs),
    }
  })

  const maxStart = items.reduce((m, it) => Math.max(m, it.startMs), 0)
  const steps = items.reduce((m, it) => Math.max(m, it.step), 0) + 1
  const periodMs =
    sequencing === 'sync' || a.repeat === 'independent' ? cycleMs : maxStart + cycleMs

  return {
    columns: cols,
    rows,
    items,
    cycleMs: round(cycleMs),
    motionMs: round(motionMs),
    periodMs: round(periodMs),
    baseDelayMs: round(baseDelayMs),
    steps,
    stepIntervalMs: round(stepIntervalMs),
    sweepPx: Math.round(sweepPx),
  }
}
