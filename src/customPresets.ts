import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_CONFIG,
  isLayoutSweep,
  isMotionConfig,
  sameAnimation,
  SEQUENCING_LABELS,
  TYPE_LABELS,
  type PlaygroundConfig,
} from './config'

export interface CustomPreset {
  id: string
  name: string
  description: string
  /** Full snapshot; `layout` is only applied when `includeLayout` is true. */
  config: PlaygroundConfig
  includeLayout: boolean
  /** Listed under "Saved custom presets" once the user presses Save; new presets start unsaved. */
  saved: boolean
  createdAt: number
}

export interface PresetDraft {
  name: string
  description: string
  includeLayout: boolean
}

const STORAGE_KEY = 'phantom-playground/custom-presets/v1'
export const PRESET_NAME_MAX = 40

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Fills fields added after a preset was saved so older snapshots keep working. */
function withDefaults(c: Partial<PlaygroundConfig> | undefined): PlaygroundConfig {
  const d = DEFAULT_CONFIG
  return {
    layout: { ...d.layout, ...c?.layout, shapes: { ...d.layout.shapes, ...c?.layout?.shapes } },
    animation: { ...d.animation, ...c?.animation },
    appearance: { ...d.appearance, ...c?.appearance },
  }
}

function normalize(parsed: unknown): CustomPreset[] {
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter((p): p is CustomPreset => !!p && typeof p.id === 'string' && typeof p.name === 'string')
    .map((p) => ({
      id: p.id,
      name: p.name.slice(0, PRESET_NAME_MAX),
      description: typeof p.description === 'string' ? p.description : '',
      includeLayout: p.includeLayout !== false,
      saved: p.saved === true,
      createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
      config: withDefaults(p.config),
    }))
}

/** `null` when storage is unavailable or unreadable, so callers never mistake that for "no presets". */
function read(): CustomPreset[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? normalize(JSON.parse(raw)) : []
  } catch {
    return null
  }
}

function write(presets: CustomPreset[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
    return true
  } catch {
    return false
  }
}

const EXPORT_FORMAT = 'phantom-playground/custom-presets'

export function exportPresets(presets: CustomPreset[]): string {
  return JSON.stringify({ format: EXPORT_FORMAT, version: 1, presets }, null, 2)
}

/** Accepts an export file or a bare preset array; throws when the file holds no presets. */
export function parsePresetFile(text: string): CustomPreset[] {
  const data: unknown = JSON.parse(text)
  const list = Array.isArray(data) ? data : (data as { presets?: unknown } | null)?.presets
  const presets = normalize(list)
  if (presets.length === 0) throw new Error('No presets found in this file.')
  return presets
}

/** "Name", "Name copy", "Name copy 2", … — first one not already taken. */
export function uniqueName(base: string, taken: string[]): string {
  const names = new Set(taken.map((n) => n.toLowerCase()))
  if (!names.has(base.toLowerCase())) return base
  const stem = `${base} copy`.slice(0, PRESET_NAME_MAX)
  if (!names.has(stem.toLowerCase())) return stem
  for (let i = 2; ; i++) {
    const candidate = `${stem.slice(0, PRESET_NAME_MAX - String(i).length - 1)} ${i}`
    if (!names.has(candidate.toLowerCase())) return candidate
  }
}

export function summarizeConfig(c: PlaygroundConfig, includeLayout: boolean): string {
  const a = c.animation
  const motion = !isMotionConfig(c)
    ? a.mode === 'static'
      ? 'Static mode'
      : 'Static skeleton'
    : isLayoutSweep(c)
      ? `Shimmer · DS sweep ${c.appearance.shimmerSpeed}px/s · ${a.durationMs}ms`
      : `${TYPE_LABELS[a.type]} · ${SEQUENCING_LABELS[a.sequencing]} · ${a.durationMs}ms`
  if (!includeLayout) return motion
  const l = c.layout
  return `${motion} · Grid ${l.columns} col + List · ${l.itemCount} items`
}

/** Grid/List is a view choice, not a preset setting: a preset carries both layouts' settings. */
export function sameLayout(a: PlaygroundConfig['layout'], b: PlaygroundConfig['layout']): boolean {
  return JSON.stringify({ ...a, type: null }) === JSON.stringify({ ...b, type: null })
}

export function sameConfig(a: PlaygroundConfig, b: PlaygroundConfig): boolean {
  return sameAnimation(a, b) && sameLayout(a.layout, b.layout)
}

export function isCustomActive(p: CustomPreset, current: PlaygroundConfig): boolean {
  if (!sameAnimation(p.config, current)) return false
  return !p.includeLayout || sameLayout(p.config.layout, current.layout)
}

/** "durationMs" → "duration", "shimmerBand" → "shimmer band". */
function humanize(key: string): string {
  return key
    .replace(/Ms$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
}

function diffKeys(a: object, b: object, out: string[]) {
  const bb = b as Record<string, unknown>
  for (const [k, v] of Object.entries(a)) {
    if (JSON.stringify(v) !== JSON.stringify(bb[k])) out.push(humanize(k))
  }
}

/** Settings that differ between the saved preset and the current config. */
export function changedFields(p: CustomPreset, current: PlaygroundConfig): string[] {
  const out: string[] = []
  diffKeys(p.config.animation, current.animation, out)
  diffKeys(p.config.appearance, current.appearance, out)
  if (p.includeLayout) {
    const { shapes, ...layout } = p.config.layout
    const { shapes: curShapes, ...curLayout } = current.layout
    diffKeys({ ...layout, type: null }, { ...curLayout, type: null }, out)
    diffKeys(shapes, curShapes, out)
  }
  return out
}

/** Config to load when the preset is applied; the current Grid/List view is always kept. */
export function presetTarget(
  p: Pick<CustomPreset, 'config' | 'includeLayout'>,
  current: PlaygroundConfig,
): PlaygroundConfig {
  const layout = p.includeLayout ? { ...p.config.layout, type: current.layout.type } : current.layout
  return { ...p.config, layout }
}

export function useCustomPresets() {
  const [presets, setPresets] = useState<CustomPreset[]>(() => read() ?? [])
  /** Last custom preset loaded into the editor; edits after that can be saved back into it. */
  const [appliedId, setAppliedId] = useState<string | null>(null)
  /** False when the last write failed (storage full or blocked): presets then only live in this tab. */
  const [persisted, setPersisted] = useState(true)
  const latest = useRef(presets)

  // Other tabs write the same key; follow them instead of overwriting their presets later.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY && e.key !== null) return
      const next = read()
      if (next) {
        latest.current = next
        setPresets(next)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  /** Every change starts from what is stored right now, so presets saved elsewhere are never dropped. */
  const commit = useCallback((change: (list: CustomPreset[]) => CustomPreset[]) => {
    const next = change(read() ?? latest.current)
    latest.current = next
    setPersisted(write(next))
    setPresets(next)
    return next
  }, [])

  const create = useCallback(
    (draft: PresetDraft, config: PlaygroundConfig) => {
      const preset: CustomPreset = {
        id: newId(),
        name: draft.name,
        description: draft.description,
        includeLayout: draft.includeLayout,
        saved: false,
        config: structuredClone(config),
        createdAt: Date.now(),
      }
      commit((list) => [...list, preset])
      setAppliedId(preset.id)
      return preset
    },
    [commit],
  )

  const saveConfig = useCallback(
    (id: string, config: PlaygroundConfig) => {
      commit((list) => list.map((p) => (p.id === id ? { ...p, config: structuredClone(config) } : p)))
      setAppliedId(id)
    },
    [commit],
  )

  /** Moves a preset to "Saved custom presets", storing `config` too when the user edited it first. */
  const markSaved = useCallback(
    (id: string, config?: PlaygroundConfig) => {
      commit((list) =>
        list.map((p) =>
          p.id === id ? { ...p, saved: true, ...(config ? { config: structuredClone(config) } : null) } : p,
        ),
      )
      if (config) setAppliedId(id)
    },
    [commit],
  )

  const update = useCallback(
    (id: string, patch: Partial<Omit<CustomPreset, 'id'>>) => {
      commit((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    },
    [commit],
  )

  const duplicate = useCallback(
    (id: string) => {
      commit((list) => {
        const i = list.findIndex((p) => p.id === id)
        if (i < 0) return list
        const src = list[i]
        const copy: CustomPreset = {
          ...src,
          id: newId(),
          name: uniqueName(src.name, list.map((p) => p.name)),
          config: structuredClone(src.config),
          createdAt: Date.now(),
        }
        return [...list.slice(0, i + 1), copy, ...list.slice(i + 1)]
      })
    },
    [commit],
  )

  const remove = useCallback(
    (id: string) => {
      commit((list) => list.filter((p) => p.id !== id))
      setAppliedId((cur) => (cur === id ? null : cur))
    },
    [commit],
  )

  /** Adds presets from a file. Existing presets are kept; clashing names get a "copy" suffix. Returns how many were added. */
  const importPresets = useCallback(
    (incoming: CustomPreset[]) => {
      let added = 0
      commit((list) => {
        const ids = new Set(list.map((p) => p.id))
        const names = list.map((p) => p.name)
        const extra: CustomPreset[] = []
        for (const p of incoming) {
          if (ids.has(p.id)) continue
          const name = uniqueName(p.name, names)
          names.push(name)
          ids.add(p.id)
          extra.push({ ...p, name })
        }
        added = extra.length
        return [...list, ...extra]
      })
      return added
    },
    [commit],
  )

  return {
    presets,
    appliedId,
    setAppliedId,
    persisted,
    create,
    update,
    saveConfig,
    markSaved,
    duplicate,
    remove,
    importPresets,
  }
}
