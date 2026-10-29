export type LayoutType = 'grid' | 'list'
export type AnimationMode = 'static' | 'animated'
export type AnimationType = 'shimmer' | 'pulse' | 'fade' | 'wave' | 'none'
export type Sequencing = 'linear' | 'bulk' | 'sync'
export type RepeatModel = 'sequence' | 'independent'
export type SequenceOrder = 'row' | 'column' | 'diagonal' | 'center' | 'random'
export type GroupOverlap = 'sequential' | 'overlap'
export type AnimationDirection = 'normal' | 'reverse' | 'alternate' | 'alternate-reverse'
/** `layout`: Llumen DS phantom-shimmer — one band sweeping the whole layout at a constant px/s. */
export type ShimmerScope = 'layout' | 'element'
export type EasingId =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'ease-in-cubic'
  | 'ease-out-cubic'
  | 'ease-in-out-cubic'
  | 'custom'

export type Bezier = [number, number, number, number]

export interface LayoutConfig {
  type: LayoutType
  columns: number
  itemCount: number
  cardHeight: number
  rowHeight: number
  gapX: number
  gapY: number
  /** Gap between list rows. 0 renders the DS data-table (rows divided by borders). */
  listGap: number
  cardRadius: number
  /** Line / pill radius (DS radius/3xs). */
  boneRadius: number
  /** Thumbnail / block radius (DS radius/2xs). */
  blockRadius: number
  padding: number
  avatarSize: number
  lineHeight: number
  /** Listing header, filter bar and table header from the DS listing module. */
  chrome: boolean
  shapes: {
    avatar: boolean
    thumbnail: boolean
    textLines: number
    contentBlock: boolean
    /** Grid only: tag pills + action circle under the card text. */
    tags: boolean
    /** List only: trailing action circle. */
    actions: boolean
    /** List only: Category / Type / Status / Last updated cells. */
    dataColumns: number
  }
}

export interface AnimationConfig {
  mode: AnimationMode
  type: AnimationType
  sequencing: Sequencing
  repeat: RepeatModel
  order: SequenceOrder
  reverseOrder: boolean
  groupSize: number
  groupOverlap: GroupOverlap
  durationMs: number
  delayMs: number
  staggerMs: number
  groupDelayMs: number
  easing: EasingId
  customBezier: Bezier
  direction: AnimationDirection
  infinite: boolean
  iterationCount: number
  playbackSpeed: number
}

export interface AppearanceConfig {
  baseColor: string
  /** Alpha of the placeholder fill (DS surface/level-3 is #474747 at 60%). */
  baseAlpha: number
  /** DS phantom-shape alpha mask: fill fades 100% → 50% left to right. */
  fillFade: boolean
  highlightColor: string
  opacityMin: number
  opacityMax: number
  shimmerScope: ShimmerScope
  shimmerIntensity: number
  /** Layout sweep: band travel speed in px/s. */
  shimmerSpeed: number
  /** Layout sweep: band width in px. */
  shimmerBand: number
  shimmerDurationMs: number
  shimmerAngle: number
  shimmerWidth: number
  pulseIntensity: number
}

export interface PlaygroundConfig {
  layout: LayoutConfig
  animation: AnimationConfig
  appearance: AppearanceConfig
}

export const DEFAULT_CONFIG: PlaygroundConfig = {
  layout: {
    type: 'grid',
    columns: 4,
    itemCount: 8,
    cardHeight: 256,
    rowHeight: 72,
    gapX: 16,
    gapY: 16,
    listGap: 0,
    cardRadius: 12,
    boneRadius: 4,
    blockRadius: 6,
    padding: 12,
    avatarSize: 24,
    lineHeight: 12,
    chrome: true,
    shapes: {
      avatar: false,
      thumbnail: true,
      textLines: 0,
      contentBlock: false,
      tags: false,
      actions: true,
      dataColumns: 4,
    },
  },
  animation: {
    mode: 'animated',
    type: 'shimmer',
    sequencing: 'linear',
    repeat: 'independent',
    order: 'row',
    reverseOrder: false,
    groupSize: 4,
    groupOverlap: 'sequential',
    durationMs: 2000,
    delayMs: 0,
    staggerMs: 80,
    groupDelayMs: 200,
    easing: 'linear',
    customBezier: [0.4, 0, 0.2, 1],
    direction: 'normal',
    infinite: true,
    iterationCount: 3,
    playbackSpeed: 1,
  },
  appearance: {
    baseColor: '#474747',
    baseAlpha: 0.6,
    fillFade: true,
    highlightColor: '#ffffff',
    opacityMin: 0.35,
    opacityMax: 1,
    shimmerScope: 'layout',
    shimmerIntensity: 7,
    shimmerSpeed: 700,
    shimmerBand: 200,
    shimmerDurationMs: 1200,
    shimmerAngle: 100,
    shimmerWidth: 45,
    pulseIntensity: 0.45,
  },
}

/** DS listing-phantom/row cells after the name column. */
export const DATA_COLUMNS = [
  { label: 'Category', width: 104 },
  { label: 'Type', width: 64 },
  { label: 'Status', width: 64 },
  { label: 'Last updated', width: 104 },
] as const

export const EASING_OPTIONS: { id: EasingId; label: string; css: string }[] = [
  { id: 'linear', label: 'Linear', css: 'linear' },
  { id: 'ease', label: 'Ease', css: 'ease' },
  { id: 'ease-in', label: 'Ease In', css: 'ease-in' },
  { id: 'ease-out', label: 'Ease Out', css: 'ease-out' },
  { id: 'ease-in-out', label: 'Ease In Out', css: 'ease-in-out' },
  { id: 'ease-in-cubic', label: 'Ease In Cubic', css: 'cubic-bezier(0.32, 0, 0.67, 0)' },
  { id: 'ease-out-cubic', label: 'Ease Out Cubic', css: 'cubic-bezier(0.33, 1, 0.68, 1)' },
  { id: 'ease-in-out-cubic', label: 'Ease In Out Cubic', css: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  { id: 'custom', label: 'Custom Cubic Bézier', css: '' },
]

/** Control points for named keywords so the curve preview matches what CSS renders. */
const KEYWORD_BEZIERS: Record<Exclude<EasingId, 'custom'>, Bezier> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
  'ease-in-cubic': [0.32, 0, 0.67, 0],
  'ease-out-cubic': [0.33, 1, 0.68, 1],
  'ease-in-out-cubic': [0.65, 0, 0.35, 1],
}

export function easingBezier(a: AnimationConfig): Bezier {
  return a.easing === 'custom' ? a.customBezier : KEYWORD_BEZIERS[a.easing]
}

export function easingCss(a: AnimationConfig): string {
  if (a.easing === 'custom') {
    const [x1, y1, x2, y2] = a.customBezier
    return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`
  }
  return EASING_OPTIONS.find((e) => e.id === a.easing)!.css
}

export const TYPE_LABELS: Record<AnimationType, string> = {
  shimmer: 'Shimmer',
  pulse: 'Pulse',
  fade: 'Fade',
  wave: 'Wave',
  none: 'Static Skeleton',
}

export const SEQUENCING_LABELS: Record<Sequencing, string> = {
  linear: 'Linear',
  bulk: 'Bulk-by-Bulk',
  sync: 'All together',
}

export const ORDER_LABELS: Record<SequenceOrder, string> = {
  row: 'Rows: left → right, then down',
  column: 'Columns: top → bottom, then right',
  diagonal: 'Diagonal from top-left',
  center: 'Center outward',
  random: 'Random (seeded)',
}

/** True when the preview actually runs keyframes (mode + type), ignoring reduced motion. */
export function isMotionConfig(c: PlaygroundConfig): boolean {
  return c.animation.mode === 'animated' && c.animation.type !== 'none'
}

/** DS shimmer: a single band crosses the layout; per-item sequencing does not apply. */
export function isLayoutSweep(c: PlaygroundConfig): boolean {
  return c.animation.type === 'shimmer' && c.appearance.shimmerScope === 'layout'
}

export function effectiveSequencing(c: PlaygroundConfig): Sequencing {
  return isLayoutSweep(c) ? 'sync' : c.animation.sequencing
}

export type PropKey =
  | 'type'
  | 'sequencing'
  | 'repeat'
  | 'order'
  | 'groupSize'
  | 'groupOverlap'
  | 'durationMs'
  | 'delayMs'
  | 'staggerMs'
  | 'groupDelayMs'
  | 'easing'
  | 'direction'
  | 'iterations'
  | 'playbackSpeed'
  | 'opacity'
  | 'shimmerIntensity'
  | 'shimmerScope'
  | 'shimmerSpeed'
  | 'shimmerBand'
  | 'shimmerDurationMs'
  | 'shimmerAngle'
  | 'shimmerWidth'
  | 'pulseIntensity'
  | 'highlightColor'

/**
 * Which animation properties influence the rendered result for a config.
 * A string value is the reason the property is inactive (shown as the disabled hint).
 */
export function applicability(c: PlaygroundConfig): Record<PropKey, true | string> {
  const a = c.animation
  const out = {} as Record<PropKey, true | string>
  const set = (k: PropKey, v: true | string) => {
    out[k] = v
  }

  const motionKeys: PropKey[] = [
    'sequencing', 'repeat', 'order', 'groupSize', 'groupOverlap', 'durationMs', 'delayMs', 'staggerMs',
    'groupDelayMs', 'easing', 'direction', 'iterations', 'playbackSpeed', 'opacity', 'shimmerIntensity',
    'shimmerScope', 'shimmerSpeed', 'shimmerBand', 'shimmerDurationMs', 'shimmerAngle', 'shimmerWidth',
    'pulseIntensity', 'highlightColor',
  ]

  if (a.mode === 'static') {
    const reason = 'Static mode — switch to Animated to edit.'
    ;(['type', ...motionKeys] as PropKey[]).forEach((k) => set(k, reason))
    return out
  }

  set('type', true)
  if (a.type === 'none') {
    const reason = 'Static Skeleton type has no motion, so it cannot be sequenced or timed.'
    motionKeys.forEach((k) => set(k, reason))
    return out
  }

  if (isLayoutSweep(c)) {
    const reason =
      'Llumen DS shimmer is one wave across the layout — each shape’s timing comes from its horizontal position. Set Sweep to “Per placeholder” to sequence items.'
    ;(['sequencing', 'repeat', 'order', 'staggerMs', 'groupSize', 'groupDelayMs', 'groupOverlap'] as PropKey[]).forEach(
      (k) => set(k, reason),
    )
    ;(['durationMs', 'delayMs', 'easing', 'direction', 'iterations', 'playbackSpeed'] as PropKey[]).forEach((k) =>
      set(k, true),
    )
    const elementOnly = 'Only used by the “Per placeholder” sweep.'
    set('shimmerScope', true)
    set('shimmerSpeed', true)
    set('shimmerBand', true)
    set('shimmerIntensity', true)
    set('highlightColor', true)
    set('shimmerDurationMs', elementOnly)
    set('shimmerAngle', elementOnly)
    set('shimmerWidth', elementOnly)
    set('opacity', 'Only used by Fade.')
    set('pulseIntensity', 'Only used by Pulse.')
    return out
  }

  const seq = a.sequencing
  set('sequencing', true)
  set('repeat', seq === 'sync' ? 'All items share one timeline, so there is no sequence to repeat.' : true)
  set('order', seq === 'sync' ? 'All items start together — order has no effect.' : true)
  set('staggerMs', seq === 'linear' ? true : seq === 'bulk' ? 'Bulk-by-Bulk: items in a group start together. Use Group delay.' : 'All items start together.')
  set('groupSize', seq === 'bulk' ? true : 'Only used by Bulk-by-Bulk.')
  set('groupDelayMs', seq === 'bulk' ? true : 'Only used by Bulk-by-Bulk.')
  set(
    'groupOverlap',
    seq !== 'bulk'
      ? 'Only used by Bulk-by-Bulk.'
      : a.repeat === 'independent'
        ? 'Each item loops on its own, so groups always overlap. Use “Whole sequence” repeat.'
        : true,
  )
  ;(['durationMs', 'delayMs', 'easing', 'direction', 'iterations', 'playbackSpeed'] as PropKey[]).forEach((k) =>
    set(k, true),
  )

  const t = a.type
  set('opacity', t === 'fade' ? true : 'Only used by Fade.')
  set('pulseIntensity', t === 'pulse' ? true : 'Only used by Pulse.')
  set('shimmerScope', t === 'shimmer' ? true : 'Only used by Shimmer.')
  set('shimmerSpeed', t === 'shimmer' ? 'Only used by the Llumen DS layout sweep.' : 'Only used by Shimmer.')
  set('shimmerBand', t === 'shimmer' ? 'Only used by the Llumen DS layout sweep.' : 'Only used by Shimmer.')
  set('shimmerDurationMs', t === 'shimmer' ? true : 'Only used by Shimmer.')
  set('shimmerAngle', t === 'shimmer' ? true : 'Only used by Shimmer.')
  set('shimmerWidth', t === 'shimmer' ? true : 'Only used by Shimmer.')
  set('shimmerIntensity', t === 'shimmer' || t === 'wave' ? true : 'Used by Shimmer and Wave.')
  set('highlightColor', t === 'shimmer' || t === 'wave' ? true : 'Used by Shimmer and Wave.')
  return out
}

export interface Preset {
  id: string
  name: string
  description: string
  animation: Partial<AnimationConfig>
  appearance?: Partial<AppearanceConfig>
}

export const PRESETS: Preset[] = [
  {
    id: 'llumen-ds',
    name: 'Llumen DS Shimmer',
    description: 'Design-system spec: 200px band at 7% white, 700px/s, 2s linear loop.',
    animation: {},
  },
  {
    id: 'static',
    name: 'Static Skeleton',
    description: 'No motion. Placeholders stay put.',
    animation: { mode: 'static' },
  },
  {
    id: 'subtle-shimmer',
    name: 'Subtle Shimmer',
    description: 'DS layout sweep with a fainter, wider band.',
    animation: { durationMs: 2400 },
    appearance: { shimmerIntensity: 4, shimmerBand: 280, shimmerSpeed: 600 },
  },
  {
    id: 'slow-shimmer',
    name: 'Slow Shimmer',
    description: 'Calm layout sweep with a longer rest.',
    animation: { durationMs: 3600 },
    appearance: { shimmerIntensity: 9, shimmerSpeed: 400 },
  },
  {
    id: 'fast-shimmer',
    name: 'Fast Shimmer',
    description: 'Quick, brighter layout sweep.',
    animation: { durationMs: 1200 },
    appearance: { shimmerIntensity: 12, shimmerSpeed: 1400, shimmerBand: 160 },
  },
  {
    id: 'soft-pulse',
    name: 'Soft Pulse',
    description: 'Gentle opacity breathing.',
    animation: { type: 'pulse', sequencing: 'sync', durationMs: 2000, easing: 'ease-in-out' },
    appearance: { pulseIntensity: 0.35 },
  },
  {
    id: 'linear-stagger',
    name: 'Linear Stagger',
    description: 'Fade runs item by item in reading order.',
    animation: {
      type: 'fade',
      sequencing: 'linear',
      repeat: 'sequence',
      order: 'row',
      staggerMs: 90,
      durationMs: 1200,
      easing: 'ease-in-out',
    },
    appearance: { opacityMin: 0.3, opacityMax: 1 },
  },
  {
    id: 'bulk-shimmer',
    name: 'Bulk Shimmer',
    description: 'Shimmer row by row, one group at a time.',
    animation: {
      type: 'shimmer',
      sequencing: 'bulk',
      repeat: 'sequence',
      groupSize: 4,
      groupOverlap: 'sequential',
      groupDelayMs: 120,
      durationMs: 1000,
      easing: 'ease-in-out',
    },
    appearance: { shimmerScope: 'element', shimmerIntensity: 10, shimmerDurationMs: 900, shimmerWidth: 50 },
  },
  {
    id: 'sequential-wave',
    name: 'Sequential Wave',
    description: 'Highlight swell rolling diagonally.',
    animation: {
      type: 'wave',
      sequencing: 'linear',
      repeat: 'independent',
      order: 'diagonal',
      staggerMs: 120,
      durationMs: 1600,
      easing: 'ease-in-out',
    },
    appearance: { shimmerIntensity: 14 },
  },
]

/** Presets replace animation + appearance (from defaults) but keep the current layout. */
export function applyPreset(current: PlaygroundConfig, preset: Preset): PlaygroundConfig {
  return {
    layout: current.layout,
    animation: { ...DEFAULT_CONFIG.animation, ...preset.animation },
    appearance: { ...DEFAULT_CONFIG.appearance, ...preset.appearance },
  }
}

export function sameAnimation(a: PlaygroundConfig, b: PlaygroundConfig): boolean {
  return (
    JSON.stringify(a.animation) === JSON.stringify(b.animation) &&
    JSON.stringify(a.appearance) === JSON.stringify(b.appearance)
  )
}
