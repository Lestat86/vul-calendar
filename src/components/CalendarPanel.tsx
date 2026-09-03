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
    <div className="sheet rotate-[0.5deg] px-4 pt-4 pb-5">
      <h2 className="hand mb-1 text-[21px] text-ink">Lo stesso anno, altrove</h2>
      <p className="mb-4 max-w-[46ch] text-[13px] text-ink-soft">
        Quattordici modi di numerare lo stesso giro del Sole.
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label htmlFor="cal-year" className="text-[12.5px] text-ink-soft">anno canonico</label>
        <input
          id="cal-year"
          type="text"
          inputMode="numeric"
          value={raw}
          onChange={(e) => setRaw(e.target.value.replace(/\D/g, ''))}
          className="w-[96px] border-0 border-b-2 border-ink bg-[#fffdf5] px-2 py-1
            text-[18px] text-ink outline-none focus:bg-marker"
        />
        <span className="flex border border-ink">
          {(['ac', 'dc'] as const).map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={era === e}
              onClick={() => setEra(e)}
              className={`px-2.5 py-1 text-[13px] ${
                era === e ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'}`}
            >
              {e === 'ac' ? 'a.C.' : 'd.C.'}
            </button>
          ))}
        </span>
        <button
          type="button"
          onClick={() => { setRaw(String(thisYear)); setEra('dc') }}
          className="text-[12px] text-ink-soft underline decoration-dotted hover:text-red-deep"
        >
          oggi
        </button>
      </div>

      {!rows && <p className="text-[13px] text-red-deep">Serve un anno maggiore di zero.</p>}

      {rows && (
        <table className="w-full border-collapse">
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                /* la riga VUL è passata a evidenziatore: sta alla pari con le
                   altre, ma è quella che stiamo guardando */
                className={`border-b border-dotted border-paper-edge ${
                  r.id === 'vul' ? 'bg-marker' : ''}`}
              >
                <td className="py-1.5 pr-2 align-top text-[13.5px] text-ink">
                  {r.name}
                  {r.note && (
                    <span className="block text-[11px] leading-tight text-ink-soft">{r.note}</span>
                  )}
                </td>
                <td className={`py-1.5 text-right align-top whitespace-nowrap text-[13.5px] ${
                  r.outOfRange ? 'text-ink-soft/60' : 'text-ink'}`}
                >
                  {r.outOfRange ? 'non esisteva' : r.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-4 max-w-[52ch] text-[12px] leading-relaxed text-ink-soft">
        Prima del 1582 il gregoriano è prolettico e non coincide col giuliano: le
        conversioni antiche qui sono goliardiche, non filologiche. Le righe grigie
        sono anni in cui quel calendario non era ancora stato inventato.
      </p>
    </div>
  )
}
