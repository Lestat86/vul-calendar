/**
 * Non c'è un browser in questo ambiente, quindi il rendering si verifica
 * server-side: non copre il layout, ma prende ogni crash a runtime nei
 * componenti (props sbagliate, accessi su undefined, hook fuori posto).
 */
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { CalendarPanel } from './components/CalendarPanel'
import { Converter } from './components/Converter'
import { EventCard } from './components/EventCard'
import { Timeline } from './components/Timeline'
import { ZeroFab } from './components/ZeroFab'
import type { VulEvent, VulIndex } from './lib/data'

const index: VulIndex = {
  epoch: 1994, cycle: 31, generatedAt: '2026-09-02',
  tracks: ['storia', 'lurido', 'naqp'], chunkSize: 10,
  range: { minVul: -2746, maxVul: 32 },
  totals: { storia: 2346, lurido: 39, naqp: 134 },
  density: [[-2746, 1, 0, 0], [-1, 3, 1, 0], [0, 2, 3, 1], [31, 0, 1, 0]],
  chunks: [-275, -1, 0, 3],
  undatedNaqp: 143,
}

/** React separa i nodi di testo con <!-- --> in SSR: per le asserzioni è rumore. */
const render = (node: Parameters<typeof renderToString>[0]) =>
  renderToString(node).replaceAll('<!-- -->', '').replaceAll('&#x27;', "'")

const event = (over: Partial<VulEvent> = {}): VulEvent => ({
  id: 'wd:Q1', track: 'storia', title: 'Disastro di Cernobyl',
  year: 1986, vul: -8, weight: 125, rank: 0,
  image: 'Chernobyl.jpg', kind: 'disastro',
  summary: 'Reattore 4.', ...over,
})

describe('rendering', () => {
  it('la app si monta senza dati caricati', () => {
    expect(render(<App />)).toContain('VUL')
  })

  it('la timeline disegna anni, salti e Anno Zero', () => {
    const html = render(
      <Timeline index={index} tracks={new Set(['storia', 'lurido', 'naqp'])}
        credits={null} focus={null} byVul={new Map()} ensureChunk={async () => {}} />,
    )
    expect(html).toContain('anno zero')
    expect(html).toContain('anni senza prove') // i vuoti sono compressi
    expect(html).toContain('giubileo')          // il 2025 è 31 dVUL
  })

  it('la timeline senza tracce attive lo dice invece di sparire', () => {
    const html = render(
      <Timeline index={index} tracks={new Set()} credits={null} focus={null}
        byVul={new Map()} ensureChunk={async () => {}} />,
    )
    expect(html).toContain('Nessuna traccia selezionata')
  })

  it('la card regge evento minimo, immagine e crediti mancanti', () => {
    expect(render(<EventCard event={event()} credits={null} />)).toContain('Cernobyl')
    const bare = event({ image: undefined, summary: undefined, kind: undefined })
    expect(render(<EventCard event={bare} credits={null} />)).toContain('1986')
  })

  it('la card NAQP mostra l\'incipit dell\'episodio', () => {
    const ep = event({
      id: 'naqp:1', track: 'naqp', title: 'Il Caso Dana Sue Gray',
      year: 1994, vul: 0, season: 14, episode: 7, tier: 'pubblico',
      image: undefined,
      summary: 'Siamo nella Contea di Riverside, California, nel 1994.',
    })
    const html = render(<EventCard event={ep} credits={null} />)
    expect(html).toContain('S14E7')
    expect(html).toContain('Contea di Riverside')
    expect(html).not.toContain('non ha una descrizione')
  })

  it('senza incipit la card NAQP lo dichiara invece di restare muta', () => {
    const ep = event({
      id: 'naqp:2', track: 'naqp', title: 'Il Caso Landru',
      year: 1915, vul: -79, tier: 'esclusivo', image: undefined, summary: undefined,
    })
    const html = render(<EventCard event={ep} credits={null} />)
    expect(html).toContain('esclusivo')
    expect(html).toContain('non ha una descrizione')
  })

  it('il timbro per l\'Anno Zero c\'è, etichettato e con la freccia disegnata', () => {
    const html = render(<ZeroFab onJump={() => {}} />)
    expect(html).toContain("Torna all'Anno Zero, 1994")
    expect(html).toContain('Voglio Una Lurida') // il click fa partire lo spezzone
    expect(html).toContain('ANNO ZERO')
    // la freccia è un tracciato, non un carattere tipografico
    expect(html).toContain('<svg')
    expect(html).not.toContain('↑')
    expect(html).not.toContain('↓')
  })

  it('convertitore e calendari si montano', () => {
    expect(render(<Converter onGoTo={() => {}} />)).toContain("Da un calendario all'altro")
    expect(render(<CalendarPanel />)).toContain('Ebraico')
  })

  it('le tracce si annotano sul foglio, non con un pallino colorato', () => {
    const lurido = render(<EventCard event={event({ track: 'lurido', image: undefined })} credits={null} />)
    expect(lurido).toContain('highlighted') // passato a evidenziatore
    const naqp = render(<EventCard
      event={event({ track: 'naqp', title: 'Il Caso X', image: 'X.jpg', summary: undefined })}
      credits={null} />)
    expect(naqp).toContain('circled')       // foto cerchiata a pennarello
    expect(naqp).toContain('halftone')      // fotocopia retinata
  })

  it('i filtri sono etichette appuntate: la puntina c\'è solo se attiva', () => {
    const html = render(<App />)
    // tre etichette, tutte appuntate all'avvio
    expect(html.match(/aria-pressed="true"/g)?.length).toBeGreaterThanOrEqual(3)
    expect(html).toContain('sulla bacheca:')
    expect(html).toContain('tape')          // la barra sticky è nastro adesivo
  })
})
