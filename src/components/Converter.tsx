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
          return { ok: false, error: "L'anno canonico parte da 1: non esiste l'anno 0." }
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
    <div className="sheet -rotate-[0.4deg] px-4 pt-4 pb-5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="hand text-[21px] text-ink">Da un calendario all'altro</h2>
        <button
          type="button"
          onClick={() => setDirection((d) => (d === 'toVul' ? 'fromVul' : 'toVul'))}
          className="shrink-0 border border-ink px-2 py-1 text-[11.5px] text-ink-soft
            hover:bg-ink hover:text-paper"
        >
          {direction === 'toVul' ? 'canonico in VUL' : 'VUL in canonico'}
        </button>
      </div>

      <p className="mb-4 max-w-[46ch] text-[13px] text-ink-soft">
        L'era VUL ha un anno zero, il {VUL_EPOCH}, perché l'anno zero è l'evento.
        Il calendario canonico salta da 1 a.C. a 1 d.C., quindi la nascita di Cristo
        cade nel {formatVul(toVul({ year: 1, era: 'dc' }))}.
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label htmlFor="conv-year" className="text-[12.5px] text-ink-soft">
          {direction === 'toVul' ? 'anno canonico' : 'anno VUL'}
        </label>
        <input
          id="conv-year"
          type="text"
          inputMode="numeric"
          value={raw}
          onChange={(e) => setRaw(e.target.value.replace(/[^\d-]/g, ''))}
          className="w-[110px] border-0 border-b-2 border-ink bg-[#fffdf5] px-2 py-1.5
            text-[21px] text-ink outline-none focus:bg-marker"
        />
        {direction === 'toVul'
          ? (
              <span className="flex border border-ink">
                {(['ac', 'dc'] as const).map((e) => (
                  <button
                    key={e}
                    type="button"
                    aria-pressed={era === e}
                    onClick={() => setEra(e)}
                    className={`px-2.5 py-1.5 text-[13px] ${
                      era === e ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'}`}
                  >
                    {e === 'ac' ? 'a.C.' : 'd.C.'}
                  </button>
                ))}
              </span>
            )
          : (
              <span className="text-[12px] text-ink-soft">
                negativo per aVUL, positivo per dVUL
              </span>
            )}
      </div>

      {!result && <p className="text-[13px] text-ink-soft">Scrivi un anno.</p>}
      {result && !result.ok && <p className="text-[13px] text-red-deep">{result.error}</p>}

      {result?.ok && (
        <>
          {/* il risultato è l'impronta di un timbro, non una casella di output */}
          <p className="hand inline-block -rotate-[2.2deg] rounded-[6px_10px_7px_9px]
            border-[3px] border-red px-4 py-2.5 text-[27px] leading-none text-red opacity-95">
            {formatVul(result.vul)}
            <span className="mt-1.5 block text-[11.5px] leading-tight text-red-deep">
              {result.canonical.year} {result.canonical.era === 'dc' ? 'd.C.' : 'a.C.'}
              {cycle && (
                <> &mdash; ciclo {cycle.cycle}, anno {cycle.offset} su 31
                  {cycle.isJubilee && ' — giubileo'}</>
              )}
            </span>
          </p>

          <div>
            <button
              type="button"
              onClick={() => onGoTo(result.vul)}
              className="mt-4 border-2 border-ink bg-ink px-3 py-1.5 text-[13px] text-paper
                hover:bg-red hover:border-red"
            >
              cerca quest'anno sulla bacheca
            </button>
          </div>
        </>
      )}
    </div>
  )
}
