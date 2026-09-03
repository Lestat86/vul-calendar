/**
 * Traccia "naqp", feed pubblico: https://feeds.megaphone.fm/naqp
 *
 * Il feed è una finestra scorrevole (147 episodi su ~209 pubblicati), quindi
 * l'output va committato: è uno snapshot, non una fonte rigiocabile. Gli
 * episodi che escono dalla finestra sopravvivono solo qui.
 *
 * Della description teniamo l'anno e l'incipit narrativo (quello che finisce
 * in card). Indice dei capitoli, ringraziamenti ai patron e boilerplate
 * pubblicitario vengono buttati: vedi episodeSummary.
 */
import { episodeSummary, extractYear, getText, stripDescription, writeJSON } from './lib.mjs'

const FEED = 'https://feeds.megaphone.fm/naqp'

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
  if (!m) return ''
  return m[1].replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim()
}

console.log(`NAQP pubblico: ${FEED}`)
const xml = await getText(FEED)
const items = xml.split(/<item[\s>]/).slice(1).map((s) => '<item ' + s.split('</item>')[0])
console.log(`  ${items.length} episodi nel feed`)

const episodes = items.map((it) => {
  const title = tag(it, 'title')
  const guid = tag(it, 'guid') || title
  const published = tag(it, 'pubDate')
  const description = tag(it, 'description')
  const found = extractYear(stripDescription(description))
  const season = Number(title.match(/S(\d+)/i)?.[1]) || null
  const episode = Number(title.match(/E(\d+)/i)?.[1]) || null
  return {
    id: `naqp:${guid}`,
    track: 'naqp',
    title: title.replace(/^S\d+\s*E?\d*\s*[-–]?\s*/i, '').trim() || title,
    rawTitle: title,
    season,
    episode,
    tier: 'pubblico',
    isSpecial: /special|speciale/i.test(title),
    summary: episodeSummary(description),
    year: found?.year ?? null,
    precision: found?.precision ?? null,
    confidence: found ? 'auto' : null,
    publishedAt: published ? new Date(published).toISOString().slice(0, 10) : null,
    source: { kind: 'rss', url: tag(it, 'link') || FEED },
  }
})

const dated = episodes.filter((e) => e.year)
console.log(`  anno estratto: ${dated.length}/${episodes.length}`)
console.log(`  con incipit  : ${episodes.filter((e) => e.summary).length}/${episodes.length}`)
console.log(`  da datare    : ${episodes.length - dated.length} (di cui ${
  episodes.filter((e) => !e.year && e.isSpecial).length} speciali)`)
await writeJSON('data/generated/naqp-public.json', episodes)
