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
import { CHIP_OFF, TRACK_META, TRACK_ORDER } from './components/tracks'

type Tab = 'timeline' | 'converter' | 'calendars'

const TABS: { id: Tab; label: string }[] = [
  { id: 'timeline', label: 'Bacheca' },
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

  const onBoard = tab === 'timeline'

  return (
    <div className="mx-auto min-h-dvh max-w-[640px]">
      <header className="px-4 pt-8">
        <h1 className="hand -rotate-[1.5deg] text-[clamp(30px,9vw,46px)] text-paper">
          VUL <span className="text-red">Calendar</span>
        </h1>
        <p className="mt-3 max-w-[42ch] text-[13.5px] text-paper/70">
          Tutta la storia riletta a partire dal {VUL_EPOCH}, l'anno in cui è uscita{' '}
          <i>Voglio Una Lurida</i>. Prove raccolte, foto cerchiate.
        </p>
        <p className="mt-3.5 inline-block -rotate-[0.8deg] bg-marker px-2 py-0.5 text-[13.5px] text-ink">
          oggi: {formatVul(today.vul)}{today.cycle.isJubilee && ' — giubileo'}
        </p>

        {/* linguette di cartelline: l'attiva sta davanti, le altre dietro */}
        <div role="tablist" aria-label="Sezioni" className="mt-5 flex gap-1 pl-0.5">
          {TABS.map((t) => {
            const on = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => changeTab(t.id)}
                className={`rounded-t-[3px] px-3.5 text-[13px] ${
                  on
                    ? 'bg-paper pt-2.5 pb-3.5 text-ink shadow-[0_-2px_6px_rgba(0,0,0,.28)]'
                    : 'translate-y-1 bg-paper-edge/85 pt-2.5 pb-3 text-ink-soft'
                      + ' shadow-[inset_0_-3px_6px_rgba(0,0,0,.18)] hover:bg-paper-edge'}`}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </header>

      {/* Nastro adesivo: i filtri devono restare a portata di mano mentre si
          scorre, e il nastro è l'unica cosa di questo mondo che sta appiccicata
          per natura. Fuori dalla bacheca non ha senso, quindi sparisce. */}
      {onBoard && (
        <div className="tape sticky top-0 z-40 mx-1.5 mb-5 mt-3 px-4 pt-2.5 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-0.5 text-[11.5px] text-ink-soft">sulla bacheca:</span>
            {TRACK_ORDER.map((t) => {
              const meta = TRACK_META[t]
              const on = tracks.has(t)
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  title={meta.blurb}
                  onClick={() => toggle(t)}
                  className={`relative text-[13px] leading-none ${
                    on
                      ? `${meta.chipOn} -rotate-[0.6deg] py-1.5 pr-2.5 pl-[18px]`
                        + ' shadow-[1.5px_2px_4px_rgba(0,0,0,.3)]'
                      : `${CHIP_OFF} -rotate-[3.2deg] translate-y-0.5 px-2.5 py-1.5 opacity-60`}`}
                >
                  {/* la puntina: c'è solo se l'etichetta è appuntata */}
                  {on && (
                    <span
                      aria-hidden
                      className="absolute left-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full
                        bg-red shadow-[0_1px_2px_rgba(0,0,0,.5),inset_-1px_-1px_2px_rgba(0,0,0,.35)]"
                    />
                  )}
                  {meta.label}
                  {index && <span className="ml-1.5 opacity-55">{index.totals[t]}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <main>
        {error && (
          <p className="sheet mx-4 my-3 border-l-4 border-red p-3 text-[13px] text-ink">
            Dati non caricati: {error}. Hai lanciato <code>npm run etl</code>?
          </p>
        )}

        {!index && !error && onBoard && (
          <p className="px-4 py-8 text-[13.5px] text-paper/60">Tiro giù i fogli dalla bacheca…</p>
        )}

        {index && (
          <div hidden={!onBoard}>
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
          <div className="space-y-4 px-4 pb-24">
            <Converter onGoTo={goTo} />
            <QuickJumps onGoTo={goTo} />
          </div>
        )}

        {tab === 'calendars' && <div className="px-4 pb-24"><CalendarPanel /></div>}
      </main>

      {onBoard && index && <ZeroFab onJump={() => goTo(0)} />}

      <footer className="px-4 pt-4 pb-8 text-[11.5px] leading-relaxed text-paper/50">
        <p className="max-w-[62ch]">
          L'Anno Zero è il {VUL_EPOCH}, uscita di <i>Voglio Una Lurida</i> degli Articolo 31.
          Eventi da Wikidata e curati a mano, immagini da Wikimedia Commons con licenza
          indicata sulla foto. La traccia NAQP indicizza <i>Non Aprite Quella Podcast</i>{' '}
          sull'anno del caso raccontato: titoli, incipit pubblico e link.
        </p>
        {index && (
          <p className="mt-2">
            {index.totals.storia + index.totals.lurido + index.totals.naqp} voci, dati del{' '}
            {index.generatedAt}
            {index.undatedNaqp > 0 && `, ${index.undatedNaqp} episodi NAQP non databili`}
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
    <div className="sheet rotate-[0.4deg] px-4 pt-4 pb-5">
      <h2 className="hand mb-3 text-[19px] text-ink">Salti rapidi</h2>
      <div className="flex flex-wrap gap-2">
        {jumps.map((j) => {
          const vul = vulFromAD(j.ad)
          return (
            <button
              key={j.label}
              type="button"
              onClick={() => onGoTo(vul)}
              className="border border-ink-soft px-2 py-1 text-left text-[12px] text-ink-soft
                hover:border-red hover:text-red-deep"
            >
              <span className="block text-[13px] text-ink">{j.label}</span>
              {formatVul(vul)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
