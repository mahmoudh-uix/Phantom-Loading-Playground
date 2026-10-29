import type { CSSProperties } from 'react'
import { easingBezier, easingCss, EASING_OPTIONS, type AnimationConfig, type Bezier, type EasingId } from './config'
import { SelectField, SliderField, type Applies } from './controls'
import styles from './Controls.module.css'

const W = 160
const H = 110
const PAD_Y = 22

function toSvg(x: number, y: number): [number, number] {
  return [x * W, PAD_Y + (1 - y) * (H - 2 * PAD_Y)]
}

interface Props {
  animation: AnimationConfig
  applies: Applies
  animateDemo: boolean
  onEasing: (e: EasingId) => void
  onBezier: (b: Bezier) => void
}

export function EasingEditor({ animation, applies, animateDemo, onEasing, onBezier }: Props) {
  const [x1, y1, x2, y2] = easingBezier(animation)
  const p0 = toSvg(0, 0)
  const p1 = toSvg(x1, y1)
  const p2 = toSvg(x2, y2)
  const p3 = toSvg(1, 1)
  const disabled = applies !== true
  const custom = animation.easing === 'custom'
  const css = easingCss(animation)

  const setPoint = (i: number, v: number) => {
    const next = [...animation.customBezier] as Bezier
    next[i] = v
    onBezier(next)
  }

  const demo = {
    animationTimingFunction: css,
    animationDuration: `${Math.max(300, animation.durationMs / animation.playbackSpeed)}ms`,
  } as CSSProperties

  return (
    <div className={styles.easing}>
      <SelectField
        label="Easing"
        tip="Timing function applied to each motion segment of the keyframes."
        value={animation.easing}
        applies={applies}
        options={EASING_OPTIONS.map((e) => ({ value: e.id, label: e.label }))}
        onChange={onEasing}
      />
      <div className={`${styles.curveRow} ${disabled ? styles.disabled : ''}`}>
        <svg className={styles.curve} viewBox={`-6 0 ${W + 12} ${H}`} role="img" aria-label={`Easing curve ${css}`}>
          <line x1={p0[0]} y1={p0[1]} x2={p3[0]} y2={p0[1]} className={styles.curveAxis} />
          <line x1={p0[0]} y1={p3[1]} x2={p3[0]} y2={p3[1]} className={styles.curveAxis} />
          <line x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]} className={styles.curveHandle} />
          <line x1={p3[0]} y1={p3[1]} x2={p2[0]} y2={p2[1]} className={styles.curveHandle} />
          <path
            d={`M ${p0[0]} ${p0[1]} C ${p1[0]} ${p1[1]}, ${p2[0]} ${p2[1]}, ${p3[0]} ${p3[1]}`}
            className={styles.curvePath}
          />
          <circle cx={p1[0]} cy={p1[1]} r={3.5} className={styles.curvePoint} />
          <circle cx={p2[0]} cy={p2[1]} r={3.5} className={styles.curvePoint} />
        </svg>
        <div className={styles.easingDemo}>
          <code className={styles.easingCode}>{css}</code>
          <div className={styles.demoTrack} aria-hidden="true">
            <span className={`${styles.demoBall} ${animateDemo && !disabled ? styles.demoBallOn : ''}`} style={demo} />
          </div>
        </div>
      </div>
      {custom && (
        <div className={styles.bezierGrid}>
          <SliderField label="x1" value={x1} min={0} max={1} step={0.01} applies={applies} onChange={(v) => setPoint(0, v)} />
          <SliderField label="y1" value={y1} min={-1} max={2} step={0.01} applies={applies} onChange={(v) => setPoint(1, v)} />
          <SliderField label="x2" value={x2} min={0} max={1} step={0.01} applies={applies} onChange={(v) => setPoint(2, v)} />
          <SliderField label="y2" value={y2} min={-1} max={2} step={0.01} applies={applies} onChange={(v) => setPoint(3, v)} />
        </div>
      )}
    </div>
  )
}
