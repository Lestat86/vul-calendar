/**
 * Traccia "storia", parte automatica: eventi 1900 -> oggi da Wikidata.
 *
 * Due scelte non ovvie:
 *  - la notorietà si misura con wikibase:sitelinks (quante Wikipedia hanno la
 *    voce). Wikidata non ha un ranking di rilevanza, e senza questo proxy
 *    tornano decine di migliaia di eventi tutti uguali.
 *  - si interroga un decennio per volta. La stessa query su 126 anni va in
 *    timeout a 60s sull'endpoint pubblico.
 */
import { EVENT_CLASSES } from './classes.mjs'
import { sleep, sparql, writeJSON } from './lib.mjs'

const DA = 1900
const A = new Date().getUTCFullYear()
const MIN_SITELINKS = 15

const values = EVENT_CLASSES.map(([qid]) => `wd:${qid}`).join(' ')

const query = (from, to) => `
SELECT ?e ?eLabel ?eDescription ?date ?img ?links ?cls ?clsLabel WHERE {
  VALUES ?cls { ${values} }
  ?e wdt:P31 ?cls ;
     wikibase:sitelinks ?links .
  { ?e wdt:P585 ?date } UNION { ?e wdt:P580 ?date }
  FILTER(?links >= ${MIN_SITELINKS})
  FILTER("${from}-01-01"^^xsd:dateTime <= ?date && ?date < "${to}-01-01"^^xsd:dateTime)
  OPTIONAL { ?e wdt:P18 ?img }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "it,en". }
}`

/** Un evento con più date (P585 e P580) torna duplicato: tieni la più antica. */
function dedupe(rows) {
  const byId = new Map()
  for (const r of rows) {
    const id = r.e.value.split('/').pop()
    const prev = byId.get(id)
    if (!prev || r.date.value < prev.date.value) byId.set(id, r)
  }
  return [...byId.values()]
}

function shape(r) {
  const id = r.e.value.split('/').pop()
  const label = r.eLabel?.value ?? id
  // il label-service ripiega sul QID quando manca la lingua: scartali
  if (/^Q\d+$/.test(label)) return null
  return {
    id: `wd:${id}`,
    track: 'storia',
    title: label,
    summary: r.eDescription?.value ?? null,
    date: r.date.value.slice(0, 10),
    year: Number(r.date.value.slice(0, 4)) * (r.date.value.startsWith('-') ? -1 : 1),
    precision: 'anno',
    kind: r.clsLabel?.value ?? null,
    image: r.img?.value ?? null,
    weight: Number(r.links.value),
    source: { kind: 'wikidata', url: r.e.value },
  }
}

console.log(`Wikidata: eventi ${DA}-${A}, ${EVENT_CLASSES.length} classi, sitelinks >= ${MIN_SITELINKS}`)
const all = []
for (let d = DA; d <= A; d += 10) {
  const to = Math.min(d + 10, A + 1)
  const rows = await sparql(query(d, to))
  const shaped = dedupe(rows).map(shape).filter(Boolean)
  all.push(...shaped)
  console.log(`  ${d}-${to - 1}: ${rows.length} righe → ${shaped.length} eventi`)
  await sleep(1000) // buon vicinato con l'endpoint pubblico
}

const byId = new Map(all.map((e) => [e.id, e]))
const events = [...byId.values()].sort((a, b) => a.date.localeCompare(b.date))
console.log(`totale: ${events.length} eventi unici, ${events.filter((e) => e.image).length} con immagine`)
await writeJSON('data/generated/wikidata.json', events)
