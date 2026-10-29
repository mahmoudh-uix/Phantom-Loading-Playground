import { useEffect, useRef, useState } from 'react'
import {
  ArrowCounterClockwise,
  Check,
  Copy,
  CopySimple,
  DownloadSimple,
  FloppyDisk,
  PencilSimple,
  Plus,
  PushPin,
  Trash,
  UploadSimple,
} from '@phosphor-icons/react'
import {
  applicability,
  applyPreset,
  DEFAULT_CONFIG,
  isLayoutSweep,
  ORDER_LABELS,
  PRESETS,
  sameAnimation,
  TYPE_LABELS,
  type AnimationConfig,
  type AnimationType,
  type AppearanceConfig,
  type LayoutConfig,
  type PlaygroundConfig,
  type Preset,
  type SequenceOrder,
} from './config'
import { buildExportCss, buildExportObject } from './css'
import { ColorField, Section, Segmented, SelectField, SliderField, ToggleField } from './controls'
import { EasingEditor } from './EasingEditor'
import { PresetDialog } from './PresetDialog'
import {
  changedFields,
  exportPresets,
  isCustomActive,
  parsePresetFile,
  presetTarget,
  summarizeConfig,
  uniqueName,
  useCustomPresets,
  type CustomPreset,
} from './customPresets'
import type { Schedule } from './schedule'
import { copyText, downloadText } from './clipboard'
import { useRevealScrollbarOnScroll } from './useRevealScrollbarOnScroll'
import styles from './Controls.module.css'

type Tab = 'layout' | 'animation' | 'presets' | 'export'

const TABS: { id: Tab; label: string }[] = [
  { id: 'layout', label: 'Layout' },
  { id: 'animation', label: 'Animation' },
  { id: 'presets', label: 'Presets' },
  { id: 'export', label: 'Export' },
]

export interface PanelActions {
  layout: (p: Partial<LayoutConfig>) => void
  shapes: (p: Partial<LayoutConfig['shapes']>) => void
  animation: (p: Partial<AnimationConfig>) => void
  appearance: (p: Partial<AppearanceConfig>) => void
  replace: (c: PlaygroundConfig) => void
  reset: () => void
  pin: () => void
}

interface Props {
  config: PlaygroundConfig
  schedule: Schedule
  motionAllowed: boolean
  pinned: PlaygroundConfig | null
  actions: PanelActions
  /** Preview shows Grid and List together; the Layout switch then picks which settings are edited. */
  bothLayouts?: boolean
}

export function ControlPanel({ config, schedule, motionAllowed, pinned, actions, bothLayouts }: Props) {
  const [tab, setTab] = useState<Tab>('animation')
  const scrollRef = useRevealScrollbarOnScroll()
  const custom = useCustomPresets()

  return (
    <aside className={styles.panel} aria-label="Playground settings">
      <div className={styles.tabs} role="tablist" aria-label="Settings groups">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`pl-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="pl-tabpanel"
            className={`${styles.tab} ${tab === t.id ? styles.tabOn : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        ref={scrollRef}
        className={styles.panelScroll}
        role="tabpanel"
        id="pl-tabpanel"
        aria-labelledby={`pl-tab-${tab}`}
      >
        <div className={styles.panelInner}>
          {tab === 'layout' && (
            <LayoutTab config={config} schedule={schedule} actions={actions} bothLayouts={bothLayouts} />
          )}
          {tab === 'animation' && (
            <AnimationTab config={config} schedule={schedule} motionAllowed={motionAllowed} actions={actions} />
          )}
          {tab === 'presets' && (
            <PresetsTab
              config={config}
              pinned={pinned}
              actions={actions}
              custom={custom}
              motionAllowed={motionAllowed}
              bothLayouts={bothLayouts}
            />
          )}
          {tab === 'export' && <ExportTab config={config} schedule={schedule} actions={actions} />}
        </div>
      </div>
    </aside>
  )
}

export function LayoutTab({
  config,
  schedule,
  actions,
  bothLayouts,
}: {
  config: PlaygroundConfig
  schedule: Schedule
  actions: PanelActions
  bothLayouts?: boolean
}) {
  const l = config.layout
  const grid = l.type === 'grid'
  const listOnly = 'Grid only — List rows span the full width.'
  return (
    <>
      <Section
        title="Structure"
        note={
          bothLayouts
            ? 'Grid + List is on: both previews share every setting. This switch only picks which layout’s settings are listed below.'
            : null
        }
      >
        <Segmented
          label={bothLayouts ? 'Editing' : 'Layout'}
          value={l.type}
          options={[
            { value: 'grid', label: 'Grid' },
            { value: 'list', label: 'List' },
          ]}
          onChange={(type) => actions.layout({ type })}
        />
        <SliderField
          label="Columns"
          tip={`Maximum columns. Cards never shrink below 140px, so narrow canvases render fewer (currently ${schedule.columns}).`}
          value={l.columns}
          min={1}
          max={8}
          applies={grid ? true : listOnly}
          format={(v) => (grid && v !== schedule.columns ? `${v} (showing ${schedule.columns})` : String(v))}
          onChange={(columns) => actions.layout({ columns })}
        />
        <SliderField
          label="Items"
          value={l.itemCount}
          min={1}
          max={48}
          onChange={(itemCount) => actions.layout({ itemCount })}
        />
        {grid ? (
          <SliderField
            label="Card height"
            value={l.cardHeight}
            min={120}
            max={420}
            step={4}
            unit="px"
            onChange={(cardHeight) => actions.layout({ cardHeight })}
          />
        ) : (
          <SliderField
            label="Row height"
            value={l.rowHeight}
            min={40}
            max={160}
            step={2}
            unit="px"
            onChange={(rowHeight) => actions.layout({ rowHeight })}
          />
        )}
        <SliderField
          label="Horizontal gap"
          value={l.gapX}
          min={0}
          max={48}
          unit="px"
          applies={grid ? true : listOnly}
          onChange={(gapX) => actions.layout({ gapX })}
        />
        {grid ? (
          <SliderField
            label="Vertical gap"
            value={l.gapY}
            min={0}
            max={48}
            unit="px"
            onChange={(gapY) => actions.layout({ gapY })}
          />
        ) : (
          <SliderField
            label="Row gap"
            tip="0 renders the DS data table: rows divided by a border. Above 0, rows become separate rounded cards."
            value={l.listGap}
            min={0}
            max={32}
            unit="px"
            onChange={(listGap) => actions.layout({ listGap })}
          />
        )}
        <SliderField
          label={grid ? 'Card radius' : 'Row radius'}
          tip="DS radius/default is 12px."
          value={l.cardRadius}
          min={0}
          max={32}
          unit="px"
          applies={grid || l.listGap > 0 ? true : 'DS table rows are square. Add a row gap to round them.'}
          onChange={(cardRadius) => actions.layout({ cardRadius })}
        />
        <SliderField
          label="Line radius"
          tip="Lines and pills. DS radius/3xs is 4px. Avatars and action dots stay circular."
          value={l.boneRadius}
          min={0}
          max={16}
          unit="px"
          onChange={(boneRadius) => actions.layout({ boneRadius })}
        />
        <SliderField
          label="Block radius"
          tip="Thumbnails and content blocks. DS radius/2xs is 6px."
          value={l.blockRadius}
          min={0}
          max={24}
          unit="px"
          onChange={(blockRadius) => actions.layout({ blockRadius })}
        />
        <SliderField
          label="Padding"
          tip="Card content inset. DS spacing/lg is 12px."
          value={l.padding}
          min={0}
          max={32}
          unit="px"
          applies={grid ? true : 'List rows use the DS data-table cell padding (16px lead, 12px cells).'}
          onChange={(padding) => actions.layout({ padding })}
        />
        <ToggleField
          label="DS listing header"
          tip="Title bar, filter bar and (in List) the column header from the DS listing module. Visual only."
          checked={l.chrome}
          onChange={(chrome) => actions.layout({ chrome })}
        />
      </Section>
      <Section title="Placeholder shapes">
        <ToggleField
          label="Rectangular thumbnail"
          tip="Grid: full-bleed card media. List: 40px square."
          checked={l.shapes.thumbnail}
          onChange={(thumbnail) => actions.shapes({ thumbnail })}
        />
        <SliderField
          label="Data columns"
          tip="Category, Type, Status and Last updated cells of the DS listing row."
          value={l.shapes.dataColumns}
          min={0}
          max={4}
          applies={grid ? 'List only — the DS card has no data columns.' : true}
          onChange={(dataColumns) => actions.shapes({ dataColumns })}
        />
        <ToggleField
          label="Circular avatar"
          checked={l.shapes.avatar}
          onChange={(avatar) => actions.shapes({ avatar })}
        />
        <SliderField
          label="Avatar size"
          value={l.avatarSize}
          min={16}
          max={64}
          unit="px"
          applies={l.shapes.avatar ? true : 'Turn on the avatar to size it.'}
          onChange={(avatarSize) => actions.layout({ avatarSize })}
        />
        <SliderField
          label="Body text lines"
          value={l.shapes.textLines}
          min={0}
          max={5}
          onChange={(textLines) => actions.shapes({ textLines })}
        />
        <SliderField
          label="Line thickness"
          tip="DS phantom line is 12px."
          value={l.lineHeight}
          min={6}
          max={18}
          unit="px"
          onChange={(lineHeight) => actions.layout({ lineHeight })}
        />
        <ToggleField
          label="Content block"
          tip="Chart / media area. In List it renders as an extra cell."
          checked={l.shapes.contentBlock}
          onChange={(contentBlock) => actions.shapes({ contentBlock })}
        />
        {grid ? (
          <ToggleField
            label="Tags & action"
            tip="Two pills and a 24px action circle under the card text (not part of the DS card)."
            checked={l.shapes.tags}
            onChange={(tags) => actions.shapes({ tags })}
          />
        ) : (
          <ToggleField
            label="Row action"
            tip="Trailing 24px action circle (DS listing row)."
            checked={l.shapes.actions}
            onChange={(actions_) => actions.shapes({ actions: actions_ })}
          />
        )}
      </Section>
      <button type="button" className={styles.ghostBtn} onClick={() => actions.layout(DEFAULT_CONFIG.layout)}>
        <ArrowCounterClockwise size={14} /> Reset layout
      </button>
    </>
  )
}

const TYPE_HINTS: Record<AnimationType, string> = {
  shimmer: 'A soft highlight band sweeps left → right.',
  pulse: 'Placeholders dim and recover (opacity).',
  fade: 'Placeholders fade out, hold, and fade back in.',
  wave: 'A color swell travels from item to item.',
  none: 'Visible placeholders with no motion.',
}

export function AnimationTab({
  config,
  schedule,
  motionAllowed,
  actions,
}: {
  config: PlaygroundConfig
  schedule: Schedule
  motionAllowed: boolean
  actions: PanelActions
}) {
  const a = config.animation
  const ap = config.appearance
  const app = applicability(config)
  const list = config.layout.type === 'list'
  const listSame = 'In List this is the same as top → bottom.'
  const sweep = a.mode === 'animated' && isLayoutSweep(config)
  const stretched = sweep && schedule.motionMs > a.durationMs / Math.max(0.05, a.playbackSpeed) + 0.5

  const sequencingNote = sweep
    ? 'The Llumen DS shimmer is one light wave travelling across the whole layout, so shapes are timed by their horizontal position — not by item order. Set Sweep to “Per placeholder” to use Linear or Bulk-by-Bulk.'
    : a.mode === 'animated' && a.type === 'wave' && a.sequencing === 'sync'
      ? 'Wave needs Linear or Bulk-by-Bulk to travel — with All together every item swells at once.'
      : a.mode === 'animated' && a.type !== 'none'
        ? a.sequencing === 'linear'
          ? 'Linear: each step starts one stagger after the previous step, item by item.'
          : a.sequencing === 'bulk'
            ? `Bulk-by-Bulk: items are chunked into groups of ${a.groupSize}; every item in a group starts at the same moment.`
            : 'All items share one timeline.'
        : null

  return (
    <>
      <Section
        title="Mode"
        note={
          a.mode === 'static'
            ? 'Static: placeholders never move. Animation settings are kept and come back when you switch to Animated.'
            : null
        }
      >
        <Segmented
          label="Animation mode"
          value={a.mode}
          options={[
            { value: 'static', label: 'Static' },
            { value: 'animated', label: 'Animated' },
          ]}
          onChange={(mode) => actions.animation({ mode })}
        />
      </Section>

      <Section title="Animation type" note={a.mode === 'animated' ? TYPE_HINTS[a.type] : null}>
        <div className={styles.typeGrid} role="radiogroup" aria-label="Animation type">
          {(Object.keys(TYPE_LABELS) as AnimationType[]).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={a.type === t}
              disabled={app.type !== true}
              title={TYPE_HINTS[t]}
              className={`${styles.typeBtn} ${a.type === t ? styles.typeBtnOn : ''}`}
              onClick={() => actions.animation({ type: t })}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <Segmented
          label="Sweep"
          tip="Layout sweep (DS): one 200px band crosses the whole layout at a constant speed. Per placeholder: each shape gets its own sweep, which can be sequenced."
          value={ap.shimmerScope}
          applies={app.shimmerScope}
          showReason={a.mode === 'animated' && a.type === 'shimmer'}
          options={[
            {
              value: 'layout',
              label: 'Layout (DS)',
              title: 'Llumen DS phantom-shimmer',
            },
            {
              value: 'element',
              label: 'Per placeholder',
              title: 'Sweep each shape separately',
            },
          ]}
          onChange={(shimmerScope) => actions.appearance({ shimmerScope })}
        />
      </Section>

      <Section title="Sequencing" note={sequencingNote}>
        <Segmented
          label="Behavior"
          value={a.sequencing}
          applies={app.sequencing}
          showReason={a.mode === 'animated' && !sweep}
          options={[
            {
              value: 'linear',
              label: 'Linear',
              title: 'One item after another',
            },
            {
              value: 'bulk',
              label: 'Bulk-by-Bulk',
              title: 'Groups of items at once',
            },
            {
              value: 'sync',
              label: 'All together',
              title: 'Every item in unison',
            },
          ]}
          onChange={(sequencing) => actions.animation({ sequencing })}
        />
        <SelectField<SequenceOrder>
          label="Order"
          tip="Which items go first. Diagonal and Center group equidistant items into the same step."
          value={a.order}
          applies={app.order}
          options={(Object.keys(ORDER_LABELS) as SequenceOrder[]).map((o) => ({
            value: o,
            label: list && o === 'row' ? 'Top → bottom' : ORDER_LABELS[o],
            disabled: list && (o === 'column' || o === 'diagonal'),
            title: list && (o === 'column' || o === 'diagonal') ? listSame : undefined,
          }))}
          onChange={(order) => actions.animation({ order })}
        />
        <ToggleField
          label={list ? 'Reverse (bottom → top)' : 'Reverse order'}
          checked={a.reverseOrder}
          applies={app.order}
          onChange={(reverseOrder) => actions.animation({ reverseOrder })}
        />
        <Segmented
          label="Repeat"
          tip="Whole sequence: the full run finishes before it restarts (items idle while waiting). Each item: every item loops on its own cycle, keeping its offset."
          value={a.repeat}
          applies={app.repeat}
          options={[
            { value: 'sequence', label: 'Whole sequence' },
            { value: 'independent', label: 'Each item' },
          ]}
          onChange={(repeat) => actions.animation({ repeat })}
        />
        <SliderField
          label="Stagger"
          tip="Time between the start of consecutive items (Linear)."
          value={a.staggerMs}
          min={0}
          max={600}
          step={10}
          unit="ms"
          applies={app.staggerMs}
          onChange={(staggerMs) => actions.animation({ staggerMs })}
        />
        <SliderField
          label="Group size"
          tip="How many items animate together in each bulk."
          value={a.groupSize}
          min={1}
          max={Math.max(2, config.layout.itemCount)}
          unit="items"
          applies={app.groupSize}
          onChange={(groupSize) => actions.animation({ groupSize })}
        />
        <SliderField
          label="Group delay"
          tip="Sequential: pause after a group finishes before the next starts. Overlap: time between consecutive group starts."
          value={a.groupDelayMs}
          min={0}
          max={2000}
          step={10}
          unit="ms"
          applies={app.groupDelayMs}
          onChange={(groupDelayMs) => actions.animation({ groupDelayMs })}
        />
        <Segmented
          label="Groups"
          value={a.groupOverlap}
          applies={app.groupOverlap}
          showReason={a.sequencing === 'bulk'}
          options={[
            {
              value: 'sequential',
              label: 'Sequential',
              title: 'Next group waits for the previous one to finish',
            },
            {
              value: 'overlap',
              label: 'Overlap',
              title: 'Next group starts after the group delay, even mid-animation',
            },
          ]}
          onChange={(groupOverlap) => actions.animation({ groupOverlap })}
        />
      </Section>

      <Section title="Timing">
        <SliderField
          label="Duration"
          tip="Length of one cycle. For Shimmer this includes the rest after the sweep. DS loop is 2000ms."
          value={a.durationMs}
          min={200}
          max={5000}
          step={50}
          unit="ms"
          applies={app.durationMs}
          onChange={(durationMs) => actions.animation({ durationMs })}
        />
        <SliderField
          label="Delay"
          tip="Wait before the first item/group starts. Applies once per run — press Restart to see it."
          value={a.delayMs}
          min={0}
          max={3000}
          step={50}
          unit="ms"
          applies={app.delayMs}
          onChange={(delayMs) => actions.animation({ delayMs })}
        />
        <SliderField
          label="Playback speed"
          tip="Divides every duration and delay. 2× plays twice as fast."
          value={a.playbackSpeed}
          min={0.1}
          max={3}
          step={0.05}
          format={(v) => `${v}×`}
          unit="×"
          applies={app.playbackSpeed}
          onChange={(playbackSpeed) => actions.animation({ playbackSpeed })}
        />
        <SelectField
          label="Direction"
          tip="CSS animation-direction for each iteration."
          value={a.direction}
          applies={app.direction}
          options={[
            { value: 'normal', label: 'Forward' },
            { value: 'reverse', label: 'Reverse' },
            { value: 'alternate', label: 'Alternate' },
            { value: 'alternate-reverse', label: 'Alternate reverse' },
          ]}
          onChange={(direction) => actions.animation({ direction })}
        />
        <ToggleField
          label="Loop forever"
          checked={a.infinite}
          applies={app.iterations}
          onChange={(infinite) => actions.animation({ infinite })}
        />
        <SliderField
          label="Iterations"
          tip="Number of repetitions when not looping forever."
          value={a.iterationCount}
          min={1}
          max={20}
          unit="×"
          format={(v) => `${v}×`}
          applies={
            app.iterations !== true ? app.iterations : a.infinite ? 'Turn off “Loop forever” to set a count.' : true
          }
          onChange={(iterationCount) => actions.animation({ iterationCount })}
        />
      </Section>

      <Section title="Easing">
        <EasingEditor
          animation={a}
          applies={app.easing}
          animateDemo={motionAllowed}
          onEasing={(easing) => actions.animation({ easing })}
          onBezier={(customBezier) => actions.animation({ customBezier })}
        />
      </Section>

      <Section
        title="Appearance"
        note={
          stretched
            ? `Crossing this ${schedule.sweepPx}px canvas takes ${Math.round(schedule.motionMs)}ms at ${ap.shimmerSpeed}px/s — longer than the duration, so the loop stretches to fit.`
            : a.mode === 'animated' && a.type === 'shimmer' && !sweep && ap.shimmerDurationMs > a.durationMs
              ? `Sweep is capped at the ${a.durationMs}ms cycle duration.`
              : null
        }
      >
        <ColorField
          label="Background color"
          tip="Placeholder fill. DS phantom fill is surface/level-3: #474747 at 60%."
          value={ap.baseColor}
          onChange={(baseColor) => actions.appearance({ baseColor })}
        />
        <SliderField
          label="Background opacity"
          value={ap.baseAlpha}
          min={0.05}
          max={1}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(baseAlpha) => actions.appearance({ baseAlpha })}
        />
        <ToggleField
          label="Fill fade (DS alpha mask)"
          tip="DS phantom-shape: the fill fades from 100% to 50% opacity, left to right."
          checked={ap.fillFade}
          onChange={(fillFade) => actions.appearance({ fillFade })}
        />
        <ColorField
          label="Highlight color"
          tip="Shimmer band / wave peak color."
          value={ap.highlightColor}
          applies={app.highlightColor}
          onChange={(highlightColor) => actions.appearance({ highlightColor })}
        />
        <SliderField
          label={a.type === 'wave' ? 'Wave intensity' : 'Shimmer intensity'}
          tip="Shimmer: highlight opacity at the band center (DS: 7%). Wave: how far the fill moves toward the highlight color."
          value={ap.shimmerIntensity}
          min={0}
          max={60}
          unit="%"
          applies={app.shimmerIntensity}
          onChange={(shimmerIntensity) => actions.appearance({ shimmerIntensity })}
        />
        <SliderField
          label="Shimmer speed"
          tip="How fast the band travels across the layout. DS: 700px/s (≈0.25s per 175px)."
          value={ap.shimmerSpeed}
          min={100}
          max={3000}
          step={50}
          unit="px/s"
          applies={app.shimmerSpeed}
          onChange={(shimmerSpeed) => actions.appearance({ shimmerSpeed })}
        />
        <SliderField
          label="Band width"
          tip="Width of the soft highlight. DS: 200px."
          value={ap.shimmerBand}
          min={40}
          max={600}
          step={10}
          unit="px"
          applies={app.shimmerBand}
          onChange={(shimmerBand) => actions.appearance({ shimmerBand })}
        />
        <SliderField
          label="Shimmer duration"
          tip="Time for the band to cross a placeholder. The rest of the cycle is a pause."
          value={ap.shimmerDurationMs}
          min={200}
          max={5000}
          step={50}
          unit="ms"
          applies={app.shimmerDurationMs}
          onChange={(shimmerDurationMs) => actions.appearance({ shimmerDurationMs })}
        />
        <SliderField
          label="Shimmer angle"
          tip="Direction of travel: 90° = left → right, 180° = top → bottom."
          value={ap.shimmerAngle}
          min={0}
          max={360}
          step={5}
          unit="°"
          format={(v) => `${v}°`}
          applies={app.shimmerAngle}
          onChange={(shimmerAngle) => actions.appearance({ shimmerAngle })}
        />
        <SliderField
          label="Shimmer width"
          tip="Width of the highlight band relative to the placeholder."
          value={ap.shimmerWidth}
          min={10}
          max={100}
          unit="%"
          applies={app.shimmerWidth}
          onChange={(shimmerWidth) => actions.appearance({ shimmerWidth })}
        />
        <SliderField
          label="Pulse intensity"
          tip="How much opacity drops at the bottom of each pulse."
          value={ap.pulseIntensity}
          min={0.05}
          max={0.95}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          applies={app.pulseIntensity}
          onChange={(pulseIntensity) => actions.appearance({ pulseIntensity })}
        />
        <SliderField
          label="Opacity min"
          value={ap.opacityMin}
          min={0}
          max={1}
          step={0.05}
          applies={app.opacity}
          onChange={(opacityMin) =>
            actions.appearance({
              opacityMin,
              opacityMax: Math.max(opacityMin, ap.opacityMax),
            })
          }
        />
        <SliderField
          label="Opacity max"
          value={ap.opacityMax}
          min={0}
          max={1}
          step={0.05}
          applies={app.opacity}
          onChange={(opacityMax) =>
            actions.appearance({
              opacityMax,
              opacityMin: Math.min(opacityMax, ap.opacityMin),
            })
          }
        />
      </Section>
    </>
  )
}

type DialogState = { mode: 'create' } | { mode: 'edit'; preset: CustomPreset } | null

function PresetsTab({
  config,
  pinned,
  actions,
  custom,
  motionAllowed,
  bothLayouts,
}: {
  config: PlaygroundConfig
  pinned: PlaygroundConfig | null
  actions: PanelActions
  custom: ReturnType<typeof useCustomPresets>
  motionAllowed: boolean
  bothLayouts?: boolean
}) {
  const [dialog, setDialog] = useState<DialogState>(null)
  const [confirm, setConfirm] = useState<{
    id: string
    action: 'delete' | 'overwrite'
  } | null>(null)
  const [fileNote, setFileNote] = useState<{
    text: string
    error?: boolean
  } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const isActive = (p: Preset) => sameAnimation(applyPreset(config, p), config)
  const names = custom.presets.map((p) => p.name)

  const exportFile = () => {
    const stamp = new Date().toISOString().slice(0, 10)
    downloadText(`phantom-presets-${stamp}.json`, exportPresets(custom.presets), 'application/json')
    setFileNote({
      text: `Saved ${custom.presets.length} preset${custom.presets.length === 1 ? '' : 's'} to a file.`,
    })
  }

  const importFile = async (file: File) => {
    try {
      const added = custom.importPresets(parsePresetFile(await file.text()))
      setFileNote({
        text: added
          ? `Added ${added} preset${added === 1 ? '' : 's'}. Existing presets were kept.`
          : 'Every preset in this file is already here.',
      })
    } catch {
      setFileNote({ text: 'That file is not a preset export.', error: true })
    }
  }

  useEffect(() => {
    if (!confirm) return
    const t = window.setTimeout(() => setConfirm(null), 4000)
    return () => window.clearTimeout(t)
  }, [confirm])

  const applyCustom = (p: CustomPreset) => {
    actions.replace(presetTarget(p, config))
    custom.setAppliedId(p.id)
  }

  /** First click arms the action, second click within 4s runs it. */
  const twoStep = (id: string, action: 'delete' | 'overwrite', run: () => void) => {
    if (confirm?.id === id && confirm.action === action) {
      run()
      setConfirm(null)
    } else setConfirm({ id, action })
  }

  const drafts = custom.presets.filter((p) => !p.saved)
  const saved = custom.presets.filter((p) => p.saved)

  const card = (p: CustomPreset) => {
    const active = isCustomActive(p, config)
    const edited = !active && custom.appliedId === p.id
    const changes = edited ? changedFields(p, config) : []
    const confirmingDelete = confirm?.id === p.id && confirm.action === 'delete'
    const confirmingOverwrite = confirm?.id === p.id && confirm.action === 'overwrite'
    // Unsaved presets save in one click, keeping any edits made since they were applied.
    const save = () => custom.markSaved(p.id, edited ? config : undefined)
    return (
      <div
        key={p.id}
        className={`${styles.preset} ${styles.customPreset} ${active ? styles.presetOn : ''} ${
          edited ? styles.presetEdited : ''
        }`}
      >
        <button
          type="button"
          aria-pressed={active}
          className={styles.customApply}
          title={edited ? 'Revert to the stored settings' : 'Apply this preset'}
          onClick={() => applyCustom(p)}
        >
          <span className={styles.presetName}>
            <span className={styles.presetNameText}>{p.name}</span>
            {active && <Check size={12} weight="bold" />}
          </span>
          <span className={styles.presetDesc}>{p.description || summarizeConfig(p.config, p.includeLayout)}</span>
          <span className={styles.presetTag}>{p.includeLayout ? 'Layout + animation' : 'Animation only'}</span>
        </button>
        {edited && (
          <div className={styles.editedBar}>
            <span className={styles.editedText} title={changes.join(', ')}>
              Edited: {changes.slice(0, 3).join(', ')}
              {changes.length > 3 && ` +${changes.length - 3}`}
            </span>
            <div className={styles.editedActions}>
              <button type="button" className={styles.miniBtn} onClick={() => applyCustom(p)}>
                Revert
              </button>
              <button
                type="button"
                className={`${styles.miniBtn} ${styles.miniBtnPrimary}`}
                onClick={p.saved ? () => custom.saveConfig(p.id, config) : save}
              >
                <FloppyDisk size={12} /> {p.saved ? 'Save changes' : 'Save'}
              </button>
            </div>
          </div>
        )}
        {!p.saved && !edited && (
          <button
            type="button"
            className={`${styles.miniBtn} ${styles.miniBtnPrimary} ${styles.saveBtn}`}
            title="Add this preset to Saved custom presets"
            aria-label={`Save ${p.name}`}
            onClick={save}
          >
            <FloppyDisk size={12} /> Save
          </button>
        )}
        <div className={styles.customActions} role="group" aria-label={`${p.name} actions`}>
          {p.saved && !edited && (
            <button
              type="button"
              className={`${styles.iconBtn} ${confirmingOverwrite ? styles.iconBtnWarn : ''}`}
              disabled={active}
              title={
                active
                  ? 'Already matches the current settings'
                  : confirmingOverwrite
                    ? 'Click again to replace the saved settings'
                    : 'Save current settings into this preset'
              }
              aria-label={confirmingOverwrite ? `Confirm overwrite ${p.name}` : `Save current settings into ${p.name}`}
              onClick={() => twoStep(p.id, 'overwrite', () => custom.saveConfig(p.id, config))}
            >
              <FloppyDisk size={14} />
              {confirmingOverwrite && <span className={styles.iconBtnLabel}>Overwrite?</span>}
            </button>
          )}
          <button
            type="button"
            className={styles.iconBtn}
            title="Edit name, animation and layout"
            aria-label={`Edit ${p.name}`}
            onClick={() => setDialog({ mode: 'edit', preset: p })}
          >
            <PencilSimple size={14} />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            title="Duplicate"
            aria-label={`Duplicate ${p.name}`}
            onClick={() => custom.duplicate(p.id)}
          >
            <CopySimple size={14} />
          </button>
          <button
            type="button"
            className={`${styles.iconBtn} ${confirmingDelete ? styles.iconBtnDanger : ''}`}
            title={confirmingDelete ? 'Click again to delete' : 'Delete'}
            aria-label={confirmingDelete ? `Confirm delete ${p.name}` : `Delete ${p.name}`}
            onClick={() => twoStep(p.id, 'delete', () => custom.remove(p.id))}
          >
            <Trash size={14} />
            {confirmingDelete && <span className={styles.iconBtnLabel}>Delete?</span>}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Section
        title="Custom presets"
        note="Saved automatically in this browser and kept in sync across open tabs. Export to a file to back them up or move them to another browser."
      >
        <button type="button" className={styles.ctaBtn} onClick={() => setDialog({ mode: 'create' })}>
          <Plus size={14} weight="bold" /> New custom preset
        </button>
        <div className={styles.fileRow}>
          <button
            type="button"
            className={styles.miniBtn}
            disabled={custom.presets.length === 0}
            title="Download every custom preset as a JSON file"
            onClick={exportFile}
          >
            <DownloadSimple size={12} /> Export to file
          </button>
          <button
            type="button"
            className={styles.miniBtn}
            title="Add presets from an exported JSON file; existing presets are kept"
            onClick={() => fileRef.current?.click()}
          >
            <UploadSimple size={12} /> Import from file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void importFile(file)
            }}
          />
        </div>
        {!custom.persisted && (
          <p className={`${styles.emptyNote} ${styles.fileNoteError}`} role="alert">
            This browser blocked saving, so presets only last until you close the tab. Export them to keep them.
          </p>
        )}
        {fileNote && (
          <p className={`${styles.emptyNote} ${fileNote.error ? styles.fileNoteError : ''}`} role="status">
            {fileNote.text}
          </p>
        )}
        {custom.presets.length === 0 ? (
          <p className={styles.emptyNote}>
            No custom presets yet. Create one, then press Save to add it to “Saved custom presets”.
          </p>
        ) : (
          drafts.length > 0 && <div className={`${styles.presetList} ${styles.presetListFull}`}>{drafts.map(card)}</div>
        )}
      </Section>
      {saved.length > 0 && (
        <Section title="Saved custom presets">
          <div className={`${styles.presetList} ${styles.presetListFull}`}>{saved.map(card)}</div>
        </Section>
      )}
      <Section title="Built-in presets" note="Built-in presets set animation and appearance only; your layout is kept.">
        <div className={styles.presetList}>
          {PRESETS.map((p) => {
            const active = isActive(p)
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                className={`${styles.preset} ${active ? styles.presetOn : ''}`}
                onClick={() => {
                  actions.replace(applyPreset(config, p))
                  custom.setAppliedId(null)
                }}
              >
                <span className={styles.presetName}>
                  {p.name}
                  {active && <Check size={12} weight="bold" />}
                </span>
                <span className={styles.presetDesc}>{p.description}</span>
              </button>
            )
          })}
        </div>
      </Section>
      <Section
        title="A / B snapshot"
        note="Pin the current settings, keep editing, then pick “Pinned vs Current” in Compare view."
      >
        <button type="button" className={styles.ghostBtn} onClick={actions.pin}>
          <PushPin size={14} /> {pinned ? 'Re-pin current settings' : 'Pin current settings'}
        </button>
      </Section>
      {dialog && (
        <PresetDialog
          mode={dialog.mode}
          config={dialog.mode === 'edit' ? presetTarget(dialog.preset, config) : config}
          motionAllowed={motionAllowed}
          initialBoth={bothLayouts}
          initial={
            dialog.mode === 'edit'
              ? {
                  name: dialog.preset.name,
                  description: dialog.preset.description,
                  includeLayout: dialog.preset.includeLayout,
                }
              : {
                  name: uniqueName('My preset', names),
                  description: '',
                  includeLayout: true,
                }
          }
          takenNames={dialog.mode === 'edit' ? names.filter((n) => n !== dialog.preset.name) : names}
          onClose={() => setDialog(null)}
          onSubmit={(draft, edited) => {
            const target = presetTarget({ config: edited, includeLayout: draft.includeLayout }, config)
            if (dialog.mode === 'edit') {
              const p = dialog.preset
              const wasLoaded = custom.appliedId === p.id || isCustomActive(p, config)
              custom.update(p.id, {
                ...draft,
                config: structuredClone(edited),
              })
              if (wasLoaded) {
                actions.replace(target)
                custom.setAppliedId(p.id)
              }
            } else {
              custom.create(draft, edited)
              actions.replace(target)
            }
            setDialog(null)
          }}
        />
      )}
    </>
  )
}

function useFlash() {
  const [flash, setFlash] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const show = (key: string) => {
    setFlash(key)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setFlash(null), key.endsWith('-fail') ? 3000 : 1500)
  }
  return [flash, show] as const
}

function ExportTab({
  config,
  schedule,
  actions,
}: {
  config: PlaygroundConfig
  schedule: Schedule
  actions: PanelActions
}) {
  const [activeOnly, setActiveOnly] = useState(true)
  const [flash, show] = useFlash()
  const json = JSON.stringify(buildExportObject(config, schedule, activeOnly), null, 2)
  const css = buildExportCss(config, schedule)

  const jsonRef = useRef<HTMLPreElement>(null)
  const cssRef = useRef<HTMLPreElement>(null)

  const copy = async (key: string, text: string, pre: HTMLPreElement | null) => {
    if (await copyText(text)) {
      show(key)
      return
    }
    // Clipboard blocked (permissions / unfocused document): select the text for a manual Ctrl+C.
    if (pre) {
      const range = document.createRange()
      range.selectNodeContents(pre)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
      pre.focus()
    }
    show(`${key}-fail`)
  }
  const label = (key: string, idle: string) =>
    flash === key ? 'Copied' : flash === `${key}-fail` ? 'Selected — press Ctrl+C' : idle

  return (
    <>
      <Section title="Configuration" note="Live, read-only. Values here are exactly what the main preview is using.">
        <ToggleField
          label="Only properties that affect the preview"
          tip="Hide values kept for other modes (e.g. shimmer settings while Pulse is selected)."
          checked={activeOnly}
          onChange={setActiveOnly}
        />
        <pre ref={jsonRef} className={styles.code} tabIndex={0} aria-label="Current configuration JSON">
          {json}
        </pre>
        <div className={styles.btnRow}>
          <button type="button" className={styles.primaryBtn} onClick={() => copy('json', json, jsonRef.current)}>
            {flash === 'json' ? <Check size={14} /> : <Copy size={14} />} {label('json', 'Copy configuration')}
          </button>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={() => downloadText('phantom-loading.config.json', json, 'application/json')}
          >
            <DownloadSimple size={14} /> Export JSON
          </button>
        </div>
      </Section>
      <Section
        title="CSS"
        note="Keyframes, timing, and per-item delays for the current layout. Use .skeleton > .skeleton-item .skeleton-bone."
      >
        <pre ref={cssRef} className={styles.code} tabIndex={0} aria-label="Generated CSS">
          {css}
        </pre>
        <div className={styles.btnRow}>
          <button type="button" className={styles.primaryBtn} onClick={() => copy('css', css, cssRef.current)}>
            {flash === 'css' ? <Check size={14} /> : <Copy size={14} />} {label('css', 'Copy CSS')}
          </button>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={() => downloadText('phantom-loading.css', css, 'text/css')}
          >
            <DownloadSimple size={14} /> Export CSS
          </button>
        </div>
      </Section>
      <button type="button" className={styles.ghostBtn} onClick={actions.reset}>
        <ArrowCounterClockwise size={14} /> Restore default configuration
      </button>
    </>
  )
}
