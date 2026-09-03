/**
 * Autore e licenza delle immagini Wikimedia Commons.
 *
 * Non è un vezzo: gran parte di Commons è CC-BY o CC-BY-SA, che obbligano
 * all'attribuzione. Senza questo passo l'app userebbe 1800 foto senza dire di
 * chi sono. Le richieste vanno a lotti di 50 titoli (limite dell'API).
 */
import { getJSON, readJSON, sleep, writeJSON } from './lib.mjs'

const events = await readJSON('data/generated/wikidata.json', [])
const titles = [...new Set(
  events.filter((e) => e.image)
    .map((e) => 'File:' + decodeURIComponent(e.image.split('Special:FilePath/')[1] ?? ''))
    .filter((t) => t !== 'File:'),
)]
console.log(`crediti immagine: ${titles.length} file da Commons`)

const credits = {}
for (let i = 0; i < titles.length; i += 50) {
  const batch = titles.slice(i, i + 50)
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', prop: 'imageinfo', iiprop: 'extmetadata|url',
    iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl',
    titles: batch.join('|'), format: 'json', formatversion: '2',
  })
  const data = await getJSON(url, { timeout: 45_000 })
  for (const page of data.query?.pages ?? []) {
    const meta = page.imageinfo?.[0]?.extmetadata
    if (!meta) continue
    const strip = (v) => v?.value?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || null
    credits[page.title] = {
      author: strip(meta.Artist),
      license: strip(meta.LicenseShortName),
      licenseUrl: strip(meta.LicenseUrl),
      filePage: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
    }
  }
  console.log(`  ${Math.min(i + 50, titles.length)}/${titles.length}`)
  await sleep(300)
}
const withAuthor = Object.values(credits).filter((c) => c.author).length
console.log(`risolti ${Object.keys(credits).length}, con autore noto ${withAuthor}`)
await writeJSON('data/generated/image-credits.json', credits)
