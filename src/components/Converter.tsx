import { useMemo, useState } from 'react'
import { type Era, VUL_EPOCH, cycleOf, formatVul, fromVul, toVul } from '../lib/vul'

type Direction = 'toVul' | 'fromVul'

type Result =
  | { ok: true; vul: number; canonical: { year: number; era: Era } }
  | { ok: false; error: string }

/** Convertitore bidirezionale. Tollera input a metà: non urla mentre scrivi. */
export function Converter({ onGoTo }: { onGoTo: (vul: number) => void }) {
  const [direction, setDirection] = useState<Direction>('toVul')
  const [raw, setRaw] = useState('2026')
  const [era, setEra] = useState<Era>('dc')

  const result = useMemo<Result | null>(() => {
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n)) return null
    try {
      if (direction === 'toVul') {
        if (n < 1) {
          return { ok: false, error: "L'anno canonico parte da 1: non esiste l'anno 0 a.C./d.C." }
        }
        return { ok: true, vul: toVul({ year: n, era }), canonical: { year: n, era } }
      }
      return { ok: true, vul: n, canonical: fromVul(n) }
    } catch {
      return { ok: false, error: 'Anno non valido.' }
    }
  }, [raw, era, direction])

  const cycle = result?.ok ? cycleOf(result.vul) : null

  return (
    <div className="rounded-sm border border-bone/15 bg-ink-2/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="display text-lg text-bone">Convertitore</h2>
        <button
          type="button"
          onClick={() => setDirection((d) => (d === 'toVul' ? 'fromVul' : 'toVul'))}
          className="rounded-sm border border-bone/25 px-2 py-1 text-[11px] uppercase tracking-wide
            text-bone-dim hover:border-acid/50 hover:text-acid"
        >
          {direction === 'toVul' ? 'canonico → VUL' : 'VUL → canonico'} ⇄
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={raw}
          onChange={(e) => setRaw(e.target.value.replace(/[^\d-]/g, ''))}
          aria-label={direction === 'toVul' ? 'Anno canonico' : 'Anno VUL'}
          className="w-28 rounded-sm border border-bone/25 bg-ink px-2.5 py-2 font-mono text-lg
            text-bone outline-none focus:border-acid"
        />

        {direction === 'toVul'
          ? (
              <div className="flex overflow-hidden rounded-sm border border-bone/25">
                {(['ac', 'dc'] as const).map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEra(e)}
                    className={`px-3 py-2 text-sm ${
                      era === e ? 'bg-bone text-ink' : 'text-bone-dim hover:text-bone'}`}
                  >
                    {e === 'ac' ? 'a.C.' : 'd.C.'}
                  </button>
                ))}
              </div>
            )
          : (
              <span className="text-[11px] text-bone-dim">
                negativo = aVUL, positivo = dVUL
              </span>
            )}
      </div>

      <div className="mt-4 border-t border-bone/10 pt-3">
        {!result && <p className="text-sm text-bone-dim">Scrivi un anno.</p>}
        {result && !result.ok && (
          <p className="text-sm text-magenta">{result.error}</p>
        )}
        {result?.ok && (
          <>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="display text-3xl text-acid">{formatVul(result.vul)}</span>
              <span className="font-mono text-sm text-bone-dim">
                = {result.canonical.year} {result.canonical.era === 'dc' ? 'd.C.' : 'a.C.'}
              </span>
            </div>

            {cycle && (
              <p className="mt-2 text-[12px] text-bone-dim">
                Ciclo {cycle.cycle} di Articolo 31, anno {cycle.offset} su 31
                {cycle.isJubilee && <span className="text-cyan"> · giubileo VUL</span>}
              </p>
            )}

            <button
              type="button"
              onClick={() => onGoTo(result.vul)}
              className="mt-3 rounded-sm bg-acid px-3 py-1.5 text-[12px] font-bold uppercase
                tracking-wide text-ink hover:bg-bone"
            >
              vai in timeline
            </button>
          </>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-bone-dim">
        L'era VUL <strong className="text-bone">ha</strong> un anno zero, il {VUL_EPOCH}, perché
        l'anno zero è l'evento. Il calendario canonico salta da 1 a.C. a 1 d.C., quindi la nascita
        di Cristo cade nel {formatVul(toVul({ year: 1, era: 'dc' }))}.
      </p>
    </div>
  )
}
