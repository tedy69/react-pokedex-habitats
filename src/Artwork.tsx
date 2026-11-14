import { useEffect, useRef, useState } from 'react'
import { artworkUrl, spriteUrl, type Species } from './data'

type Picture = { id: number; name: string; src: string }
function picture(s: Species): Picture {
  return { id: s.id, name: s.name, src: artworkUrl(s.id) }
}

export default function Artwork({ item }: { item: Species }) {
  const [current, setCurrent] = useState(() => picture(item))
  const [previous, setPrevious] = useState<Picture | null>(null)
  const shown = useRef(current)
  useEffect(() => {
    let active = true
    if (item.id === shown.current.id) return
    const next = picture(item)
    const preload = new Image()
    const show = () => {
      if (!active) return
      setPrevious(shown.current)
      shown.current = next
      setCurrent(next)
    }
    preload.onload = show
    preload.onerror = () => {
      if (!active) return
      if (next.src === spriteUrl(next.id)) {
        show()
        return
      }
      next.src = spriteUrl(next.id)
      preload.src = next.src
    }
    preload.src = next.src
    return () => {
      active = false
      preload.onload = null
      preload.onerror = null
    }
  }, [item])
  useEffect(() => {
    if (!previous) return
    const timer = window.setTimeout(() => setPrevious(null), 320)
    return () => clearTimeout(timer)
  }, [previous])
  return (
    <div className="art-stage">
      <div className="contact-shadow" />
      {previous && (
        <img
          className="specimen-art leaving"
          key={'old' + previous.id}
          src={previous.src}
          alt=""
          width="475"
          height="475"
        />
      )}
      <img
        className={'specimen-art' + (previous ? ' arriving' : '')}
        key={current.id}
        src={current.src}
        alt={current.name}
        data-art-id={current.id}
        fetchPriority="high"
        width="475"
        height="475"
        onError={(e) => {
          if (!e.currentTarget.src.endsWith('/sprites/' + current.id + '.png'))
            e.currentTarget.src = spriteUrl(current.id)
        }}
      />
    </div>
  )
}
