import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { species, useEntry, type HabitatKind } from './data'
import Habitat from './habitat/Habitat'
import SpeciesIndex, { numberLabel } from './SpeciesIndex'
import Artwork from './Artwork'
import Records from './Records'
import { Icon } from './Icons'

const favoritesKey = 'kanto-field-guide.favorites.v1'
const habitats: Record<HabitatKind, string> = {
  forest: 'Forest floor',
  volcano: 'Volcanic shelf',
  pool: 'Shallow pool',
  grassland: 'Open grassland',
}
function routeId() {
  const id = Number(location.hash.match(/^#\/pokemon\/(\d+)\/?$/)?.[1])
  return species[id - 1]?.id ?? 1
}
function subscribeRoute(notify: () => void) {
  window.addEventListener('hashchange', notify)
  return () => window.removeEventListener('hashchange', notify)
}
function loadFavorites(): number[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(favoritesKey) ?? '[]')
    return Array.isArray(stored)
      ? [...new Set(stored.filter((id) => Number.isInteger(id) && id >= 1 && id <= 151))]
      : []
  } catch {
    return []
  }
}
function useMedia(query: string) {
  const media = useMemo(() => window.matchMedia(query), [query])
  const subscribe = useCallback(
    (fn: () => void) => {
      media.addEventListener('change', fn)
      return () => media.removeEventListener('change', fn)
    },
    [media],
  )
  return useSyncExternalStore(subscribe, () => media.matches)
}
function searchKey(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9♀♂]/g, '')
}

export default function App() {
  const id = useSyncExternalStore(subscribeRoute, routeId)
  const item = species[id - 1]
  const { entry, error, retry } = useEntry(id)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [favorites, setFavorites] = useState(loadFavorites)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [paused, setPaused] = useState(false)
  const [picker, setPicker] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const pickerTrigger = useRef<HTMLButtonElement | null>(null)
  const focusExhibit = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const mobile = useMedia('(max-width: 760px)')
  const reduced = useMedia('(prefers-reduced-motion: reduce)')
  const saved = favorites.includes(id)

  useEffect(() => {
    document.title = item.name + ' · Pokédex Habitats'
  }, [item.name])
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === favoritesKey || event.key === null) setFavorites(loadFavorites())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  const results = useMemo(() => {
    const search = query.trim()
    const numeric = /^#?\d+$/.test(search)
    return species.filter(
      (s) =>
        (!type || s.types.includes(type)) &&
        (!favoritesOnly || favorites.includes(s.id)) &&
        (!search ||
          (numeric
            ? s.id === Number(search.replace('#', ''))
            : searchKey(s.name).includes(searchKey(search)) && !!searchKey(search))),
    )
  }, [query, type, favoritesOnly, favorites])
  const clear = () => {
    setQuery('')
    setType('')
    setFavoritesOnly(false)
  }
  const move = (next: number) => {
    if (routeId() !== next || !location.hash) location.hash = '/pokemon/' + next
  }
  function select(next: number) {
    move(next)
    if (picker) {
      focusExhibit.current = true
      dialog.current?.close()
    }
  }
  function selectFamily(next: number) {
    if (!results.some((s) => s.id === next)) clear()
    select(next)
    heading.current?.scrollIntoView({ block: 'center', behavior: 'instant' })
    heading.current?.focus({ preventScroll: true })
  }
  const indexProps = {
    results,
    selected: id,
    query,
    type,
    favoritesOnly,
    changeQuery: setQuery,
    changeType: setType,
    clear,
    select,
  }
  const position = results.findIndex((s) => s.id === id)
  const previous = position > 0 ? results[position - 1] : null
  const next = position < results.length - 1 ? results[position + 1] : null
  function toggleFavorite() {
    const updated = saved ? favorites.filter((n) => n !== id) : [...favorites, id]
    setFavorites(updated)
    try {
      localStorage.setItem(favoritesKey, JSON.stringify(updated))
    } catch {
      /* Favorites still work for this session when storage is unavailable. */
    }
  }
  function closePicker() {
    setPicker(false)
    const target = focusExhibit.current ? heading.current : pickerTrigger.current
    target?.focus({ preventScroll: true })
  }
  function openPicker(trigger: HTMLButtonElement) {
    pickerTrigger.current = trigger
    focusExhibit.current = false
    setPicker(true)
    dialog.current?.showModal()
    dialog.current?.querySelector('input')?.focus()
  }
  useEffect(() => {
    if (!mobile && picker) setPicker(false)
  }, [mobile, picker])
  return (
    <>
      <a
        href="#exhibit"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault()
          heading.current?.focus()
        }}
      >
        Skip to field record
      </a>
      <header className="masthead">
        <div className="mast-inner">
          <div className="brand">
            <img src={import.meta.env.BASE_URL + 'field-mark.svg'} width="34" height="34" alt="" />
            <span>Pokédex Habitats</span>
          </div>
          <div className="header-tools">
            <span className="region">Kanto region</span>
            <button
              className={'fav-filter' + (favoritesOnly ? ' active' : '')}
              aria-pressed={favoritesOnly}
              onClick={(event) => {
                setFavoritesOnly(!favoritesOnly)
                if (mobile) openPicker(event.currentTarget)
              }}
            >
              <Icon name="bookmark" filled={favoritesOnly} size={16} />
              <span>Favorites</span>
              <b>{favorites.length}</b>
            </button>
          </div>
        </div>
      </header>
      <div className="layout">
        {!mobile && (
          <aside className="desktop-index" aria-label="Species index">
            <SpeciesIndex {...indexProps} />
          </aside>
        )}
        <main className="exhibit" id="exhibit">
          <div className="record-nav">
            <span className="record-label">
              <Icon name="book" size={17} />
              Field record
            </span>
            <button className="browse-button" onClick={(event) => openPicker(event.currentTarget)}>
              <Icon name="list" size={17} />
              Browse 151 Pokémon
            </button>
            <nav aria-label="Browse matching species">
              <button
                disabled={!previous}
                aria-label="Previous Pokémon"
                onClick={() => previous && select(previous.id)}
              >
                <Icon name="left" size={14} />
                <span>Previous</span>
              </button>
              <i />
              <button
                disabled={!next}
                aria-label="Next Pokémon"
                onClick={() => next && select(next.id)}
              >
                <span>Next</span>
                <Icon name="right" size={14} />
              </button>
            </nav>
          </div>
          <div className="plate">
            <div className={'plate-image scenery-' + item.habitat}>
              <Habitat kind={item.habitat} paused={paused} />
              <div className="ink-wash" />
              <div className="specimen-title">
                <span className="specimen-number">No. {numberLabel(id)}</span>
                <h1
                  ref={heading}
                  tabIndex={-1}
                  className={item.name.length >= 10 ? 'long-name' : ''}
                >
                  {item.name}
                </h1>
                <p>{item.genus}</p>
              </div>
              <Artwork item={item} />
              <button
                className={'record-bookmark' + (saved ? ' saved' : '')}
                aria-label={
                  (saved ? 'Remove ' + item.name + ' from' : 'Add ' + item.name + ' to') +
                  ' favorites'
                }
                aria-pressed={saved}
                title={saved ? 'Remove from favorites' : 'Save to favorites'}
                onClick={toggleFavorite}
              >
                <Icon name="bookmark" filled={saved} size={20} />
              </button>
            </div>
            <div className="plate-caption">
              <span>
                <Icon name="habitat" size={18} />
                <b>Habitat</b>
                <i>/</i>
                {habitats[item.habitat]}
              </span>
              {!reduced && (
                <button
                  onClick={() => setPaused(!paused)}
                  aria-label={paused ? 'Resume habitat animation' : 'Pause habitat animation'}
                  aria-pressed={paused}
                >
                  <Icon name={paused ? 'play' : 'pause'} size={13} />
                  <span>{paused ? 'Paused' : 'Pause'}</span>
                </button>
              )}
            </div>
          </div>
          <Records item={item} entry={entry} error={error} retry={retry} select={selectFamily} />
          <footer>
            <span>Pokédex Habitats</span>
            <a href="https://pokeapi.co/" target="_blank" rel="noreferrer">
              Data from PokéAPI
            </a>
          </footer>
        </main>
      </div>
      {mobile && (
        <dialog
          className="picker"
          ref={dialog}
          onClose={closePicker}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              dialog.current?.close()
            }
          }}
          onCancel={(event) => {
            event.preventDefault()
            dialog.current?.close()
          }}
          aria-label="Browse Kanto species"
        >
          <SpeciesIndex {...indexProps} close={() => dialog.current?.close()} />
        </dialog>
      )}
    </>
  )
}
