/**
 * Scheda di lavoro per gli episodi che non si datano da sé.
 *
 * Scrive data/naqp-dates.todo.json con una voce già formattata per ciascuno,
 * incipit incluso: nella gran parte dei casi la data si legge lì, e l'estrazione
 * ha solo mancato la forma in cui è scritta. Le voci compilate si spostano in
 * data/naqp-dates.json, che è l'unico file che la timeline guarda.
 */
import { readJSON, writeJSON } from './lib.mjs'

const [undated, pub, pat] = await Promise.all([
  readJSON('public/data/naqp-undated.json', []),
  readJSON('data/generated/naqp-public.json', []),
  readJSON('data/generated/naqp-patreon.json', []),
])
const source = new Map([...pub, ...pat].map((e) => [e.id, e]))

const rows = undated
  .map((e) => {
    const src = source.get(e.id)
    return {
      id: e.id,
      title: e.title,
      tier: e.tier,
      isSpecial: e.isSpecial,
      incipit: src?.summary ?? null,
      year: null, // <-- da compilare
      precision: 'anno',
    }
  })
  .sort((a, b) =>
    Number(a.isSpecial) - Number(b.isSpecial)
    || a.tier.localeCompare(b.tier)
    || a.title.localeCompare(b.title))

await writeJSON('data/naqp-dates.todo.json', rows)
console.log(`  con incipit: ${rows.filter((r) => r.incipit).length}/${rows.length}`)
console.log('  compila "year" e sposta le voci in data/naqp-dates.json')
