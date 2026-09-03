import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

export const ROOT = resolve(import.meta.dirname, '../..')
export const UA = 'vul-calendar/0.1 (https://github.com/; alberto.ronchi@bytes.black)'

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** fetch con retry esponenziale: Wikidata e Patreon rate-limitano volentieri. */
export async function getJSON(url, { headers = {}, tries = 4, timeout = 90_000 } = {}) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json', ...headers },
        signal: AbortSignal.timeout(timeout),
      })
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`)
      if (!res.ok) throw new Error(`HTTP ${res.status} (non ritentabile)`)
      return await res.json()
    } catch (err) {
      lastErr = err
      if (i < tries - 1) await sleep(1500 * 2 ** i)
    }
  }
  throw new Error(`fetch fallito: ${url}\n  ${lastErr?.message}`)
}

export async function getText(url, { headers = {}, timeout = 90_000 } = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, ...headers },
    signal: AbortSignal.timeout(timeout),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} su ${url}`)
  return res.text()
}

export async function sparql(query) {
  const url = 'https://query.wikidata.org/sparql?' +
    new URLSearchParams({ query, format: 'json' })
  const data = await getJSON(url, { headers: { Accept: 'application/sparql-results+json' } })
  return data.results.bindings
}

export async function readJSON(path, fallback = null) {
  try {
    return JSON.parse(await readFile(resolve(ROOT, path), 'utf8'))
  } catch (err) {
    if (fallback !== null && err.code === 'ENOENT') return fallback
    throw err
  }
}

export async function writeJSON(path, data) {
  const full = resolve(ROOT, path)
  await mkdir(dirname(full), { recursive: true })
  await writeFile(full, JSON.stringify(data, null, 2) + '\n')
  const n = Array.isArray(data) ? data.length : Object.keys(data).length
  console.log(`  → ${path} (${n} voci)`)
}

/** Toglie i tag, le entità e il blocco sponsor dalle description dei feed. */
export function stripDescription(raw) {
  let d = (raw ?? '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;|&#\d+;/gi, ' ')
  const adv = d.toLowerCase().lastIndexOf('#adv')
  if (adv !== -1) d = d.slice(adv + 4)
  return d.replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Incipit narrativo di un episodio, dalla description del feed.
 *
 * Le description NAQP hanno tre parti attaccate: il racconto, l'indice dei
 * capitoli e i ringraziamenti ai patron. Solo la prima serve in una card.
 * L'indice si riconosce dal primo timestamp, che a volte è fra parentesi
 * "(01:02:17)" e a volte nudo "01:04:30 La Sentenza Storica" — vanno gestiti
 * entrambi, altrimenti metà delle card finisce con una scaletta appiccicata.
 */
export function episodeSummary(raw, maxChars = 420) {
  let d = stripDescription(raw)
  if (!d) return null

  d = d.replace(/Learn more about your ad choices.*$/i, '')
  // indice dei capitoli: primo timestamp, con o senza parentesi
  d = d.split(/\(?\b\d{1,2}:\d{2}(?::\d{2})?\b\)?/)[0]
  // intestazioni dell'indice e blocchi di ringraziamenti
  d = d.split(/\b(?:capitoli|timestamp|indice)\s*:/i)[0]
  d = d.split(/\b(?:grazie a|un grazie|si ringrazia|ringraziamo|montaggio|producer)\b/i)[0]
  d = d.replace(/\s+/g, ' ').trim().replace(/^[\s.\-–—:]+|[\s\-–—:]+$/g, '')
  if (d.length < 40) return null // rimasto solo un moncone: meglio niente

  if (d.length <= maxChars) return d
  // taglia a fine frase, non a metà parola
  const cut = d.slice(0, maxChars)
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '))
  return (stop > maxChars * 0.5 ? cut.slice(0, stop + 1) : cut.replace(/\s\S*$/, '') + '…').trim()
}

const DECADI = {
  dieci: 1910, venti: 1920, trenta: 1930, quaranta: 1940, cinquanta: 1950,
  sessanta: 1960, settanta: 1970, ottanta: 1980, novanta: 1990,
}

/**
 * Estrae l'anno dall'incipit narrativo del podcast ("Siamo a Napoli, nel 1993...").
 * Guarda solo i primi caratteri: più avanti nel testo gli anni citati sono
 * di solito riferimenti collaterali, non l'ambientazione del caso.
 */
export function extractYear(text, window = 600) {
  const head = text.slice(0, window)
  const exact = head.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/)
  if (exact) return { year: Number(exact[1]), precision: 'anno' }

  const short = head.match(/anni\s+[’']?(\d0)\b/)
  if (short) {
    const v = Number(short[1])
    return { year: v >= 10 ? 1900 + v : 2000 + v, precision: 'decennio' }
  }
  const named = head.match(new RegExp(`anni\\s+(${Object.keys(DECADI).join('|')})\\b`, 'i'))
  if (named) return { year: DECADI[named[1].toLowerCase()], precision: 'decennio' }

  return null
}
