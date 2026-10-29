import { useCallback, useMemo, useReducer, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { ArrowClockwise, ArrowCounterClockwise, Pause, Play, Rows, SquaresFour } from '@phosphor-icons/react'
import {
  DEFAULT_CONFIG,
  isLayoutSweep,
  isMotionConfig,
  SEQUENCING_LABELS,
  TYPE_LABELS,
  type AnimationConfig,
  type AppearanceConfig,
  type LayoutConfig,
  type PlaygroundConfig,
} from './config'
import { ControlPanel, type PanelActions } from './ControlPanel'
import { PreviewPane } from './PreviewPane'
import { computeSchedule } from './schedule'
import styles from './PhantomPlayground.module.css'

type Action =
  | { type: 'layout'; patch: Partial<LayoutConfig> }
  | { type: 'shapes'; patch: Partial<LayoutConfig['shapes']> }
  | { type: 'animation'; patch: Partial<AnimationConfig> }
  | { type: 'appearance'; patch: Partial<AppearanceConfig> }
  | { type: 'replace'; config: PlaygroundConfig }

function reducer(state: PlaygroundConfig, action: Action): PlaygroundConfig {
  switch (action.type) {
    case 'layout':
      return { ...state, layout: { ...state.layout, ...action.patch } }
    case 'shapes':
      return { ...state, layout: { ...state.layout, shapes: { ...state.layout.shapes, ...action.patch } } }
    case 'animation':
      return { ...state, animation: { ...state.animation, ...action.patch } }
    case 'appearance':
      return { ...state, appearance: { ...state.appearance, ...action.patch } }
    case 'replace':
      return action.config
  }
}

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'
function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const getReduced = () => window.matchMedia(REDUCED_QUERY).matches

type Scenario =
  | 'ds-element'
  | 'static-animated'
  | 'linear-bulk'
  | 'shimmer-pulse'
  | 'fast-slow'
  | 'all-types'
  | 'pinned'

const SCENARIOS: { id: Scenario; label: string }[] = [
  { id: 'ds-element', label: 'DS layout sweep vs Per-placeholder' },
  { id: 'static-animated', label: 'Static vs Animated' },
  { id: 'linear-bulk', label: 'Linear vs Bulk-by-Bulk' },
  { id: 'shimmer-pulse', label: 'Shimmer vs Pulse' },
  { id: 'fast-slow', label: 'Fast vs Slow' },
  { id: 'all-types', label: 'All animation types' },
  { id: 'pinned', label: 'Pinned (A) vs Current (B)' },
]

interface PaneSpec {
  id: string
  title: string
  config: PlaygroundConfig
}

function animated(
  c: PlaygroundConfig,
  patch: Partial<AnimationConfig>,
  appearance?: Partial<AppearanceConfig>,
): PlaygroundConfig {
  return {
    ...c,
    animation: {
      ...c.animation,
      mode: 'animated',
      type: c.animation.type === 'none' ? 'shimmer' : c.animation.type,
      ...patch,
    },
    appearance: { ...c.appearance, ...appearance },
  }
}

function scenarioPanes(s: Scenario, c: PlaygroundConfig, pinned: PlaygroundConfig | null): PaneSpec[] {
  switch (s) {
    case 'ds-element':
      return [
        { id: 'cmp-ds', title: 'Llumen DS · layout sweep', config: animated(c, { type: 'shimmer' }, { shimmerScope: 'layout' }) },
        { id: 'cmp-element', title: 'Per placeholder', config: animated(c, { type: 'shimmer' }, { shimmerScope: 'element' }) },
      ]
    case 'static-animated':
      return [
        { id: 'cmp-static', title: 'Static', config: { ...c, animation: { ...c.animation, mode: 'static' } } },
        { id: 'cmp-animated', title: 'Animated', config: animated(c, {}) },
      ]
    case 'linear-bulk':
      return [
        { id: 'cmp-linear', title: 'Linear', config: animated(c, { sequencing: 'linear' }, { shimmerScope: 'element' }) },
        { id: 'cmp-bulk', title: 'Bulk-by-Bulk', config: animated(c, { sequencing: 'bulk' }, { shimmerScope: 'element' }) },
      ]
    case 'shimmer-pulse':
      return [
        { id: 'cmp-shimmer', title: 'Shimmer', config: animated(c, { type: 'shimmer' }) },
        { id: 'cmp-pulse', title: 'Pulse', config: animated(c, { type: 'pulse' }) },
      ]
    case 'fast-slow':
      return [
        { id: 'cmp-fast', title: 'Fast (2× speed)', config: animated(c, { playbackSpeed: 2 }) },
        { id: 'cmp-slow', title: 'Slow (0.5× speed)', config: animated(c, { playbackSpeed: 0.5 }) },
      ]
    case 'all-types':
      return (['shimmer', 'pulse', 'fade', 'wave'] as const).map((t) => ({
        id: `cmp-${t}`,
        title: TYPE_LABELS[t],
        config: animated(c, { type: t }),
      }))
    case 'pinned':
      return pinned
        ? [
            { id: 'cmp-a', title: 'A · Pinned', config: { ...pinned, layout: c.layout } },
            { id: 'cmp-b', title: 'B · Current', config: c },
          ]
        : []
  }
}

const LAYOUTS = ['grid', 'list'] as const

function withLayout(c: PlaygroundConfig, type: LayoutConfig['type']): PlaygroundConfig {
  return c.layout.type === type ? c : { ...c, layout: { ...c.layout, type } }
}

/** Every scenario pane rendered once per layout: grid row first, then list row. */
function bothLayouts(panes: PaneSpec[]): PaneSpec[] {
  return LAYOUTS.flatMap((type) =>
    panes.map((p) => ({
      id: `${p.id}-${type}`,
      title: `${p.title} · ${type === 'grid' ? 'Grid' : 'List'}`,
      config: withLayout(p.config, type),
    })),
  )
}

function summarize(c: PlaygroundConfig): string {
  const a = c.animation
  if (!isMotionConfig(c)) return a.mode === 'static' ? 'static mode' : 'static skeleton'
  if (isLayoutSweep(c)) {
    return `shimmer · DS sweep ${c.appearance.shimmerSpeed}px/s · ${a.durationMs}ms · ${a.playbackSpeed}×`
  }
  const seq =
    a.sequencing === 'linear'
      ? `linear ${a.staggerMs}ms`
      : a.sequencing === 'bulk'
        ? `bulk ${a.groupSize} · ${a.groupOverlap}`
        : SEQUENCING_LABELS.sync.toLowerCase()
  return `${TYPE_LABELS[a.type].toLowerCase()} · ${seq} · ${a.durationMs}ms · ${a.playbackSpeed}×`
}

export function PhantomPlayground() {
  const [config, dispatch] = useReducer(reducer, DEFAULT_CONFIG)
  const [playing, setPlaying] = useState(true)
  const [runId, setRunId] = useState(0)
  const [view, setView] = useState<'single' | 'compare'>('single')
  const [scenario, setScenario] = useState<Scenario>('ds-element')
  const [showBoth, setShowBoth] = useState(false)
  const [pinned, setPinned] = useState<PlaygroundConfig | null>(null)
  const [showLabels, setShowLabels] = useState(false)
  const [showTimeline, setShowTimeline] = useState(true)
  const [mainBox, setMainBox] = useState({ columns: DEFAULT_CONFIG.layout.columns, width: 0 })
  const onMainMeasure = useCallback(
    (columns: number, width: number) =>
      setMainBox((b) => (b.columns === columns && b.width === width ? b : { columns, width })),
    [],
  )
  const [finishedRun, setFinishedRun] = useState<number | null>(null)
  const [motionOverride, setMotionOverride] = useState(false)
  const prefersReduced = useSyncExternalStore(subscribeReduced, getReduced, () => false)
  const motionAllowed = !prefersReduced || motionOverride

  const actions: PanelActions = useMemo(
    () => ({
      layout: (patch) => dispatch({ type: 'layout', patch }),
      shapes: (patch) => dispatch({ type: 'shapes', patch }),
      animation: (patch) => dispatch({ type: 'animation', patch }),
      appearance: (patch) => dispatch({ type: 'appearance', patch }),
      replace: (c) => {
        dispatch({ type: 'replace', config: c })
        setRunId((r) => r + 1)
      },
      reset: () => {
        dispatch({ type: 'replace', config: DEFAULT_CONFIG })
        setPlaying(true)
        setRunId((r) => r + 1)
      },
      pin: () => {
        setPinned(config)
        setScenario('pinned')
      },
    }),
    [config],
  )

  const restart = () => {
    setPlaying(true)
    setRunId((r) => r + 1)
  }

  const schedule = useMemo(
    () => computeSchedule(config, mainBox.columns, mainBox.width),
    [config, mainBox.columns, mainBox.width],
  )
  const scenarioSpecs = useMemo(() => scenarioPanes(scenario, config, pinned), [scenario, config, pinned])
  const panes = useMemo(() => (showBoth ? bothLayouts(scenarioSpecs) : scenarioSpecs), [showBoth, scenarioSpecs])
  const onFinished = useCallback(() => setFinishedRun(runId), [runId])
  const onActive = useCallback(() => setFinishedRun(null), [])

  const motion = isMotionConfig(config)
  const isFinished = motion && !config.animation.infinite && finishedRun === runId
  const status = !motion
    ? { text: config.animation.mode === 'static' ? 'Static — no motion' : 'Static skeleton — no motion', tone: 'idle' }
    : !motionAllowed
      ? { text: 'Reduced motion — not playing', tone: 'idle' }
      : isFinished
        ? { text: `Finished after ${config.animation.iterationCount}×`, tone: 'idle' }
        : playing
          ? { text: 'Playing', tone: 'live' }
          : { text: 'Paused', tone: 'paused' }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>Phantom Loading Playground</h1>
          <p className={styles.subtitle}>Configure, preview, and compare skeleton loading animations.</p>
        </div>
        <div className={styles.playback} role="group" aria-label="Playback">
          <span className={`${styles.status} ${styles[`status_${status.tone}`]}`} role="status">
            {status.text}
          </span>
          <button
            type="button"
            className={`${styles.btn} ${playing ? styles.btnOn : ''}`}
            aria-pressed={playing}
            title={motion ? 'Play' : 'Static configurations never animate'}
            onClick={() => (isFinished ? restart() : setPlaying(true))}
          >
            <Play size={14} weight="fill" /> Play
          </button>
          <button
            type="button"
            className={`${styles.btn} ${!playing ? styles.btnOn : ''}`}
            aria-pressed={!playing}
            onClick={() => setPlaying(false)}
          >
            <Pause size={14} weight="fill" /> Pause
          </button>
          <button type="button" className={styles.btn} title="Restart from the initial state" onClick={restart}>
            <ArrowClockwise size={14} /> Restart
          </button>
          <button type="button" className={styles.btn} title="Restore every setting to its default" onClick={actions.reset}>
            <ArrowCounterClockwise size={14} /> Reset to defaults
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.stage}>
          <div className={styles.toolbar}>
            <div className={styles.toolGroup} role="radiogroup" aria-label="Layout">
              {LAYOUTS.map((type) => {
                const on = !showBoth && config.layout.type === type
                return (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`${styles.tool} ${on ? styles.toolOn : ''}`}
                    onClick={() => {
                      setShowBoth(false)
                      actions.layout({ type })
                    }}
                  >
                    {type === 'grid' ? <SquaresFour size={14} /> : <Rows size={14} />}
                    {type === 'grid' ? 'Grid' : 'List'}
                  </button>
                )
              })}
              <button
                type="button"
                role="radio"
                aria-checked={showBoth}
                title="Play the same animation in Grid and List side by side"
                className={`${styles.tool} ${showBoth ? styles.toolOn : ''}`}
                onClick={() => setShowBoth(true)}
              >
                <SquaresFour size={14} />
                <Rows size={14} /> Grid + List
              </button>
            </div>
            <div className={styles.toolGroup} role="radiogroup" aria-label="View">
              {(['single', 'compare'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={view === v}
                  className={`${styles.tool} ${view === v ? styles.toolOn : ''}`}
                  onClick={() => setView(v)}
                >
                  {v === 'single' ? 'Single' : 'Compare'}
                </button>
              ))}
            </div>
            {view === 'compare' && (
              <select
                className={styles.toolSelect}
                aria-label="Comparison"
                value={scenario}
                onChange={(e) => setScenario(e.target.value as Scenario)}
              >
                {SCENARIOS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}
            <span className={styles.toolSpacer} />
            <label className={styles.check}>
              <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
              Timing labels
            </label>
            {view === 'single' && (
              <label className={styles.check}>
                <input type="checkbox" checked={showTimeline} onChange={(e) => setShowTimeline(e.target.checked)} />
                Timeline
              </label>
            )}
          </div>

          {prefersReduced && (
            <div className={styles.banner} role="note">
              {motionOverride
                ? 'Previewing motion even though your system requests reduced motion.'
                : 'Your system requests reduced motion, so previews are shown without animation.'}
              <button type="button" className={styles.bannerBtn} onClick={() => setMotionOverride((v) => !v)}>
                {motionOverride ? 'Stop motion' : 'Preview motion anyway'}
              </button>
            </div>
          )}

          {view === 'single' ? (
            <div className={`${styles.panes} ${showBoth ? styles.panesPair : ''}`}>
              {(showBoth ? LAYOUTS : [config.layout.type]).map((type) => {
                // The pane matching the edited layout drives the export schedule and finish detection.
                const main = type === config.layout.type
                return (
                  <PreviewPane
                    key={type}
                    paneId={main ? 'main' : `alt-${type}`}
                    config={withLayout(config, type)}
                    playing={playing}
                    runId={runId}
                    motionAllowed={motionAllowed}
                    showLabels={showLabels}
                    showTimeline={showTimeline}
                    title={showBoth ? (type === 'grid' ? 'Grid' : 'List') : undefined}
                    subtitle={showBoth && main ? 'settings you are editing' : undefined}
                    onMeasure={main ? onMainMeasure : undefined}
                    onFinished={main ? onFinished : undefined}
                    onActive={main ? onActive : undefined}
                  />
                )
              })}
            </div>
          ) : panes.length === 0 ? (
            <div className={styles.empty}>
              Nothing pinned yet. Open <strong>Presets → A / B snapshot</strong> and pin the current settings, then keep
              editing to compare.
            </div>
          ) : (
            <div
              className={`${styles.panes} ${
                showBoth ? styles.panesMatrix : panes.length > 2 ? styles.panesQuad : styles.panesPair
              }`}
              style={showBoth ? ({ '--cmp-cols': scenarioSpecs.length } as CSSProperties) : undefined}
            >
              {panes.map((p) => (
                <PreviewPane
                  key={p.id}
                  paneId={p.id}
                  config={p.config}
                  playing={playing}
                  runId={runId}
                  motionAllowed={motionAllowed}
                  showLabels={showLabels}
                  title={p.title}
                  subtitle={summarize(p.config)}
                />
              ))}
            </div>
          )}
        </div>

        <ControlPanel
          config={config}
          schedule={schedule}
          motionAllowed={motionAllowed}
          pinned={pinned}
          actions={actions}
          bothLayouts={showBoth}
        />
      </main>
    </div>
  )
}
