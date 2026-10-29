import { memo, type CSSProperties } from 'react'
import { DATA_COLUMNS, type LayoutConfig } from './config'
import styles from './Preview.module.css'

/** Body-line widths (%) for extra text lines. */
const LINE_WIDTHS = [96, 88, 72, 92, 64, 80, 70, 84]

function Bone({ className, width }: { className: string; width?: string }) {
  return <div className={`pl-bone ${styles.bone} ${className}`} style={width ? { width } : undefined} />
}

interface Props {
  layout: LayoutConfig
  index: number
  delayMs: number
  label: string | null
}

export const SkeletonItem = memo(function SkeletonItem({ layout, index, delayMs, label }: Props) {
  const { shapes } = layout
  const style = { '--pl-delay': `${delayMs}ms` } as CSSProperties
  const lines = Array.from({ length: shapes.textLines }, (_, i) => (
    <Bone key={i} className={styles.line} width={`${LINE_WIDTHS[(index + i) % LINE_WIDTHS.length]}%`} />
  ))
  const badge = label ? <span className={styles.badge}>{label}</span> : null

  if (layout.type === 'list') {
    return (
      <div className={`pl-item ${styles.row}`} style={style} aria-hidden="true">
        {badge}
        <div className={styles.rowLead}>
          {shapes.thumbnail && <Bone className={styles.rowThumb} />}
          {shapes.avatar && <Bone className={styles.avatar} />}
          <div className={styles.rowText}>
            <Bone className={styles.line} width="160px" />
            <Bone className={styles.line} width="104px" />
            {lines}
          </div>
        </div>
        {DATA_COLUMNS.slice(0, shapes.dataColumns).map((col) => (
          <div key={col.label} className={styles.rowCell}>
            <Bone className={styles.line} width={`${col.width}px`} />
          </div>
        ))}
        {shapes.contentBlock && (
          <div className={styles.rowCell}>
            <Bone className={styles.rowBlock} />
          </div>
        )}
        {shapes.actions && (
          <div className={styles.rowAction}>
            <Bone className={styles.circle} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`pl-item ${styles.card}`} style={style} aria-hidden="true">
      {badge}
      {shapes.thumbnail && <Bone className={styles.thumb} />}
      <div className={`${styles.cardBody} ${shapes.thumbnail ? '' : styles.cardBodyGrow}`}>
        <div className={styles.header}>
          {shapes.avatar && <Bone className={styles.avatar} />}
          <div className={styles.headLines}>
            <Bone className={styles.line} width="160px" />
            <Bone className={styles.line} width="104px" />
          </div>
        </div>
        {lines}
        {shapes.contentBlock && <Bone className={styles.block} />}
        {shapes.tags && (
          <div className={styles.footer}>
            <Bone className={styles.pill} />
            <Bone className={styles.pill} />
            <span className={styles.spacer} />
            <Bone className={styles.circle} />
          </div>
        )}
      </div>
    </div>
  )
})
