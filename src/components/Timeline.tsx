import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type ImageCredit, type Row, type Track, type VulEvent, type VulIndex,
  buildRows, chunkOf, nearestPopulatedYear,
} from '../lib/data'
import { holdCentered } from '../lib/scroll'
import { cycleOf, formatCanonical, formatVul, fromVul } from '../lib/vul'
import { EventCard } from './EventCard'
import { TRACK_ORDER } from './tracks'

const VISIBLE_PER_YEAR = 4

/** Richiesta di messa a fuoco. Il nonce serve a rifare lo scroll anche quando
 *  si richiede due volte lo stesso anno. */
export interface FocusRequest {
  vul: number
  nonce: number
  smooth: boolean
}

/** Nessun foglio è appuntato perfettamente diritto, ma la stessa riga deve
 *  pendere sempre allo stesso modo: l'inclinazione si deriva dall'anno. */
const TILT = [-0.5, 0.55, -0.85, 0.35]
const tiltOf = (vul: number) => TILT[Math.abs(vul) % TILT.length]!

function GapRow({ row }: { row: Extract<Row, { kind: 'gap' }> }) {
  return (
    <p className="ml-[66px] mb-5 text-[12.5px] italic text-paper/45 max-[400px]:ml-[48px]">
      ({row.years === 1 ? 'un anno senza prove' : `${row.years.toLocaleString('it')} anni senza prove`})
    </p>
  )
}

function YearRow({ row, events, credits, tracks, highlighted }: {
  row: Extract<Row, { kind: 'year' }>
  events: VulEvent[] | undefined
  credits: Record<string, ImageCredit> | null
  tracks: Set<Track>
  highlighted: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const { vul } = row
  const canonical = fromVul(vul)
  const { isJubilee } = cycleOf(vul)
  const isZero = vul === 0

  const shown = events?.filter((e) => tracks.has(e.track)) ?? []
  const visible = expanded ? shown : shown.slice(0, VISIBLE_PER_YEAR)
  const hidden = shown.length - visible.length
  const totalExpected = TRACK_ORDER
    .filter((t) => tracks.has(t))
    .reduce((n, t) => n + row.counts[t], 0)

  return (
    <section data-vul={vul} className="relative mb-6 scroll-mt-28">
      {/* la puntina che tiene il foglio */}
      <span
        aria-hidden
        className={`absolute left-[38px] top-3.5 z-20 h-3.5 w-3.5 rounded-full
          shadow-[0_2px_4px_rgba(0,0,0,.6),inset_-2px_-2px_3px_rgba(0,0,0,.3)]
          max-[400px]:left-[20px] ${isJubilee ? 'bg-marker' : 'bg-red'}`}
      />

      <div
        style={{ transform: `rotate(${isZero ? 0.9 : tiltOf(vul)}deg)` }}
        className={`sheet ml-[66px] px-3.5 pt-3 pb-3.5 max-[400px]:ml-[48px]
          ${isZero ? 'bg-paper-2 shadow-[0_0_0_3px_var(--color-red),5px_6px_14px_rgba(0,0,0,.55)]' : ''}
          ${highlighted && !isZero ? 'shadow-[0_0_0_3px_var(--color-marker),3px_4px_10px_rgba(0,0,0,.45)]' : ''}`}
      >
        <div className="mb-2 flex items-baseline gap-2 border-b-2 border-ink pb-1.5">
          <span className={`hand text-red ${isZero ? 'text-[44px]' : 'text-[29px]'}`}>
            {isZero ? '0' : Math.abs(vul)}
          </span>
          <span className="text-[12px] text-ink-soft">
            {isZero ? 'anno zero' : vul > 0 ? 'dVUL' : 'aVUL'}
          </span>
          {isJubilee && <span className="text-[11px] text-ink-soft">giubileo</span>}
          <span className="ml-auto text-[12.5px] text-ink-soft">
            {formatCanonical(canonical)}
          </span>
        </div>

        {isZero && (
          <p className="hand mb-2 inline-block -rotate-[1.4deg] text-[17px] text-red">
            qui comincia tutto
          </p>
        )}

        {events === undefined
          ? Array.from({ length: Math.min(totalExpected, 2) }, (_, i) => (
              <div key={i} className="my-2 h-12 animate-pulse bg-paper-edge/40" />
            ))
          : visible.map((e) => <EventCard key={e.id} event={e} credits={credits} />)}

        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mt-2.5 w-full border border-dashed border-ink-soft py-1.5 text-[12.5px]
              text-ink-soft hover:border-red hover:text-red-deep"
          >
            altre {hidden} prove in {formatVul(vul)}
          </button>
        )}
        {expanded && shown.length > VISIBLE_PER_YEAR && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="mt-2 text-[12.5px] text-ink-soft underline decoration-dotted"
          >
            richiudi
          </button>
        )}
      </div>
    </section>
  )
}

export function Timeline({ index, tracks, credits, focus, byVul, ensureChunk, onLanded }: {
  index: VulIndex
  tracks: Set<Track>
  credits: Record<string, ImageCredit> | null
  focus: FocusRequest | null
  byVul: Map<number, VulEvent[]>
  ensureChunk: (bucket: number) => Promise<void>
  onLanded?: (vul: number, exact: boolean) => void
}) {
  const rows = useMemo(() => buildRows(index, tracks), [index, tracks])
  const containerRef = useRef<HTMLDivElement>(null)
  const [landedVul, setLandedVul] = useState<number | null>(null)

  const yearsWithRows = useMemo(
    () => rows.filter((r): r is Extract<Row, { kind: 'year' }> => r.kind === 'year')
      .map((r) => r.vul),
    [rows],
  )

  // carica i decenni che entrano in viewport, con margine generoso
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const vul = Number((entry.target as HTMLElement).dataset.vul)
          void ensureChunk(chunkOf(vul, index.chunkSize))
        }
      },
      { rootMargin: '600px 0px' },
    )
    for (const node of el.querySelectorAll('[data-vul]')) io.observe(node)
    return () => io.disconnect()
  }, [rows, ensureChunk, index.chunkSize])

  const goTo = useCallback(async (vul: number, smooth: boolean) => {
    if (!yearsWithRows.length) return

    /* Un anno può non avere nessun evento — la gran parte non ne ha — e quindi
       nessuna riga da raggiungere. In quel caso si atterra sull'anno popolato
       più vicino invece di non muoversi affatto. */
    const nearest = nearestPopulatedYear(yearsWithRows, vul)
    if (nearest === null) return
    const exact = nearest === vul

    await ensureChunk(chunkOf(nearest, index.chunkSize))
    await new Promise((r) => requestAnimationFrame(() => r(null)))

    const target = containerRef.current
      ?.querySelector<HTMLElement>(`[data-vul="${nearest}"]`)
    if (!target) return

    setLandedVul(nearest)
    onLanded?.(nearest, exact)
    return holdCentered(target, { smooth })
  }, [yearsWithRows, ensureChunk, index.chunkSize, onLanded])

  /* Il nonce già servito si ricorda in un ref, non nelle dipendenze: così un
     semplice re-render non rifà lo scroll, e il ciclo di centratura viene
     annullato solo quando arriva una richiesta nuova o si smonta. */
  const handledNonce = useRef<number | null>(null)
  const holdRef = useRef<(() => void) | undefined>(undefined)

  useEffect(() => {
    if (!focus || handledNonce.current === focus.nonce) return
    handledNonce.current = focus.nonce
    holdRef.current?.()
    void goTo(focus.vul, focus.smooth).then((stop) => { holdRef.current = stop })
  }, [focus, goTo])

  useEffect(() => () => holdRef.current?.(), [])

  useEffect(() => {
    if (landedVul === null) return
    const id = window.setTimeout(() => setLandedVul(null), 2200)
    return () => window.clearTimeout(id)
  }, [landedVul])

  return (
    <div ref={containerRef} className="relative px-4 pb-32">
      {/* il filo rosso che collega gli anni: è la timeline */}
      {rows.length > 0 && (
        <span
          aria-hidden
          className="absolute left-[44px] top-6 bottom-16 w-0.5 bg-red/75 max-[400px]:left-[26px]"
        />
      )}
      {rows.map((row) =>
        row.kind === 'gap'
          ? <GapRow key={`gap-${row.fromVul}`} row={row} />
          : (
              <YearRow
                key={row.vul}
                row={row}
                events={byVul.get(row.vul)}
                credits={credits}
                tracks={tracks}
                highlighted={landedVul === row.vul}
              />
            ))}
      {!rows.length && (
        <p className="py-16 text-center text-sm text-paper/60">
          Nessuna traccia selezionata. Riappuntane una qui sopra.
        </p>
      )}
    </div>
  )
}
