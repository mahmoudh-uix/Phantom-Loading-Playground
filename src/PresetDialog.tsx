import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowClockwise, ArrowCounterClockwise, Rows, SquaresFour, X } from '@phosphor-icons/react'
import type { LayoutType, PlaygroundConfig } from './config'
import { AnimationTab, LayoutTab, type PanelActions } from './ControlPanel'
import { ToggleField } from './controls'
import { PRESET_NAME_MAX, sameConfig, summarizeConfig, type PresetDraft } from './customPresets'
import { PreviewPane } from './PreviewPane'
import { computeSchedule } from './schedule'
import styles from './Controls.module.css'

type EditorTab = 'details' | 'animation' | 'layout'

const LAYOUTS: LayoutType[] = ['grid', 'list']
const LAYOUT_LABEL: Record<LayoutType, string> = { grid: 'Grid', list: 'List' }

interface Props {
  mode: 'create' | 'edit'
  initial: PresetDraft
  /** Starting point for the draft: current settings (create) or the stored preset (edit). */
  config: PlaygroundConfig
  /** Names already used by other custom presets (case-insensitive). */
  takenNames: string[]
  motionAllowed: boolean
  /** Start the preview with Grid and List side by side (mirrors the main view). */
  initialBoth?: boolean
  onSubmit: (draft: PresetDraft, config: PlaygroundConfig) => void
  onClose: () => void
}

/** Rendered only while open; mounting calls showModal() so focus trap, Esc and backdrop are native. */
export function PresetDialog({
  mode,
  initial,
  config: initialConfig,
  takenNames,
  motionAllowed,
  initialBoth = false,
  onSubmit,
  onClose,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const nameId = useId()
  const descId = useId()
  const errorId = useId()
  const [tab, setTab] = useState<EditorTab>(mode === 'create' ? 'details' : 'animation')
  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState(initial.description)
  const [includeLayout, setIncludeLayout] = useState(initial.includeLayout)
  const [touched, setTouched] = useState(false)
  const [draft, setDraft] = useState<PlaygroundConfig>(() => structuredClone(initialConfig))
  const [box, setBox] = useState({ columns: initialConfig.layout.columns, width: 0 })
  const [runId, setRunId] = useState(0)
  const [both, setBoth] = useState(initialBoth)

  useEffect(() => {
    const el = ref.current
    if (el && !el.open) el.showModal()
    if (mode === 'create') nameRef.current?.select()
    return () => el?.close()
  }, [mode])

  const actions: PanelActions = useMemo(
    () => ({
      layout: (p) => setDraft((c) => ({ ...c, layout: { ...c.layout, ...p } })),
      shapes: (p) => setDraft((c) => ({ ...c, layout: { ...c.layout, shapes: { ...c.layout.shapes, ...p } } })),
      animation: (p) => setDraft((c) => ({ ...c, animation: { ...c.animation, ...p } })),
      appearance: (p) => setDraft((c) => ({ ...c, appearance: { ...c.appearance, ...p } })),
      replace: setDraft,
      reset: () => setDraft(structuredClone(initialConfig)),
      pin: () => {},
    }),
    [initialConfig],
  )

  const onMeasure = useCallback((columns: number, width: number) => {
    setBox((b) => (b.columns === columns && b.width === width ? b : { columns, width }))
  }, [])

  const schedule = useMemo(() => computeSchedule(draft, box.columns, box.width), [draft, box])
  const dirty = !sameConfig(draft, initialConfig)
  const previewTypes = both ? LAYOUTS : [draft.layout.type]

  const trimmed = name.trim()
  const taken = takenNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())
  const error = !trimmed ? 'Give the preset a name.' : taken ? 'A custom preset with this name already exists.' : null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (error) {
      setTab('details')
      return
    }
    onSubmit({ name: trimmed, description: description.trim(), includeLayout }, draft)
  }

  const tabs: { id: EditorTab; label: string; disabled?: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'animation', label: 'Animation' },
    { id: 'layout', label: 'Layout', disabled: includeLayout ? undefined : 'Turn on “Include layout” in Details to edit it.' },
  ]

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${styles.editorDialog}`}
      aria-labelledby={`${nameId}-title`}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onClose()
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form className={styles.editorForm} onSubmit={submit} noValidate>
        <header className={styles.editorHead}>
          <div className={styles.editorTitleWrap}>
            <h2 id={`${nameId}-title`} className={styles.dialogTitle}>
              {mode === 'create' ? 'New custom preset' : `Edit “${initial.name}”`}
            </h2>
            <span className={styles.editorSub}>
              {dirty ? 'Unsaved changes — the preview shows the draft.' : 'Change any option; the preview updates live.'}
            </span>
          </div>
          <button type="button" className={styles.iconBtn} aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className={styles.editorBody}>
          <div className={styles.editorPreview}>
            <div className={styles.editorViewBar}>
              <div className={styles.segmented} role="radiogroup" aria-label="Preview layout">
                {LAYOUTS.map((type) => (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={!both && draft.layout.type === type}
                    className={`${styles.segment} ${!both && draft.layout.type === type ? styles.segmentOn : ''}`}
                    onClick={() => {
                      setBoth(false)
                      actions.layout({ type })
                    }}
                  >
                    {type === 'grid' ? <SquaresFour size={14} /> : <Rows size={14} />} {LAYOUT_LABEL[type]}
                  </button>
                ))}
                <button
                  type="button"
                  role="radio"
                  aria-checked={both}
                  className={`${styles.segment} ${both ? styles.segmentOn : ''}`}
                  onClick={() => setBoth(true)}
                >
                  Grid + List
                </button>
              </div>
              <span className={styles.editorViewNote}>The preset applies to Grid and List alike.</span>
            </div>
            <div className={`${styles.editorPanes} ${both ? styles.editorPanesBoth : ''}`}>
              {previewTypes.map((type) => {
                const main = type === draft.layout.type
                return (
                  <PreviewPane
                    key={type}
                    paneId={`preset-draft-${type}`}
                    config={main ? draft : { ...draft, layout: { ...draft.layout, type } }}
                    playing
                    runId={runId}
                    motionAllowed={motionAllowed}
                    showLabels={false}
                    showTimeline={!both}
                    title={both ? LAYOUT_LABEL[type] : 'Live preview'}
                    subtitle={both ? (main ? 'settings you are editing' : undefined) : summarizeConfig(draft, includeLayout)}
                    onMeasure={main ? onMeasure : undefined}
                  />
                )
              })}
            </div>
          </div>

          <div className={styles.editorSide}>
            <div className={styles.tabs} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }} role="tablist" aria-label="Preset settings">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  disabled={!!t.disabled}
                  title={t.disabled}
                  className={`${styles.tab} ${tab === t.id ? styles.tabOn : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className={styles.panelScroll} role="tabpanel">
              <div className={styles.panelInner}>
                {tab === 'details' && (
                  <>
                    <div className={styles.field}>
                      <div className={styles.fieldHead}>
                        <label className={styles.label} htmlFor={nameId}>
                          Name
                        </label>
                        <span className={styles.value}>
                          {trimmed.length}/{PRESET_NAME_MAX}
                        </span>
                      </div>
                      <input
                        ref={nameRef}
                        id={nameId}
                        className={`${styles.textInput} ${touched && error ? styles.textInputError : ''}`}
                        value={name}
                        maxLength={PRESET_NAME_MAX}
                        autoComplete="off"
                        placeholder="e.g. Dashboard cards"
                        aria-invalid={touched && !!error}
                        aria-describedby={touched && error ? errorId : undefined}
                        onChange={(e) => setName(e.target.value)}
                      />
                      {touched && error && (
                        <p id={errorId} className={styles.fieldError}>
                          {error}
                        </p>
                      )}
                    </div>

                    <div className={styles.field}>
                      <div className={styles.fieldHead}>
                        <label className={styles.label} htmlFor={descId}>
                          Description
                        </label>
                        <span className={styles.value}>optional</span>
                      </div>
                      <textarea
                        id={descId}
                        className={styles.textArea}
                        value={description}
                        rows={3}
                        maxLength={140}
                        placeholder="What is this preset for?"
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>

                    <ToggleField
                      label="Include layout"
                      tip="On: applying the preset also restores the Grid and List settings (columns, sizes, radii, shapes) while keeping the Grid/List view you are on. Off: it only sets animation and appearance."
                      checked={includeLayout}
                      onChange={setIncludeLayout}
                    />

                    <div className={styles.dialogSummary}>
                      <span className={styles.dialogSummaryLabel}>Saved settings</span>
                      <span>{summarizeConfig(draft, includeLayout)}</span>
                    </div>
                  </>
                )}
                {tab === 'animation' && (
                  <AnimationTab config={draft} schedule={schedule} motionAllowed={motionAllowed} actions={actions} />
                )}
                {tab === 'layout' && includeLayout && (
                  <LayoutTab config={draft} schedule={schedule} actions={actions} bothLayouts={both} />
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className={styles.editorFoot}>
          <div className={styles.editorFootStart}>
            <button type="button" className={styles.ghostBtn} onClick={() => setRunId((n) => n + 1)}>
              <ArrowClockwise size={14} /> Replay
            </button>
            <button type="button" className={styles.ghostBtn} disabled={!dirty} onClick={actions.reset}>
              <ArrowCounterClockwise size={14} /> Discard changes
            </button>
          </div>
          <div className={styles.dialogFoot}>
            <button type="button" className={styles.ghostBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryBtn}>
              {mode === 'create' ? 'Create preset' : 'Update preset'}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  )
}
