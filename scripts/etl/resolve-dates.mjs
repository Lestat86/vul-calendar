/**
 * Datazione degli episodi NAQP che non hanno un anno.
 *
 * PERCHÉ QUESTO SCRIPT NON SCRIVE MAI IN TIMELINE:
 * gli esclusivi Patreon non hanno description pubbliche, quindi l'unico
 * aggancio è il nome del caso nel titolo. Risolverlo su Wikipedia col primo
 * risultato di ricerca produce anni sbagliati con grande sicurezza:
 * "Il Caso Ken Rex McElroy" -> "Greg McElroy" (footballer) -> 2011, mentre il
 * caso è del 1981. Su una timeline un anno sbagliato non si vede: è peggio di
 * un buco. Quindi qui si generano solo PROPOSTE, da confermare a mano in
 * data/naqp-dates.json, e il bundle usa esclusivamente quelle confermate.
 *
 * Il gate sotto scarta i match in cui il titolo trovato non contiene tutte le
 * parole significative del nome cercato. Alza la precisione, non la risolve:
 * "Landru" -> il film di Chabrol (1963) passa ancora. Da qui, occhio umano.
 */
import { getJSON, readJSON, sleep, writeJSON } from './lib.mjs'

const STOP = new Set(['caso', 'special', 'speciale', 'operazione', 'storia', 'parte'])

const norm = (s) => new Set(
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().match(/\w{3,}/g) ?? [],
)

const searchUrl = (lang, q) => `https://${lang}.wikipedia.org/w/api.php?` +
  new URLSearchParams({ action: 'query', list: 'search', srsearch: q, srlimit: '3', format: 'json', origin: '*' })

const summaryUrl = (lang, t) =>
  `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t)}`

async function propose(name) {
  const wanted = new Set([...norm(name)].filter((w) => !STOP.has(w)))
  if (!wanted.size) return { status: 'nome-troppo-generico' }

  for (const lang of ['it', 'en']) {
    let hits = []
    try {
      hits = (await getJSON(searchUrl(lang, name), { tries: 2, timeout: 20_000 }))
        .query?.search ?? []
    } catch { continue }

    for (const hit of hits) {
      const got = norm(hit.title)
      const covered = [...wanted].every((w) => got.has(w))
      if (!covered) continue

      let extract = ''
      try {
        extract = (await getJSON(summaryUrl(lang, hit.title), { tries: 2, timeout: 20_000 })).extract ?? ''
      } catch { continue }
      const year = extract.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/)
      if (year) {
        return {
          status: 'proposta',
          year: Number(year[1]),
          matchedPage: hit.title,
          lang,
          evidence: extract.slice(0, 180),
        }
      }
    }
  }
  return { status: 'nessun-match-affidabile' }
}

const pub = await readJSON('data/generated/naqp-public.json', [])
const pat = await readJSON('data/generated/naqp-patreon.json', [])
const manual = await readJSON('data/naqp-dates.json', {})

// solo gli episodi veri: backstage, live, video e sondaggi non sono casi storici
const EPISODE_TIERS = new Set(['pubblico', 'esclusivo', 'episodio'])
const needed = [...pub, ...pat].filter(
  (e) => EPISODE_TIERS.has(e.tier) && !e.year && !manual[e.id] && !e.isSpecial,
)

console.log(`da datare: ${needed.length} episodi (esclusi speciali e già confermati a mano)`)

const proposals = []
for (const [i, ep] of needed.entries()) {
  const res = await propose(ep.title)
  proposals.push({ id: ep.id, title: ep.title, tier: ep.tier, ...res })
  if (res.status === 'proposta') {
    console.log(`  ✓ ${String(res.year)}  ${ep.title.slice(0, 40).padEnd(40)} → ${res.matchedPage}`)
  }
  if ((i + 1) % 25 === 0) console.log(`  ...${i + 1}/${needed.length}`)
  await sleep(150)
}

const ok = proposals.filter((p) => p.status === 'proposta')
console.log(`\nproposte: ${ok.length}   in coda umana: ${proposals.length - ok.length}`)
console.log('NESSUNA di queste entra in timeline finché non la copi in data/naqp-dates.json')
await writeJSON('data/generated/naqp-dates.proposals.json', proposals)
