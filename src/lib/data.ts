/**
 * Caricamento dati.
 *
 * L'index contiene la densità per anno VUL: basta a disegnare tutta la
 * timeline (righello, salti, conteggi) prima di scaricare un solo evento.
 * I chunk sono decennali e si caricano quando il decennio entra in viewport.
 */
export type Track = 'storia' | 'lurido' | 'naqp'
export type Era = 'ac' | 'dc'
export type Precision = 'anno' | 'circa' | 'decennio' | 'secolo'

export interface VulEvent {
  id: string
  track: Track
  title: string
  summary?: string
  year: number
  era?: Era // assente = 'dc'
  vul: number
  precision?: Precision // assente = 'anno'
  kind?: string
  image?: string // nome file Commons, la URL si ricostruisce
  weight: number
  rank: number
  anchor?: boolean
  pin?: boolean
  curated?: boolean
  tier?: string
  season?: number
  episode?: number
  dateSource?: 'manuale' | 'descrizione'
  url?: string
}

export interface VulIndex {
  epoch: number
  cycle: number
  generatedAt: string
  tracks: Track[]
  chunkSize: number
  range: { minVul: number; maxVul: number }
  totals: Record<Track, number>
  density: [number, number, number, number][] // [vul, storia, lurido, naqp]
  chunks: number[]
  undatedNaqp: number
}

export interface ImageCredit {
  author: string | null
  license: string | null
  licenseUrl: string | null
  filePage: string
}

const BASE = `${import.meta.env.BASE_URL}data`

export const eraOf = (e: VulEvent): Era => e.era ?? 'dc'
export const precisionOf = (e: VulEvent): Precision => e.precision ?? 'anno'

export function imageUrl(file: string, width = 480): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${
    encodeURIComponent(file)}?width=${width}`
}

/** La URL della fonte è derivabile: non la spediamo dentro ogni evento. */
export function sourceUrl(e: VulEvent): string | null {
  if (e.url) return e.url
  if (e.id.startsWith('wd:')) return `https://www.wikidata.org/wiki/${e.id.slice(3)}`
  return null
}

export const chunkOf = (vul: number, size: number) => Math.floor(vul / size)

async function json<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`)
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export const loadIndex = () => json<VulIndex>('index.json')
export const loadCredits = () => json<Record<string, ImageCredit>>('credits.json')

const cache = new Map<number, Promise<VulEvent[]>>()
export function loadChunk(bucket: number): Promise<VulEvent[]> {
  let p = cache.get(bucket)
  if (!p) {
    p = json<VulEvent[]>(`chunk.${bucket}.json`).catch(() => [])
    cache.set(bucket, p)
  }
  return p
}

/**
 * L'anno popolato più vicino a quello chiesto.
 *
 * La gran parte degli anni non ha eventi e quindi non ha una riga in pagina:
 * chiedere "1500 d.C." al convertitore non deve lasciare fermo lo scroll, deve
 * portare all'anno più vicino che esiste. A parità di distanza vince il
 * precedente, così si atterra sull'evento già avvenuto.
 */
export function nearestPopulatedYear(years: number[], vul: number): number | null {
  let best: number | null = null
  for (const y of years) {
    if (best === null) { best = y; continue }
    const d = Math.abs(y - vul)
    const bd = Math.abs(best - vul)
    if (d < bd || (d === bd && y < best)) best = y
  }
  return best
}

/** Righe della timeline: gli anni popolati, con i vuoti compressi in salti. */
export type Row =
  | { kind: 'year'; vul: number; counts: Record<Track, number> }
  | { kind: 'gap'; fromVul: number; toVul: number; years: number }

export function buildRows(index: VulIndex, tracks: Set<Track>): Row[] {
  const visible = index.density.filter(([, s, l, n]) =>
    (tracks.has('storia') && s > 0) || (tracks.has('lurido') && l > 0) || (tracks.has('naqp') && n > 0))

  const rows: Row[] = []
  for (const [i, entry] of visible.entries()) {
    const [vul, s, l, n] = entry
    const prev = visible[i - 1]
    if (prev && vul - prev[0] > 1) {
      rows.push({ kind: 'gap', fromVul: prev[0], toVul: vul, years: vul - prev[0] - 1 })
    }
    rows.push({ kind: 'year', vul, counts: { storia: s, lurido: l, naqp: n } })
  }
  return rows
}
