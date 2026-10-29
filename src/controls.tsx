import { useId, useState, type ReactNode } from 'react'
import { Info } from '@phosphor-icons/react'
import styles from './Controls.module.css'

/** `true` = property applies; a string = why it is disabled. */
export type Applies = true | string

export function InfoTip({ text }: { text: string }) {
  const id = useId()
  return (
    <span className={styles.tipWrap}>
      <button type="button" className={styles.tipBtn} aria-label="More info" aria-describedby={id}>
        <Info size={12} weight="bold" />
      </button>
      <span role="tooltip" id={id} className={styles.tip}>
        {text}
      </span>
    </span>
  )
}

function FieldHead({
  label,
  htmlFor,
  tip,
  applies,
  value,
}: {
  label: string
  htmlFor?: string
  tip?: string
  applies: Applies
  value?: ReactNode
}) {
  return (
    <div className={styles.fieldHead}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
      </label>
      {tip && <InfoTip text={tip} />}
      {applies !== true && (
        <span className={styles.na} title={applies}>
          n/a
        </span>
      )}
      {value != null && <span className={styles.value}>{value}</span>}
    </div>
  )
}

function Reason({ applies, id }: { applies: Applies; id: string }) {
  if (applies === true) return null
  return (
    <p id={id} className={styles.reason}>
      {applies}
    </p>
  )
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  tip?: string
  applies?: Applies
  showReason?: boolean
  format?: (v: number) => string
  onChange: (v: number) => void
}

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  tip,
  applies = true,
  showReason,
  format,
  onChange,
}: SliderProps) {
  const id = useId()
  const reasonId = `${id}-reason`
  const [draft, setDraft] = useState<string | null>(null)
  const disabled = applies !== true
  const decimals = (String(step).split('.')[1] ?? '').length
  const clamp = (n: number) => Math.min(max, Math.max(min, +n.toFixed(decimals)))
  const shown = format ? format(value) : `${value}${unit ? ` ${unit}` : ''}`

  return (
    <div className={`${styles.field} ${disabled ? styles.disabled : ''}`}>
      <FieldHead label={label} htmlFor={id} tip={tip} applies={applies} value={shown} />
      <div className={styles.sliderRow}>
        <input
          id={id}
          className={styles.range}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-describedby={disabled && showReason ? reasonId : undefined}
          aria-valuetext={shown}
          onChange={(e) => onChange(clamp(parseFloat(e.target.value)))}
        />
        <span className={styles.numberWrap}>
          <input
            className={styles.number}
            type="number"
            inputMode="decimal"
            aria-label={`${label}${unit ? ` (${unit})` : ''}`}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            value={draft ?? String(value)}
            onChange={(e) => {
              setDraft(e.target.value)
              const n = parseFloat(e.target.value)
              if (Number.isFinite(n) && n >= min && n <= max) onChange(clamp(n))
            }}
            onBlur={() => {
              if (draft != null) {
                const n = parseFloat(draft)
                if (Number.isFinite(n)) onChange(clamp(n))
              }
              setDraft(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
          />
          {unit && <span className={styles.unit}>{unit}</span>}
        </span>
      </div>
      {showReason && <Reason applies={applies} id={reasonId} />}
    </div>
  )
}

interface Option<T extends string> {
  value: T
  label: string
  disabled?: boolean
  title?: string
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  tip,
  applies = true,
  showReason,
  onChange,
}: {
  label: string
  value: T
  options: Option<T>[]
  tip?: string
  applies?: Applies
  showReason?: boolean
  onChange: (v: T) => void
}) {
  const id = useId()
  const disabled = applies !== true
  return (
    <div className={`${styles.field} ${disabled ? styles.disabled : ''}`}>
      <FieldHead label={label} htmlFor={id} tip={tip} applies={applies} />
      <select
        id={id}
        className={styles.select}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled} title={o.title}>
            {o.label}
          </option>
        ))}
      </select>
      {showReason && <Reason applies={applies} id={`${id}-reason`} />}
    </div>
  )
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  tip,
  applies = true,
  showReason,
  onChange,
}: {
  label: string
  value: T
  options: Option<T>[]
  tip?: string
  applies?: Applies
  showReason?: boolean
  onChange: (v: T) => void
}) {
  const id = useId()
  const disabled = applies !== true
  return (
    <div className={`${styles.field} ${disabled ? styles.disabled : ''}`}>
      <FieldHead label={label} tip={tip} applies={applies} />
      <div className={styles.segmented} role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            title={o.title}
            disabled={disabled || o.disabled}
            className={`${styles.segment} ${o.value === value ? styles.segmentOn : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {showReason && <Reason applies={applies} id={`${id}-reason`} />}
    </div>
  )
}

export function ToggleField({
  label,
  checked,
  tip,
  applies = true,
  onChange,
}: {
  label: string
  checked: boolean
  tip?: string
  applies?: Applies
  onChange: (v: boolean) => void
}) {
  const id = useId()
  const disabled = applies !== true
  return (
    <div className={`${styles.toggleRow} ${disabled ? styles.disabled : ''}`}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {tip && <InfoTip text={tip} />}
      {applies !== true && (
        <span className={styles.na} title={applies}>
          n/a
        </span>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`${styles.switch} ${checked ? styles.switchOn : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.switchKnob} />
      </button>
    </div>
  )
}

export function ColorField({
  label,
  value,
  tip,
  applies = true,
  onChange,
}: {
  label: string
  value: string
  tip?: string
  applies?: Applies
  onChange: (v: string) => void
}) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const disabled = applies !== true
  return (
    <div className={`${styles.field} ${disabled ? styles.disabled : ''}`}>
      <FieldHead label={label} htmlFor={id} tip={tip} applies={applies} />
      <div className={styles.colorRow}>
        <input
          id={id}
          type="color"
          className={styles.colorSwatch}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          className={styles.colorText}
          aria-label={`${label} hex`}
          value={draft ?? value}
          disabled={disabled}
          spellCheck={false}
          onChange={(e) => {
            setDraft(e.target.value)
            if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value.toLowerCase())
          }}
          onBlur={() => setDraft(null)}
        />
      </div>
    </div>
  )
}

export function Section({
  title,
  note,
  children,
}: {
  title: string
  note?: string | null
  children: ReactNode
}) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {note && <p className={styles.sectionNote}>{note}</p>}
      <div className={styles.sectionBody}>{children}</div>
    </section>
  )
}
