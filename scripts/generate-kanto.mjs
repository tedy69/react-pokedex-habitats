// Regenerate with pnpm exec node scripts/generate-kanto.mjs.
// Requires ImageMagick (magick) for transparent, tightly cropped WebP artwork.
import { execFile } from 'node:child_process'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)
const project = fileURLToPath(new URL('../', import.meta.url))
const cache = join(project, 'node_modules/.cache/react-pokedex-habitats')
const source = 'https://pokeapi.co/api/v2'
const refresh = process.argv.includes('--refresh')
const ids = Array.from({ length: 151 }, (_, index) => index + 1)
const stats = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

async function exists(path) {
  try {
    return (await stat(path)).size > 0
  } catch {
    return false
  }
}

async function download(url, path) {
  if (!refresh && (await exists(path))) return
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) })
      if (!response.ok) throw new Error(`${response.status} ${url}`)
      await writeFile(path, Buffer.from(await response.arrayBuffer()))
      return
    } catch (error) {
      if (attempt === 3) throw error
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
  }
}

async function resource(endpoint, id) {
  const local = join(cache, `${endpoint}-${id}.json`)
  await download(`${source}/${endpoint}/${id}/`, local)
  return JSON.parse(await readFile(local, 'utf8'))
}

async function prepareImages(id, sprites) {
  const original = join(cache, `art-${id}.png`)
  const art = join(project, 'public/art', `${id}.webp`)
  await download(sprites.front_default, join(project, 'public/sprites', `${id}.png`))
  if (refresh || !(await exists(art))) {
    await download(sprites.other['official-artwork'].front_default, original)
    await run('magick', [original, '-trim', '+repage', '-quality', '90', art])
  }
}

function chooseHabitat(types, habitat) {
  if (types.includes('water') || types.includes('ice') || ['waters-edge', 'sea'].includes(habitat))
    return 'pool'
  if (
    types.includes('fire') ||
    types.includes('rock') ||
    ['cave', 'mountain', 'rough-terrain'].includes(habitat)
  )
    return 'volcano'
  if (types.includes('electric')) return 'grassland'
  if (
    types.includes('grass') ||
    types.includes('bug') ||
    habitat === 'forest' ||
    types.includes('ghost')
  )
    return 'forest'
  return 'grassland'
}

function getEnglish(items, field) {
  return items.find((item) => item.language.name === 'en')[field]
}

function getDescription(species) {
  const english = species.flavor_text_entries.filter((item) => item.language.name === 'en')
  const entry = english.find((item) => item.version.name === 'omega-ruby') || english.at(-1)
  return entry.flavor_text.replace(/\s+/g, ' ').trim()
}

function resourceId(resource) {
  return resource ? Number(resource.url.split('/').filter(Boolean).at(-1)) : null
}

async function prepare(id) {
  const [pokemon, species] = await Promise.all([
    resource('pokemon', id),
    resource('pokemon-species', id),
  ])
  await prepareImages(id, pokemon.sprites)
  const types = [...pokemon.types].sort((a, b) => a.slot - b.slot).map((slot) => slot.type.name)
  return {
    index: {
      id,
      name: getEnglish(species.names, 'name'),
      genus: getEnglish(species.genera, 'genus'),
      types,
      habitat: chooseHabitat(types, species.habitat?.name),
    },
    entry: {
      id,
      description: getDescription(species),
      height: pokemon.height / 10,
      weight: pokemon.weight / 10,
      abilities: pokemon.abilities.map((slot) =>
        slot.ability.name
          .split('-')
          .map((word) => word[0].toUpperCase() + word.slice(1))
          .join(' '),
      ),
      stats: pokemon.stats.map((slot) => ({ name: stats[slot.stat.name], value: slot.base_stat })),
    },
    familyId: resourceId(species.evolution_chain),
    parent: resourceId(species.evolves_from_species),
  }
}

await Promise.all(
  [cache, 'public/data', 'public/art', 'public/sprites', 'src/data'].map((path) =>
    mkdir(path === cache ? path : join(project, path), { recursive: true }),
  ),
)
const records = []
for (let offset = 0; offset < ids.length; offset += 4) {
  records.push(...(await Promise.all(ids.slice(offset, offset + 4).map(prepare))))
}
for (const record of records) {
  const members = records.filter((other) => other.familyId === record.familyId)
  const edges = members
    .filter((item) => item.parent && item.parent <= 151)
    .map((item) => [item.parent, item.index.id])
  const entry = { ...record.entry, family: members.map((item) => item.index.id), edges }
  await writeFile(join(project, 'public/data', `${entry.id}.json`), JSON.stringify(entry) + '\n')
}
await writeFile(
  join(project, 'src/data/kanto.json'),
  JSON.stringify(records.map((r) => r.index)) + '\n',
)
console.log(`Generated ${records.length} species records, artworks and sprites.`)
