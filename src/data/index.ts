import { useCallback, useEffect, useSyncExternalStore } from 'react'
import kanto from './kanto.json'

export type HabitatKind = 'forest' | 'volcano' | 'pool' | 'grassland'

export interface Species {
  id: number
  name: string
  genus: string
  types: string[]
  habitat: HabitatKind
}

export interface Entry {
  id: number
  description: string
  /** Height in meters and weight in kilograms. */
  height: number
  weight: number
  abilities: string[]
  stats: { name: string; value: number }[]
  /** Kanto members in National Pokédex order and their direct parent/child pairs. */
  family: number[]
  edges: [number, number][]
}

export const species: Species[] = kanto as Species[]
export const types = [...new Set(species.flatMap((item) => item.types))].sort()
const base = import.meta.env.BASE_URL
export const artworkUrl = (id: number) => `${base}art/${id}.webp`
export const spriteUrl = (id: number) => `${base}sprites/${id}.png`

type RecordState = { entry: Entry | null; loading: boolean; error: string | null }
const pending: RecordState = { entry: null, loading: true, error: null }
const records = new Map<number, RecordState>()
const listeners = new Map<number, Set<() => void>>()

function publish(id: number, state: RecordState) {
  records.set(id, state)
  listeners.get(id)?.forEach((notify) => notify())
}

async function fetchEntry(id: number, retry = false) {
  if (records.has(id) && !(retry && records.get(id)?.error)) return
  publish(id, pending)
  try {
    // Each file is a compact PokéAPI v2 snapshot generated with the index.
    const response = await fetch(`${base}data/${id}.json`, {
      cache: retry ? 'reload' : 'default',
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error('Record request failed')
    const entry: Entry = await response.json()
    if (
      entry.id !== id ||
      typeof entry.description !== 'string' ||
      entry.stats?.length !== 6 ||
      !Array.isArray(entry.abilities) ||
      !Array.isArray(entry.family) ||
      !Array.isArray(entry.edges)
    ) {
      throw new Error('Invalid species record')
    }
    publish(id, { entry, loading: false, error: null })
  } catch {
    publish(id, { entry: null, loading: false, error: 'Couldn’t load this field record.' })
  }
}

/** Reads and caches only the selected record. Fast selection cannot publish stale data to another ID. */
export function useEntry(id: number) {
  const subscribe = useCallback(
    (notify: () => void) => {
      const active = listeners.get(id) ?? new Set<() => void>()
      active.add(notify)
      listeners.set(id, active)
      return () => {
        active.delete(notify)
        if (active.size === 0) listeners.delete(id)
      }
    },
    [id],
  )
  const state = useSyncExternalStore(subscribe, () => records.get(id) ?? pending)
  useEffect(() => {
    void fetchEntry(id)
  }, [id])
  const retry = useCallback(() => {
    void fetchEntry(id, true)
  }, [id])
  return { ...state, retry }
}
