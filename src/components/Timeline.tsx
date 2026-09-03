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

function GapRow({ row }: { row: Extract<Row, { kind: 'gap' }> }) {
  return (
    <div className="relative flex items-center gap-3 py-3 pl-[4.5rem] text-[11px] text-bone-dim">
      <span className="absolute left-[3.4rem] h-full w-px border-l border-dashed border-bone/20" />
      <span className="border border-bone/15 bg-ink px-2 py-0.5 font-mono">
        {row.years === 1 ? '1 anno vuoto' : `${row.years.toLocaleString('it')} anni senza niente`}
      </span>
    </div>
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
    <section
      data-vul={vul}
      className={`relative scroll-mt-28 py-2 transition-colors duration-500 ${
        isZero ? 'bg-acid/[0.06]' : ''} ${
        highlighted ? 'rounded-sm ring-1 ring-acid/60' : ''}`}
    >
      <div className="flex gap-3">
        <div className="relative w-14 shrink-0 text-right">
          <div
            className={`display text-[26px] tabular-nums ${
              isZero ? 'text-acid' : isJubilee ? 'text-cyan' : 'text-bone'}`}
          >
            {isZero ? '0' : Math.abs(vul)}
          </div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-bone-dim">
            {isZero ? 'anno zero' : vul > 0 ? 'dVUL' : 'aVUL'}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-bone-dim/70">
            {formatCanonical(canonical)}
          </div>
          {isJubilee && (
            <div className="mt-1 text-[9px] uppercase leading-tight text-cyan">giubileo</div>
          )}
        </div>

        <div className="relative w-3 shrink-0">
          <div className="tape-spine absolute left-1/2 h-full w-[3px] -translate-x-1/2" />
          <div
            className={`absolute left-1/2 top-3 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border ${
              isZero ? 'border-acid bg-acid' : 'border-bone/50 bg-ink'}`}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-1.5 pb-1">
          {events === undefined
            ? Array.from({ length: Math.min(totalExpected, 2) }, (_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-sm bg-ink-2/60" />
              ))
            : visible.map((e) => <EventCard key={e.id} event={e} credits={credits} />)}

          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="w-full rounded-sm border border-bone/15 py-1.5 text-[11px] text-bone-dim
                hover:border-acid/40 hover:text-acid"
            >
              altri {hidden} in {formatVul(vul)}
            </button>
          )}
          {expanded && shown.length > VISIBLE_PER_YEAR && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-[11px] text-bone-dim underline decoration-dotted"
            >
              richiudi
            </button>
          )}
        </div>
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

  /** Anni che hanno davvero una riga, con le tracce attive. */
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
    // un frame per far dipingere gli eventi appena arrivati
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

  // l'anello di atterraggio non deve restare acceso per sempre
  useEffect(() => {
    if (landedVul === null) return
    const id = window.setTimeout(() => setLandedVul(null), 2200)
    return () => window.clearTimeout(id)
  }, [landedVul])

  return (
    <div ref={containerRef} className="px-3 pb-28">
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
        <p className="py-16 text-center text-sm text-bone-dim">
          Nessuna traccia selezionata. Riaccendine una qui sopra.
        </p>
      )}
    </div>
  )
}
