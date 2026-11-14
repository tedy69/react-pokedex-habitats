import { Component, lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import './habitat.css'

import type { HabitatKind } from '../data'
export type { HabitatKind } from '../data'
export type Plate = { kind: HabitatKind; image: HTMLImageElement }
export type PlatePair = { previous: Plate | null; current: Plate }

const Scene = lazy(() => import('./Scene'))
const images = new Map<HabitatKind, Promise<Plate>>()
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
const subscribeMotion = (notify: () => void) => {
  motionQuery.addEventListener('change', notify)
  return () => motionQuery.removeEventListener('change', notify)
}
const prefersReducedMotion = () => motionQuery.matches
const subscribeVisibility = (notify: () => void) => {
  document.addEventListener('visibilitychange', notify)
  return () => document.removeEventListener('visibilitychange', notify)
}
const tabVisible = () => !document.hidden
const plateUrl = (kind: HabitatKind) => `${import.meta.env.BASE_URL}habitats/${kind}.webp`

function loadPlate(kind: HabitatKind) {
  const existing = images.get(kind)
  if (existing) return existing
  const image = new Image()
  const loaded = new Promise<Plate>((resolve, reject) => {
    image.onload = () => resolve({ kind, image })
    image.onerror = () => {
      images.delete(kind)
      reject(new Error('Habitat plate unavailable'))
    }
    image.src = plateUrl(kind)
  })
  images.set(kind, loaded)
  return loaded
}

class GraphicsBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export default function Habitat({ kind, paused = false }: { kind: HabitatKind; paused?: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const reduced = useSyncExternalStore(subscribeMotion, prefersReducedMotion)
  const visible = useSyncExternalStore(subscribeVisibility, tabVisible)
  const [inView, setInView] = useState(false)
  const [started, setStarted] = useState(false)
  const [hasContext, setHasContext] = useState(false)
  const [contextLost, setContextLost] = useState(false)
  const [pair, setPair] = useState<PlatePair | null>(null)

  useEffect(() => {
    let live = true
    loadPlate(kind)
      .then((current) => {
        if (live)
          setPair((old) =>
            old?.current.kind === kind ? old : { previous: old?.current ?? null, current },
          )
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [kind])

  useEffect(() => {
    const node = host.current
    if (!node) return
    const observer = new IntersectionObserver((entries) => setInView(entries[0].isIntersecting))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (started || reduced || !inView || !visible || paused) return
    const frame = requestAnimationFrame(() => setStarted(true))
    return () => cancelAnimationFrame(frame)
  }, [started, reduced, inView, visible, paused])

  useEffect(() => {
    const frame = host.current?.parentElement
    if (!frame || reduced || paused || !inView || !visible) return
    function move(event: PointerEvent) {
      if (event.pointerType === 'touch') return
      const bounds = frame!.getBoundingClientRect()
      pointer.current.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
      pointer.current.y = 1 - ((event.clientY - bounds.top) / bounds.height) * 2
    }
    function center() {
      pointer.current.x = 0
      pointer.current.y = 0
    }
    frame.addEventListener('pointermove', move, { passive: true })
    frame.addEventListener('pointerleave', center)
    return () => {
      frame.removeEventListener('pointermove', move)
      frame.removeEventListener('pointerleave', center)
      center()
    }
  }, [paused, reduced, inView, visible])

  const enhanced =
    started && !reduced && !contextLost && typeof WebGL2RenderingContext !== 'undefined'
  const current = pair?.current.kind ?? kind
  return (
    <div
      className="habitat-layers"
      ref={host}
      aria-hidden="true"
      data-habitat={kind}
      data-renderer={enhanced && hasContext ? 'webgl' : 'static'}
      data-motion={reduced || paused ? 'paused' : 'enabled'}
    >
      {pair?.previous && (
        <div
          className="habitat-plate"
          style={{ backgroundImage: `url(${plateUrl(pair.previous.kind)})` }}
        />
      )}
      <div
        key={current}
        className={'habitat-plate' + (pair?.previous ? ' habitat-enter' : '')}
        style={{ backgroundImage: `url(${plateUrl(current)})` }}
      />
      {enhanced && pair && (
        <GraphicsBoundary>
          <Suspense fallback={null}>
            <Scene
              pair={pair}
              active={inView && visible}
              paused={paused}
              pointer={pointer}
              onReady={setHasContext}
              onLost={setContextLost}
            />
          </Suspense>
        </GraphicsBoundary>
      )}
    </div>
  )
}
