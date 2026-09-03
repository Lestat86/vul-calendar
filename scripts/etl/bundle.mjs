/**
 * Unisce tutte le fonti in ciò che l'app scarica.
 *
 * Regole di precedenza, in ordine:
 *  1. data/*.json curati a mano  -> autorità assoluta
 *  2. anni estratti dal feed pubblico NAQP -> affidabili (sono l'incipit
 *     dell'episodio: "Siamo a Napoli, nel 1993")
 *  3. proposte automatiche di resolve-dates.mjs -> NON entrano. Mai.
 *
 * Gli eventi non vengono tagliati: si assegna a ciascuno un `rank` dentro il
 * suo anno, e l'interfaccia decide quanti mostrarne. Tagliare qui vorrebbe
 * dire buttare dati che poi non si recuperano senza rigirare l'ETL.
 */
import { readJSON, writeJSON } from './lib.mjs'
import { VUL_EPOCH } from './vul-epoch.mjs'

const toVul = (year, era) => (era === 'dc' ? year : 1 - year) - VUL_EPOCH
/**
 * Del URL Commons teniamo solo il nome del file: l'app ricostruisce sia la URL
 * del thumbnail sia i crediti. Inlinearli costava il 43% del payload.
 */
const fileOf = (url) =>
  url ? decodeURIComponent(url.split('Special:FilePath/')[1] ?? '') || null : null

/** Butta i campi null e i default: su 2500 eventi sono decine di KB. */
const slim = (o) => Object.fromEntries(
  Object.entries(o).filter(([k, v]) =>
    v !== null && v !== undefined && v !== false && !(k === 'precision' && v === 'anno')),
)

const [wikidata, pre1900, lurido, naqpPub, naqpPat, manualDates, credits] = await Promise.all([
  readJSON('data/generated/wikidata.json', []),
  readJSON('data/events-pre1900.json', []),
  readJSON('data/events-lurido.json', []),
  readJSON('data/generated/naqp-public.json', []),
  readJSON('data/generated/naqp-patreon.json', []),
  readJSON('data/naqp-dates.json', {}),
  readJSON('data/generated/image-credits.json', {}),
])


const events = []

// --- traccia storia: Wikidata (1900+) ---
for (const e of wikidata) {
  events.push(slim({
    id: e.id, track: 'storia', title: e.title, summary: e.summary,
    year: e.year, era: 'dc', vul: toVul(e.year, 'dc'),
    precision: e.precision, kind: e.kind,
    image: fileOf(e.image),
    weight: e.weight,
  }))
}

// --- traccia storia: curati pre-1900 ---
for (const [i, e] of pre1900.entries()) {
  events.push(slim({
    id: `curated:pre1900:${i}`, track: 'storia', title: e.title, summary: e.summary,
    year: e.year, era: e.era, vul: toVul(e.year, e.era),
    precision: e.precision, kind: e.kind,
    weight: 1000, // curati a mano: sempre in cima al loro anno
    curated: true,
  }))
}

// --- traccia lurido ---
for (const [i, e] of lurido.entries()) {
  events.push(slim({
    id: `curated:lurido:${i}`, track: 'lurido', title: e.title, summary: e.summary,
    year: e.year, era: 'dc', vul: toVul(e.year, 'dc'),
    precision: e.precision, kind: e.kind,
    weight: e.anchor ? 10_000 : e.pin ? 5000 : 1000,
    anchor: e.anchor ?? false, pin: e.pin ?? false,
    curated: true,
  }))
}

// --- traccia naqp ---
const EPISODE_TIERS = new Set(['pubblico', 'esclusivo', 'episodio'])
/** Trailer, interviste e confronti non raccontano un caso: non hanno un anno da collocare. */
const NON_CASI = /trailer|l['’]intervista|confronto con/i
const undated = []
for (const ep of [...naqpPub, ...naqpPat]) {
  if (!EPISODE_TIERS.has(ep.tier)) continue // via backstage, live, video, sondaggi
  if (NON_CASI.test(ep.title)) continue
  const override = manualDates[ep.id]
  const year = override?.year ?? ep.year ?? null
  if (!year) {
    undated.push({ id: ep.id, title: ep.title, tier: ep.tier, isSpecial: ep.isSpecial })
    continue
  }
  events.push(slim({
    id: ep.id, track: 'naqp', title: ep.title,
    summary: ep.summary ?? null, // assente per gli esclusivi Patreon: paywall
    year, era: 'dc', vul: toVul(year, 'dc'),
    precision: override?.precision ?? ep.precision ?? 'anno',
    kind: ep.isSpecial ? 'speciale' : 'caso',
    weight: 1000,
    tier: ep.tier, season: ep.season, episode: ep.episode,
    dateSource: override ? 'manuale' : 'descrizione',
    url: ep.source?.url ?? null,
  }))
}

// --- rank dentro l'anno, per traccia ---
const groups = new Map()
for (const e of events) {
  const key = `${e.track}|${e.vul}`
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key).push(e)
}
for (const list of groups.values()) {
  list.sort((a, b) => b.weight - a.weight || a.title.localeCompare(b.title))
  list.forEach((e, i) => { e.rank = i })
}

events.sort((a, b) => a.vul - b.vul || a.rank - b.rank)

// --- chunk per secolo VUL ---
const CHUNK = 10 // decennio VUL: chunk da ~100KB, non da 1MB
const chunks = new Map()
for (const e of events) {
  const b = Math.floor(e.vul / CHUNK)
  if (!chunks.has(b)) chunks.set(b, [])
  chunks.get(b).push(e)
}

const TRACKS = ['storia', 'lurido', 'naqp']
const density = new Map()
for (const e of events) {
  if (!density.has(e.vul)) density.set(e.vul, [0, 0, 0])
  density.get(e.vul)[TRACKS.indexOf(e.track)] += 1
}

const index = {
  epoch: VUL_EPOCH,
  cycle: 31,
  generatedAt: new Date().toISOString().slice(0, 10),
  tracks: TRACKS,
  chunkSize: CHUNK,
  range: { minVul: events[0].vul, maxVul: events.at(-1).vul },
  totals: TRACKS.reduce((a, t) => ({ ...a, [t]: events.filter((e) => e.track === t).length }), {}),
  /** [annoVul, storia, lurido, naqp] — serve a disegnare il righello prima dei dati */
  density: [...density.entries()].sort((a, b) => a[0] - b[0]).map(([v, c]) => [v, ...c]),
  chunks: [...chunks.keys()].sort((a, b) => a - b),
  undatedNaqp: undated.length,
}

await writeJSON('public/data/index.json', index)
for (const [b, list] of chunks) await writeJSON(`public/data/chunk.${b}.json`, list)
await writeJSON('public/data/naqp-undated.json', undated)

// crediti immagine in un file separato: obbligatori da mostrare, ma solo
// quando una foto è effettivamente a schermo. Chiave = nome file Commons.
const usedFiles = new Set(events.map((e) => e.image).filter(Boolean))
await writeJSON('public/data/credits.json', Object.fromEntries(
  Object.entries(credits)
    .filter(([file]) => usedFiles.has(file.replace(/^File:/, '')))
    .map(([file, c]) => [file.replace(/^File:/, ''), c]),
))

console.log('\ntotali per traccia:', index.totals)
console.log(`chunk: ${chunks.size}, anni VUL coperti: ${density.size}`)
console.log(`range: ${index.range.minVul} → ${index.range.maxVul} VUL`)
console.log(`episodi NAQP ancora senza anno: ${undated.length}`)
