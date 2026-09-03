/**
 * Pipeline completa. Gira in locale, non in build: il deploy consuma solo
 * lo snapshot JSON committato, così il sito non dipende da Wikidata, da
 * Megaphone né da Patreon nel momento in cui qualcuno lo apre.
 *
 * Ordine obbligato: i crediti immagine leggono l'output di Wikidata, e il
 * bundle legge tutto il resto.
 */
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const STEPS = [
  ['fetch-wikidata.mjs', 'eventi storici da Wikidata (lento: ~13 query)'],
  ['fetch-image-credits.mjs', 'autore e licenza delle immagini Commons'],
  ['fetch-naqp.mjs', 'episodi NAQP dal feed pubblico'],
  ['fetch-patreon.mjs', 'titoli NAQP dalla campagna Patreon'],
  ['bundle.mjs', 'assemblaggio in public/data'],
]

const only = process.argv[2]
for (const [file, what] of STEPS) {
  if (only && !file.includes(only)) continue
  console.log(`\n=== ${file} — ${what}`)
  const code = await new Promise((res) => {
    spawn(process.execPath, [resolve(import.meta.dirname, file)], { stdio: 'inherit' })
      .on('close', res)
  })
  if (code !== 0) {
    console.error(`\n✗ ${file} è fallito (exit ${code}). Mi fermo qui.`)
    process.exit(code)
  }
}
console.log('\nFatto. resolve-dates.mjs va lanciato a parte: genera proposte da rivedere a mano.')
