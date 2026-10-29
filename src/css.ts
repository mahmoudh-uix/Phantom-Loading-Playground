import {
  applicability,
  easingCss,
  effectiveSequencing,
  isLayoutSweep,
  isMotionConfig,
  ORDER_LABELS,
  SEQUENCING_LABELS,
  TYPE_LABELS,
  type PlaygroundConfig,
  type PropKey,
} from './config'
import type { Schedule } from './schedule'

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h.padEnd(6, '0')
  const v = parseInt(full.slice(0, 6), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${+alpha.toFixed(3)})`
}

function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  const m = ca.map((v, i) => Math.round(v + (cb[i] - v) * t))
  return `#${m.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

const pct = (n: number) => `${+(Math.min(1, Math.max(0, n)) * 100).toFixed(3)}%`
const ms = (n: number) => `${+n.toFixed(1)}ms`

export interface CssTargets {
  root: string
  item: string
  bone: string
  name: string
}

/** Horizontal viewport coordinates (px) of the band at the start and end of a layout sweep. */
export interface SweepRange {
  from: string
  to: string
}

function keyframes(c: PlaygroundConfig, s: Schedule, name: string, sweep: SweepRange): string {
  const ap = c.appearance
  const p = s.periodMs > 0 ? s.motionMs / s.periodMs : 1
  const hold = p < 0.9995
  const lines: string[] = []
  const frame = (at: number, body: string) => lines.push(`  ${pct(at)} { ${body} }`)

  switch (c.animation.type) {
    case 'shimmer': {
      if (isLayoutSweep(c)) {
        frame(0, `background-position: ${sweep.from} 0;`)
        frame(p, `background-position: ${sweep.to} 0;`)
        if (hold) frame(1, `background-position: ${sweep.to} 0;`)
        break
      }
      const rad = (ap.shimmerAngle * Math.PI) / 180
      const dx = Math.sin(rad)
      const dy = -Math.cos(rad)
      const start = `${+(50 + 50 * dx).toFixed(2)}% ${+(50 + 50 * dy).toFixed(2)}%`
      const end = `${+(50 - 50 * dx).toFixed(2)}% ${+(50 - 50 * dy).toFixed(2)}%`
      frame(0, `background-position: ${start};`)
      frame(p, `background-position: ${end};`)
      if (hold) frame(1, `background-position: ${end};`)
      break
    }
    case 'pulse': {
      const low = +(1 - ap.pulseIntensity).toFixed(3)
      frame(0, 'opacity: 1;')
      frame(p / 2, `opacity: ${low};`)
      frame(p, 'opacity: 1;')
      if (hold) frame(1, 'opacity: 1;')
      break
    }
    case 'fade': {
      frame(0, `opacity: ${ap.opacityMax};`)
      frame(p * 0.4, `opacity: ${ap.opacityMin};`)
      frame(p * 0.6, `opacity: ${ap.opacityMin};`)
      frame(p, `opacity: ${ap.opacityMax};`)
      if (hold) frame(1, `opacity: ${ap.opacityMax};`)
      break
    }
    case 'wave': {
      const base = rgba(ap.baseColor, ap.baseAlpha)
      const peak = rgba(mixHex(ap.baseColor, ap.highlightColor, ap.shimmerIntensity / 100), ap.baseAlpha)
      frame(0, `background-color: ${base};`)
      frame(p / 2, `background-color: ${peak};`)
      frame(p, `background-color: ${base};`)
      if (hold) frame(1, `background-color: ${base};`)
      break
    }
    default:
      return ''
  }
  return `@keyframes ${name} {\n${lines.join('\n')}\n}`
}

const ITEM_FILL = 'var(--pl-fill, rgba(31, 31, 31, 0.6))'
const ITEM_STROKE = 'var(--ds-border-default, rgba(255, 255, 255, 0.1))'

/** Wave recolors a layer, so the card fill and stroke each swell from their own color toward the highlight. */
function swellKeyframes(c: PlaygroundConfig, s: Schedule, name: string, color: string): string {
  const p = s.periodMs > 0 ? s.motionMs / s.periodMs : 1
  const peak = `color-mix(in srgb, ${color}, ${c.appearance.highlightColor} ${+c.appearance.shimmerIntensity.toFixed(1)}%)`
  const lines = [`  0% { background-color: ${color}; }`, `  ${pct(p / 2)} { background-color: ${peak}; }`, `  ${pct(p)} { background-color: ${color}; }`]
  if (p < 0.9995) lines.push(`  100% { background-color: ${color}; }`)
  return `@keyframes ${name} {\n${lines.join('\n')}\n}`
}

/** Mirror `.card::before` / `.card::after` in the preview so exported items animate the same way. */
const EXPORT_LAYER = ["content: '';", 'position: absolute;', 'inset: 0;', 'border-radius: inherit;', 'pointer-events: none;']
const EXPORT_FILL = [...EXPORT_LAYER, 'z-index: -1;', `background-color: ${ITEM_FILL};`]
const EXPORT_STROKE = [
  ...EXPORT_LAYER,
  'padding: 1px;',
  `background-color: ${ITEM_STROKE};`,
  '-webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);',
  '-webkit-mask-composite: xor;',
  'mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);',
]

/**
 * CSS that drives the preview. `motion` is false for Static mode, the Static Skeleton type,
 * or when reduced motion suppresses playback.
 */
export function buildAnimationCss(
  c: PlaygroundConfig,
  s: Schedule,
  t: CssTargets,
  opts: { motion: boolean; forExport?: boolean; sweep?: SweepRange },
): string {
  const ap = c.appearance
  const a = c.animation
  const motion = opts.motion && isMotionConfig(c)
  const bone: string[] = [`background-color: ${rgba(ap.baseColor, ap.baseAlpha)};`]
  if (ap.fillFade) {
    const mask = 'linear-gradient(90deg, #000 0%, rgba(0, 0, 0, 0.5) 100%)'
    bone.push(`-webkit-mask-image: ${mask};`, `mask-image: ${mask};`)
  }

  if (!motion) {
    bone.push('animation: none;')
    return `${t.root} ${t.bone} {\n  ${bone.join('\n  ')}\n}`
  }

  const sweep = opts.sweep ?? {
    from: `var(--pl-sweep-from, -${ap.shimmerBand}px)`,
    to: 'var(--pl-sweep-to, 100vw)',
  }

  const highlight = (alpha: number) => rgba(ap.highlightColor, Math.min(1, alpha))
  const shimmerLayers = (alpha: number): string[] => {
    if (isLayoutSweep(c)) {
      return [
        `background-image: linear-gradient(90deg, transparent 0%, ${highlight(alpha)} 50%, transparent 100%);`,
        `background-size: ${ap.shimmerBand}px 100%;`,
        'background-repeat: no-repeat;',
        '/* Anchored to the viewport so one band crosses every shape at the same speed. */',
        'background-attachment: fixed;',
      ]
    }
    if (a.type !== 'shimmer') return []
    const half = ap.shimmerWidth / 6
    return [
      `background-image: linear-gradient(${ap.shimmerAngle}deg, transparent ${+(50 - half).toFixed(2)}%, ${highlight(alpha)} 50%, transparent ${+(50 + half).toFixed(2)}%);`,
      'background-size: 300% 300%;',
      'background-repeat: no-repeat;',
    ]
  }
  const timing = (name: string) => {
    const out = [
      `animation-name: ${name};`,
      `animation-duration: ${ms(s.periodMs)};`,
      `animation-timing-function: ${easingCss(a)};`,
      'animation-delay: var(--pl-delay, 0ms);',
      `animation-iteration-count: ${a.infinite ? 'infinite' : a.iterationCount};`,
      `animation-direction: ${a.direction};`,
      'animation-fill-mode: both;',
    ]
    if (!opts.forExport) out.push('animation-play-state: var(--pl-play-state, running);')
    return out
  }

  const intensity = ap.shimmerIntensity / 100
  bone.push(...shimmerLayers(intensity), ...timing(t.name))

  // The whole card or row (fill and stroke) runs the placeholders' animation: it fades and
  // pulses with them, the same shimmer band crosses it, and Wave swells it toward the highlight.
  const wave = a.type === 'wave'
  const fill = [
    ...(opts.forExport ? EXPORT_FILL : []),
    ...shimmerLayers(intensity),
    ...timing(wave ? `${t.name}-fill` : t.name),
  ]
  const stroke = [
    ...(opts.forExport ? EXPORT_STROKE : []),
    ...shimmerLayers(intensity),
    ...timing(wave ? `${t.name}-stroke` : t.name),
  ]
  const rule = (sel: string, body: string[]) => `${sel} {\n  ${body.join('\n  ')}\n}`

  let css = [
    rule(`${t.root} ${t.bone}`, bone),
    rule(`${t.root} ${t.item}::before`, fill),
    rule(`${t.root} ${t.item}::after`, stroke),
    keyframes(c, s, t.name, sweep),
  ].join('\n\n')
  if (wave) {
    css += `\n\n${swellKeyframes(c, s, `${t.name}-fill`, ITEM_FILL)}\n\n${swellKeyframes(c, s, `${t.name}-stroke`, ITEM_STROKE)}`
  }

  if (opts.forExport) {
    if (isLayoutSweep(c)) {
      css += `\n\n/* Set the sweep to the container's viewport x-range, e.g. from: (left - ${ap.shimmerBand}px), to: (left + width). */\n${t.root} {\n  --pl-sweep-from: -${ap.shimmerBand}px;\n  --pl-sweep-to: 100vw;\n  --pl-delay: ${ms(s.baseDelayMs)};\n}`
    } else {
      const delays = s.items
        .map((it) => `${t.root} ${t.item}:nth-child(${it.index + 1}) { --pl-delay: ${ms(it.delayMs)}; }`)
        .join('\n')
      css += `\n\n/* Per-item delays for ${s.items.length} items in ${s.columns} column(s). */\n${delays}`
    }
    css += `\n\n/* ${t.item}::before paints the item fill and ${t.item}::after its stroke, so the whole item animates.\n * Give ${t.item} position: relative; isolation: isolate; and no background or border of its own.\n * Set --pl-fill to the item color. For divider-only list rows give ::after padding: 0 0 1px. */`
    css += `\n\n@media (prefers-reduced-motion: reduce) {\n  ${t.root} ${t.bone},\n  ${t.root} ${t.item}::before,\n  ${t.root} ${t.item}::after {\n    animation: none;\n    background-image: none;\n  }\n}`
  }
  return css
}

export function describeTiming(c: PlaygroundConfig, s: Schedule): string {
  const a = c.animation
  if (isLayoutSweep(c)) {
    return `One ${c.appearance.shimmerBand}px band crosses ${s.sweepPx}px at ${c.appearance.shimmerSpeed}px/s (${ms(s.motionMs)}), then rests until the ${ms(s.cycleMs)} loop ends.`
  }
  if (a.sequencing === 'sync') return 'All items start together.'
  const order = `${ORDER_LABELS[a.order]}${a.reverseOrder ? ', reversed' : ''}`
  if (a.sequencing === 'linear') {
    return `Item delay = ${ms(s.baseDelayMs)} + step × ${ms(s.stepIntervalMs)} (${order}).`
  }
  return `Group delay = ${ms(s.baseDelayMs)} + group × ${ms(s.stepIntervalMs)}; ${a.groupSize} items per group (${order}).`
}

export function buildExportCss(c: PlaygroundConfig, s: Schedule): string {
  const a = c.animation
  const seq = effectiveSequencing(c)
  const label = isLayoutSweep(c) ? 'Llumen DS layout sweep' : SEQUENCING_LABELS[seq]
  const header = isMotionConfig(c)
    ? `/* Phantom loading — ${TYPE_LABELS[a.type]} · ${label}\n * ${describeTiming(c, s)}\n * One CSS iteration = ${ms(s.periodMs)} (${a.repeat === 'sequence' && seq !== 'sync' ? 'whole sequence' : 'per item'}).\n */`
    : '/* Phantom loading — static skeleton (no animation). */'
  return `${header}\n${buildAnimationCss(
    c,
    s,
    { root: '.skeleton', item: '.skeleton-item', bone: '.skeleton-bone', name: `skeleton-${a.type}` },
    { motion: true, forExport: true },
  )}\n`
}

type AnimKey = keyof PlaygroundConfig['animation']
type AppKey = keyof PlaygroundConfig['appearance']

const ANIM_FIELDS: [AnimKey, PropKey | null][] = [
  ['mode', null],
  ['type', 'type'],
  ['sequencing', 'sequencing'],
  ['repeat', 'repeat'],
  ['order', 'order'],
  ['reverseOrder', 'order'],
  ['groupSize', 'groupSize'],
  ['groupOverlap', 'groupOverlap'],
  ['durationMs', 'durationMs'],
  ['delayMs', 'delayMs'],
  ['staggerMs', 'staggerMs'],
  ['groupDelayMs', 'groupDelayMs'],
  ['easing', 'easing'],
  ['customBezier', 'easing'],
  ['direction', 'direction'],
  ['infinite', 'iterations'],
  ['iterationCount', 'iterations'],
  ['playbackSpeed', 'playbackSpeed'],
]

const APP_FIELDS: [AppKey, PropKey | null][] = [
  ['baseColor', null],
  ['baseAlpha', null],
  ['fillFade', null],
  ['highlightColor', 'highlightColor'],
  ['opacityMin', 'opacity'],
  ['opacityMax', 'opacity'],
  ['shimmerScope', 'shimmerScope'],
  ['shimmerIntensity', 'shimmerIntensity'],
  ['shimmerSpeed', 'shimmerSpeed'],
  ['shimmerBand', 'shimmerBand'],
  ['shimmerDurationMs', 'shimmerDurationMs'],
  ['shimmerAngle', 'shimmerAngle'],
  ['shimmerWidth', 'shimmerWidth'],
  ['pulseIntensity', 'pulseIntensity'],
]

export function buildExportObject(c: PlaygroundConfig, s: Schedule, activeOnly: boolean) {
  const app = applicability(c)
  const keep = (k: PropKey | null) => !activeOnly || k === null || app[k] === true
  const animation: Record<string, unknown> = {}
  for (const [field, prop] of ANIM_FIELDS) {
    if (!keep(prop)) continue
    if (field === 'customBezier' && c.animation.easing !== 'custom') continue
    if (field === 'iterationCount' && c.animation.infinite && activeOnly) continue
    animation[field] = c.animation[field]
  }
  const appearance: Record<string, unknown> = {}
  for (const [field, prop] of APP_FIELDS) {
    if (keep(prop)) appearance[field] = c.appearance[field]
  }
  const motion = isMotionConfig(c)
  return {
    schema: 'phantom-loading-playground/v1',
    layout: c.layout,
    animation,
    appearance,
    derived: motion
      ? {
          renderedColumns: s.columns,
          easingCss: easingCss(c.animation),
          cycleMs: s.cycleMs,
          motionMs: s.motionMs,
          iterationMs: s.periodMs,
          steps: s.steps,
          stepIntervalMs: s.stepIntervalMs,
          ...(isLayoutSweep(c)
            ? { layoutSweep: { travelPx: s.sweepPx, sweepMs: s.motionMs } }
            : { itemDelaysMs: s.items.map((it) => it.delayMs) }),
        }
      : { renderedColumns: s.columns, animated: false },
  }
}
