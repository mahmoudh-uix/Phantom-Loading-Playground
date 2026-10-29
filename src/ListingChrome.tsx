import { ArrowsDownUp, CaretDown, MagnifyingGlass, Plus, Rows, SquaresFour } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { DATA_COLUMNS, type LayoutConfig } from './config'
import styles from './Preview.module.css'

function Dropdown({ label, icon }: { label: string; icon?: ReactNode }) {
  return (
    <span className={styles.dsDropdown}>
      {icon}
      <span>{label}</span>
      <CaretDown size={16} />
    </span>
  )
}

/** Static DS listing-module header around the phantom items (presentational, not focusable). */
export function ListingChrome({ layout }: { layout: LayoutConfig }) {
  const { shapes } = layout
  return (
    <div className={styles.chrome} inert aria-hidden="true">
      <div className={styles.chromeBar}>
        <span className={styles.chromeTitle}>Listing Title</span>
        <span className={styles.spacer} />
        <span className={styles.dsSegmented}>
          <span className={`${styles.dsSegment} ${styles.dsSegmentActive}`}>Workflows</span>
          <span className={styles.dsSegment}>Executions</span>
        </span>
        <span className={styles.dsSearch}>
          <MagnifyingGlass size={20} />
          <span>Search</span>
        </span>
        <span className={styles.dsBrandButton}>
          <Plus size={20} />
          <span>New Something</span>
        </span>
      </div>
      <div className={styles.chromeBar}>
        <Dropdown label="All types" />
        <Dropdown label="All statuses" />
        <span className={styles.spacer} />
        <span className={styles.dsSegmented}>
          <span className={`${styles.dsSegment} ${styles.dsIconSegment} ${layout.type === 'grid' ? styles.dsSegmentActive : ''}`}>
            <SquaresFour size={20} />
          </span>
          <span className={`${styles.dsSegment} ${styles.dsIconSegment} ${layout.type === 'list' ? styles.dsSegmentActive : ''}`}>
            <Rows size={20} />
          </span>
        </span>
        <Dropdown label="Default" icon={<ArrowsDownUp size={20} />} />
      </div>
      {layout.type === 'list' && (
        <div className={styles.tableHeader}>
          <span className={styles.rowLead}>Name</span>
          {DATA_COLUMNS.slice(0, shapes.dataColumns).map((col) => (
            <span key={col.label} className={styles.rowCell}>
              {col.label}
            </span>
          ))}
          {shapes.contentBlock && <span className={styles.rowCell}>Preview</span>}
          {shapes.actions && <span className={`${styles.rowAction} ${styles.rowActionHead}`} />}
        </div>
      )}
    </div>
  )
}
