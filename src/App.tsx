import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  type ImageCredit, type Track, type VulIndex, loadCredits, loadIndex,
} from './lib/data'
import { VUL_EPOCH, cycleOf, formatVul, vulFromAD } from './lib/vul'
import { useVulEvents } from './lib/useVulEvents'
import { type FocusRequest, Timeline } from './components/Timeline'
import { ZeroFab } from './components/ZeroFab'
import { Converter } from './components/Converter'
import { CalendarPanel } from './components/CalendarPanel'
import { TRACK_META, TRACK_ORDER } from './components/tracks'

type Tab = 'timeline' | 'converter' | 'calendars'

const TABS: { id: Tab; label: string }[] = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'converter', label: 'Convertitore' },
  { id: 'calendars', label: 'Calendari' },
]

export function App() {
  const [index, setIndex] = useState<VulIndex | null>(null)
  const [credits, setCredits] = useState<Record<string, ImageCredit> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('timeline')
  const [tracks, setTracks] = useState<Set<Track>>(new Set(TRACK_ORDER))
  /* All'apertura si atterra sull'Anno Zero: è il senso dell'app, non un
     dettaglio. Senza smooth, perché al primo paint non c'è niente da animare. */
  const [focus, setFocus] = useState<FocusRequest | null>({ vul: 0, nonce: 0, smooth: false })
  const { byVul, ensureChunk } = useVulEvents()
  const scrollMemo = useRef(0)
  /* Al primo mount posiziona il focus iniziale sull'Anno Zero: il ripristino
     dello scroll non deve intromettersi. */
  const skipRestore = useRef(true)

  useEffect(() => {
    loadIndex().then(setIndex).catch((e: Error) => setError(e.message))
    // i crediti servono solo quando si apre una foto: nessuna fretta
    const id = window.requestIdleCallback(
      () => void loadCredits().then(setCredits).catch(() => {}),
    )
    return () => window.cancelIdleCallback(id)
  }, [])

  const today = useMemo(() => {
    const vul = vulFromAD(new Date().getUTCFullYear())
    return { vul, cycle: cycleOf(vul) }
  }, [])

  const toggle = (t: Track) => setTracks((prev) => {
    const next = new Set(prev)
    if (next.has(t)) next.delete(t)
    else next.add(t)
    return next
  })

  /* Il nonce fa ripartire lo scroll anche quando si chiede due volte lo stesso
     anno: senza, il secondo clic sarebbe un no-op. */
  const goTo = (vul: number, smooth = true) => {
    skipRestore.current = true
    setTab('timeline')
    setFocus((prev) => ({ vul, nonce: (prev?.nonce ?? 0) + 1, smooth }))
  }

  /* La Timeline resta montata anche fuori dalla sua tab: smontarla azzerava
     gli eventi caricati e la posizione. Nasconderla però fa collassare
     l'altezza della pagina, e il browser tronca lo scroll: quindi va salvato
     e ripristinato a mano. */
  const changeTab = (next: Tab) => {
    if (tab === 'timeline' && next !== 'timeline') scrollMemo.current = window.scrollY
    setTab(next)
  }

  useLayoutEffect(() => {
    if (tab !== 'timeline') return
    if (skipRestore.current) { skipRestore.current = false; return }
    window.scrollTo(0, scrollMemo.current)
  }, [tab])

  return (
    <div className="mx-auto min-h-dvh max-w-2xl">
      <header className="sticky top-0 z-20 border-b border-bone/15 bg-ink/95 backdrop-blur-sm">
        <div className="flex items-end justify-between gap-3 px-3 pt-3 pb-2">
          <div>
            <h1 className="display text-[27px] leading-none text-bone">
              VUL<span className="text-acid">·</span>CALENDAR
            </h1>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-bone-dim">
              anno zero: {VUL_EPOCH}
            </p>
          </div>
          <div className="text-right">
            <div className="display text-2xl leading-none text-acid">{formatVul(today.vul)}</div>
            <div className="text-[10px] uppercase tracking-wider text-bone-dim">
              siamo qui{today.cycle.isJubilee && ' · giubileo'}
            </div>
          </div>
        </div>

        <nav className="flex gap-px px-3 pb-2" aria-label="Sezioni">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => changeTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex-1 border px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide ${
                tab === t.id
                  ? 'border-acid bg-acid text-ink'
                  : 'border-bone/20 text-bone-dim hover:border-bone/40 hover:text-bone'}`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'timeline' && (
          <div className="flex flex-wrap gap-1.5 px-3 pb-2.5">
            {TRACK_ORDER.map((t) => {
              const meta = TRACK_META[t]
              const on = tracks.has(t)
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggle(t)}
                  aria-pressed={on}
                  title={meta.blurb}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1
                    text-[11px] font-bold uppercase tracking-wide transition
                    ${on ? meta.chipOn : meta.chipOff}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-ink' : meta.dot}`} />
                  {meta.label}
                  {index && <span className="font-mono opacity-70">{index.totals[t]}</span>}
                </button>
              )
            })}
          </div>
        )}
      </header>

      <main>
        {error && (
          <p className="m-3 rounded-sm border border-magenta/40 bg-magenta/10 p-3 text-sm text-magenta">
            Dati non caricati: {error}. Hai lanciato <code>npm run etl</code>?
          </p>
        )}

        {!index && !error && tab === 'timeline' && (
          <p className="p-6 text-sm text-bone-dim">Riavvolgo il nastro…</p>
        )}
        {index && (
          <div hidden={tab !== 'timeline'}>
            <Timeline
              index={index}
              tracks={tracks}
              credits={credits}
              focus={focus}
              byVul={byVul}
              ensureChunk={ensureChunk}
            />
          </div>
        )}

        {tab === 'converter' && (
          <div className="space-y-3 p-3">
            <Converter onGoTo={goTo} />
            <QuickJumps onGoTo={goTo} />
          </div>
        )}

        {tab === 'calendars' && <div className="p-3"><CalendarPanel /></div>}
      </main>

      {tab === 'timeline' && index && <ZeroFab onJump={() => goTo(0)} />}

      <footer className="border-t border-bone/10 px-3 py-5 text-[10px] leading-relaxed text-bone-dim">
        <p>
          L'Anno Zero è il {VUL_EPOCH}, uscita di <em>Voglio Una Lurida</em> degli Articolo 31.
          Eventi storici da Wikidata e curati a mano, immagini da Wikimedia Commons con licenza
          indicata sulla foto. La traccia NAQP indicizza <em>Non Aprite Quella Podcast</em>
          {' '}sull'anno del caso raccontato: titoli e link, nessun contenuto.
        </p>
        {index && (
          <p className="mt-2 font-mono">
            {index.totals.storia + index.totals.lurido + index.totals.naqp} eventi ·
            dati del {index.generatedAt}
            {index.undatedNaqp > 0 && ` · ${index.undatedNaqp} episodi NAQP ancora da datare`}
          </p>
        )}
      </footer>
    </div>
  )
}

/** Scorciatoie: fanno capire l'aritmetica VUL più di qualunque spiegazione. */
function QuickJumps({ onGoTo }: { onGoTo: (vul: number) => void }) {
  const jumps = [
    { label: 'Anno Zero', ad: 1994 },
    { label: 'Caduta di Roma', ad: 476 },
    { label: 'Colombo', ad: 1492 },
    { label: 'Cernobyl', ad: 1986 },
    { label: 'Primo Giubileo', ad: 2025 },
    { label: 'Oggi', ad: new Date().getUTCFullYear() },
  ]
  return (
    <div className="rounded-sm border border-bone/15 bg-ink-2/60 p-4">
      <h2 className="display mb-2 text-lg text-bone">Salti rapidi</h2>
      <div className="flex flex-wrap gap-1.5">
        {jumps.map((j) => {
          const vul = vulFromAD(j.ad)
          return (
            <button
              key={j.label}
              type="button"
              onClick={() => onGoTo(vul)}
              className="rounded-sm border border-bone/20 px-2 py-1 text-left text-[11px]
                text-bone-dim hover:border-acid/50 hover:text-acid"
            >
              <span className="block text-bone">{j.label}</span>
              <span className="font-mono">{formatVul(vul)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
