import type { CSSProperties } from 'react'

const paths = {
  search: 'M13.5 13.5 20 20 M16 9.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 1 1 13 0',
  bookmark: 'M6.5 3.5h11v17L12 17l-5.5 3.5z',
  left: 'm14.5 5-7 7 7 7',
  right: 'm9.5 5 7 7-7 7',
  down: 'm5 9 7 7 7-7',
  close: 'm5 5 14 14M19 5 5 19',
  book: 'M3 4.5c3-.8 6-.4 9 1.2 3-1.6 6-2 9-1.2v14c-3-.8-6-.4-9 1.2-3-1.6-6-2-9-1.2zM12 5.7v14',
  filter: 'M3 7h7m5 0h6M3 17h3m5 0h10M10 4.5h5v5h-5zM6 14.5h5v5H6z',
  habitat: 'm2 18 6-9 4 5 4-8 6 12z M6 18h13',
  pause: 'M8 5v14M16 5v14',
  play: 'm7 4 12 8-12 8z',
  leaf: 'M5 18C2 10 9 5 19 4c1 10-3 16-12 15M4 21l11-11',
  poison: 'M4 14c0-5 5-10 8-12 4 4 8 8 8 12a8 8 0 0 1-16 0zM8 15h2m4 0h2',
  fire: 'M13 2c0 5 5 7 4 11l3-3c4 10-5 13-10 11C4 19 2 13 7 8c0 3 1 4 2 4 0-4 3-6 4-10z',
  water: 'M12 2c-2 4-8 10-8 14a8 8 0 0 0 16 0c0-4-6-10-8-14z',
  electric: 'm14 2-10 12h7l-1 8 10-13h-7z',
  type: 'M5 8 12 4l7 4v8l-7 4-7-4z',
  arrow: 'M3 12h17m-6-6 6 6-6 6',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.5M3 12h.5M3 18h.5',
} as const

export function Icon({
  name,
  size = 18,
  filled = false,
  style,
}: {
  name: keyof typeof paths
  size?: number
  filled?: boolean
  style?: CSSProperties
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  )
}

export function TypeTag({ type }: { type: string }) {
  const symbol =
    (
      {
        grass: 'leaf',
        poison: 'poison',
        fire: 'fire',
        water: 'water',
        electric: 'electric',
      } as const
    )[type as 'grass' | 'poison' | 'fire' | 'water' | 'electric'] ?? 'type'
  return (
    <span className={'type-tag type-' + type}>
      <Icon name={symbol} size={14} />
      {type}
    </span>
  )
}
