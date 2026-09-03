/**
 * Traccia "naqp", esclusivi Patreon.
 *
 * L'endpoint che alimenta la pagina pubblica della campagna espone titolo e
 * data di pubblicazione di tutti i post senza autenticazione. Il CONTENUTO
 * (`content`, `teaser_text`) torna null perché è dietro il paywall: verificato,
 * non è un bug nostro. Quindi qui non c'è nessun anno da estrarre e la
 * datazione passa per resolve-dates.mjs + revisione manuale.
 *
 * Salviamo solo titolo, data e link. Niente contenuti a pagamento.
 */
import { getJSON, sleep, writeJSON } from './lib.mjs'

const CAMPAIGN = '10678821' // Non Aprite Quella Podcast
const CAMPAIGN_URL = 'https://www.patreon.com/cw/NAQP'

const page = (cursor) => 'https://www.patreon.com/api/posts?' + new URLSearchParams({
  'filter[campaign_id]': CAMPAIGN,
  'filter[is_draft]': 'false',
  sort: '-published_at',
  'json-api-version': '1.0',
  'fields[post]': 'title,published_at,post_type',
  'page[count]': '50',
  ...(cursor ? { 'page[cursor]': cursor } : {}),
})

console.log(`Patreon: campagna ${CAMPAIGN}`)
const posts = []
let cursor = null
for (let i = 0; i < 30; i++) {
  const data = await getJSON(page(cursor), {
    headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Chrome/131.0' },
  })
  posts.push(...(data.data ?? []))
  const pag = data.meta?.pagination
  console.log(`  pagina ${i + 1}: ${posts.length}/${pag?.total ?? '?'}`)
  cursor = pag?.cursors?.next
  if (!cursor || !data.data?.length) break
  await sleep(400)
}

/** I 515 post non sono tutti episodi: ci sono backstage, live, sondaggi, foto. */
function classify(title, postType) {
  const t = title.toLowerCase()
  if (t.includes('(patreon exclusive)')) return 'esclusivo'
  if (t.includes('(ad-free)')) return 'ad-free'    // doppione di un episodio pubblico
  if (t.startsWith('backstage')) return 'backstage'
  if (t.includes('naqp live') || postType === 'livestream_youtube') return 'live'
  if (postType === 'video_external_file') return 'video'
  if (postType === 'podcast') return 'episodio'
  return 'altro'
}

const items = posts.map((p) => {
  const a = p.attributes
  const title = a.title ?? ''
  const tier = classify(title, a.post_type)
  const clean = title
    .replace(/\((Patreon Exclusive|Ad-Free|Video|Audio)\)/gi, '')
    .replace(/^\s*S\d+\s*E?\d*\s*/i, '')
    .replace(/\s+/g, ' ').trim()
  return {
    id: `patreon:${p.id}`,
    track: 'naqp',
    title: clean || title,
    rawTitle: title,
    season: Number(title.match(/S(\d+)/i)?.[1]) || null,
    episode: Number(title.match(/E(\d+)/i)?.[1]) || null,
    tier,
    postType: a.post_type,
    isSpecial: /special|speciale/i.test(title),
    summary: null,       // il contenuto è dietro il paywall: verificato, torna null
    year: null,          // le description sono a pagamento: si datano a mano
    precision: null,
    confidence: null,
    publishedAt: (a.published_at ?? '').slice(0, 10) || null,
    source: { kind: 'patreon', url: CAMPAIGN_URL },
  }
})

const byTier = items.reduce((acc, i) => ({ ...acc, [i.tier]: (acc[i.tier] ?? 0) + 1 }), {})
console.log(`  ${items.length} post:`, byTier)
await writeJSON('data/generated/naqp-patreon.json', items)
