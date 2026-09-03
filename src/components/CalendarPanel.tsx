import { useMemo, useState } from 'react'
import type { Era } from '../lib/vul'
import { convertAll } from '../lib/calendars'

export function CalendarPanel() {
  const thisYear = new Date().getUTCFullYear()
  const [raw, setRaw] = useState(String(thisYear))
  const [era, setEra] = useState<Era>('dc')

  const rows = useMemo(() => {
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n) || n < 1) return null
    return convertAll({ year: n, era })
  }, [raw, era])

  return (
    <div className="rounded-sm border border-bone/15 bg-ink-2/60 p-4">
      <h2 className="display mb-1 text-lg text-bone">Lo stesso anno, altrove</h2>
      <p className="mb-3 text-[11px] text-bone-dim">
        Quattordici modi di numerare lo stesso giro del Sole.
      </p>

      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={raw}
          onChange={(e) => setRaw(e.target.value.replace(/\D/g, ''))}
          aria-label="Anno canonico"
          className="w-24 rounded-sm border border-bone/25 bg-ink px-2.5 py-1.5 font-mono
            text-bone outline-none focus:border-acid"
        />
        <div className="flex overflow-hidden rounded-sm border border-bone/25">
          {(['ac', 'dc'] as const).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEra(e)}
              className={`px-2.5 py-1.5 text-sm ${
                era === e ? 'bg-bone text-ink' : 'text-bone-dim hover:text-bone'}`}
            >
              {e === 'ac' ? 'a.C.' : 'd.C.'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { setRaw(String(thisYear)); setEra('dc') }}
          className="text-[11px] text-bone-dim underline decoration-dotted hover:text-acid"
        >
          oggi
        </button>
      </div>

      {!rows && <p className="mt-4 text-sm text-magenta">Serve un anno maggiore di zero.</p>}

      {rows && (
        <dl className="mt-4 divide-y divide-bone/10">
          {rows.map((r) => (
            <div key={r.id} className="flex items-baseline justify-between gap-3 py-2">
              <dt className="min-w-0">
                <span className={`text-[13px] ${r.id === 'vul' ? 'font-bold text-acid' : 'text-bone'}`}>
                  {r.name}
                </span>
                {r.note && (
                  <span className="block text-[10px] leading-tight text-bone-dim">{r.note}</span>
                )}
              </dt>
              <dd className={`shrink-0 font-mono text-[13px] ${
                r.outOfRange ? 'text-bone-dim/50' : r.id === 'vul' ? 'text-acid' : 'text-bone'}`}
              >
                {r.outOfRange ? 'non esisteva' : r.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-bone-dim">
        Prima del 1582 il gregoriano è prolettico e non coincide col giuliano: le conversioni
        antiche qui sono goliardiche, non filologiche. Le righe grigie sono anni in cui quel
        calendario non era ancora stato inventato.
      </p>
    </div>
  )
}
