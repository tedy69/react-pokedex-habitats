import { useEffect, useRef } from 'react'
import { spriteUrl, types, type Species } from './data'
import { Icon } from './Icons'

export const numberLabel = (id: number) => String(id).padStart(3, '0')
export interface IndexProps {
  results: Species[]
  selected: number
  query: string
  type: string
  favoritesOnly: boolean
  changeQuery: (value: string) => void
  changeType: (value: string) => void
  clear: () => void
  select: (id: number) => void
  close?: () => void
}

export default function SpeciesIndex({
  results,
  selected,
  query,
  type,
  favoritesOnly,
  changeQuery,
  changeType,
  clear,
  select,
  close,
}: IndexProps) {
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const list = scroller.current
    const active = list?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!list || !active) return
    const offset = active.offsetTop
    if (offset < list.scrollTop) list.scrollTop = offset
    else if (offset + active.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = offset + active.offsetHeight - list.clientHeight
  }, [selected, results])

  return (
    <div className="index-content">
      <div className="index-heading">
        <h2>{favoritesOnly ? 'Favorites' : 'Species index'}</h2>
        {close ? (
          <button className="icon-button" onClick={close} aria-label="Close species picker">
            <Icon name="close" />
          </button>
        ) : (
          <Icon name="list" size={21} />
        )}
      </div>
      <label className="search-box">
        <Icon name="search" size={17} />
        <input
          type="search"
          aria-label="Search by name or number"
          placeholder="Search name or number"
          value={query}
          onChange={(e) => changeQuery(e.target.value)}
        />
      </label>
      <label className="filter-box">
        <Icon name="filter" size={16} />
        <select
          aria-label="Filter by type"
          value={type}
          onChange={(e) => changeType(e.target.value)}
        >
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
        <Icon name="down" size={13} />
      </label>
      <div className="result-info">
        <span>{results.length} species</span>
        {query || type || favoritesOnly ? (
          <button onClick={clear}>Clear filters</button>
        ) : (
          <span>№ ↑</span>
        )}
      </div>
      <div className="index-scroll" ref={scroller}>
        <ul className="species-list">
          {results.map((s) => (
            <li key={s.id}>
              <a
                href={'#/pokemon/' + s.id}
                aria-current={s.id === selected ? 'page' : undefined}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
                  e.preventDefault()
                  select(s.id)
                }}
              >
                <img src={spriteUrl(s.id)} alt="" loading="lazy" width="48" height="48" />
                <span className="row-no">{numberLabel(s.id)}</span>
                <span className="row-name">{s.name}</span>
                {s.id === selected && <Icon name="right" size={15} />}
              </a>
            </li>
          ))}
        </ul>
        {results.length === 0 && (
          <div className="empty">
            <strong>
              {favoritesOnly && !query && !type ? 'No favorites yet' : 'No matching species'}
            </strong>
            <p>
              {favoritesOnly && !query && !type
                ? 'Bookmark a field record to find it here.'
                : 'Try another name, number, or type.'}
            </p>
            <button className="text-button" onClick={clear}>
              Show all species
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
