import { artworkUrl, species, spriteUrl, type Species, type Entry } from './data'
import { Icon, TypeTag } from './Icons'
import { numberLabel } from './SpeciesIndex'

function Evolution({ entry, select }: { entry: Entry; select: (id: number) => void }) {
  if (entry.family.length === 1) return <p className="no-evolution">No Kanto evolution recorded.</p>
  const children = new Set(entry.edges.map(([, child]) => child))
  function node(id: number) {
    const item = species[id - 1]
    const descendants = entry.edges.filter(([parent]) => parent === id)
    return (
      <div className="evo-path" key={id}>
        <button
          className="evo-member"
          onClick={() => select(id)}
          aria-current={id === entry.id ? 'page' : undefined}
        >
          <img
            src={artworkUrl(id)}
            alt=""
            loading="lazy"
            width="64"
            height="60"
            onError={(e) => {
              if (!e.currentTarget.src.endsWith('/sprites/' + id + '.png'))
                e.currentTarget.src = spriteUrl(id)
            }}
          />
          <span>
            <small>№ {numberLabel(id)}</small>
            <b>{item.name}</b>
          </span>
        </button>
        {descendants.length > 0 && (
          <>
            <Icon name="arrow" size={17} />
            <div className="evo-children">{descendants.map(([, child]) => node(child))}</div>
          </>
        )}
      </div>
    )
  }
  return <div className="evo-tree">{entry.family.filter((id) => !children.has(id)).map(node)}</div>
}

export default function Records({
  item,
  entry,
  error,
  retry,
  select,
}: {
  item: Species
  entry: Entry | null
  error: string | null
  retry: () => void
  select: (id: number) => void
}) {
  return (
    <div className="record-details">
      <div className="notes-stats">
        <section className="notes">
          <h2>Field notes</h2>
          <div className="tags">
            {item.types.map((t) => (
              <TypeTag type={t} key={t} />
            ))}
          </div>
          {entry && (
            <>
              <p className="description">{entry.description}</p>
              <dl className="measures">
                <div>
                  <dt>Height</dt>
                  <dd>
                    {entry.height} <span>m</span>
                  </dd>
                </div>
                <div>
                  <dt>Weight</dt>
                  <dd>
                    {entry.weight} <span>kg</span>
                  </dd>
                </div>
              </dl>
              <dl className="abilities">
                <dt>Abilities</dt>
                <dd>{entry.abilities.join(' · ')}</dd>
              </dl>
            </>
          )}
          {!entry &&
            (error ? (
              <div role="alert">
                <p>{error}</p>
                <button className="text-button" onClick={retry}>
                  Retry
                </button>
              </div>
            ) : (
              <p role="status">Loading field notes…</p>
            ))}
        </section>
        <section className="stats">
          <div className="section-heading">
            <h2>Base stats</h2>
            {entry && (
              <span className="sum">
                TOTAL <b>{entry.stats.reduce((sum, s) => sum + s.value, 0)}</b>
              </span>
            )}
          </div>
          {entry && (
            <dl className="stat-list">
              {entry.stats.map((s) => (
                <div key={s.name}>
                  <dt>{s.name}</dt>
                  <dd>
                    <span className="track">
                      <span style={{ width: (s.value / 255) * 100 + '%' }} />
                    </span>
                    <b>{s.value}</b>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>
      {entry && (
        <section className="evolution">
          <h2>Evolution family</h2>
          <Evolution entry={entry} select={select} />
        </section>
      )}
    </div>
  )
}
