/**
 * Conversione dell'anno verso altri calendari.
 *
 * Quelli "veri" passano da Intl.DateTimeFormat, che nel browser supporta già
 * ebraico, islamico, persiano, cinese, buddista, copto, etiope, indiano e
 * giapponese: nessuna dipendenza. Quelli inventati (o quasi) si calcolano a
 * mano, perché servono alla gag più che alla cronologia.
 *
 * ATTENZIONE ALLA PRECISIONE: prima del 1582 il gregoriano è prolettico e non
 * coincide col giuliano, e diversi calendari qui sotto hanno un'epoca più
 * recente dell'anno richiesto. L'app lo dichiara invece di fingere rigore.
 */
import { VUL_EPOCH, type CanonicalYear, toAstronomical, toVul } from './vul'

export interface CalendarDef {
  id: string
  name: string
  /** Restituisce l'anno in quel calendario, o null se non ha senso chiederlo. */
  yearOf: (c: CanonicalYear) => string | null
  note?: string
  /** epoca gregoriana sotto la quale il risultato è privo di senso */
  validFromAD?: number
}

/** Metà anno: evita di cadere a cavallo di un capodanno non gregoriano. */
function midYear({ year, era }: CanonicalYear): Date {
  const d = new Date(Date.UTC(2000, 6, 1))
  d.setUTCFullYear(toAstronomical({ year, era }))
  return d
}

function intlYear(calendar: string) {
  return (c: CanonicalYear): string | null => {
    try {
      const parts = new Intl.DateTimeFormat('it', { calendar, year: 'numeric', era: 'short' })
        .formatToParts(midYear(c))
      const y = parts.find((p) => p.type === 'year')?.value
      const era = parts.find((p) => p.type === 'era')?.value
      if (!y) return null
      // per i calendari con più ere (giapponese, cinese) l'era è informativa
      return era && !/^(d\.C\.|AD|CE)$/i.test(era) ? `${y} ${era}` : y
    } catch {
      return null
    }
  }
}

export const CALENDARS: CalendarDef[] = [
  {
    id: 'vul',
    name: 'VUL',
    yearOf: (c) => {
      const v = toVul(c)
      return v === 0 ? 'Anno Zero' : v > 0 ? `${v} dVUL` : `${-v} aVUL`
    },
    note: `anno 0 = ${VUL_EPOCH}, uscita di Voglio Una Lurida`,
  },
  { id: 'hebrew', name: 'Ebraico', yearOf: intlYear('hebrew'), note: 'dalla creazione', validFromAD: 1 },
  { id: 'islamic', name: 'Islamico', yearOf: intlYear('islamic'), note: "dall'Egira, 622 d.C.", validFromAD: 622 },
  { id: 'persian', name: 'Persiano', yearOf: intlYear('persian'), note: 'solare Hijri', validFromAD: 622 },
  { id: 'buddhist', name: 'Buddista', yearOf: intlYear('buddhist'), note: 'dal parinirvana' },
  { id: 'coptic', name: 'Copto', yearOf: intlYear('coptic'), note: 'era dei martiri, 284 d.C.', validFromAD: 284 },
  { id: 'ethiopic', name: 'Etiope', yearOf: intlYear('ethiopic'), validFromAD: 8 },
  { id: 'indian', name: 'Indiano (Saka)', yearOf: intlYear('indian'), validFromAD: 78 },
  { id: 'japanese', name: 'Giapponese', yearOf: intlYear('japanese'), note: 'per era imperiale', validFromAD: 645 },
  { id: 'roc', name: 'Repubblica di Cina', yearOf: intlYear('roc'), validFromAD: 1912 },
  {
    id: 'holocene',
    name: 'Oloceno',
    yearOf: (c) => `${toAstronomical(c) + 10_000} HE`,
    note: 'anno 0 alla fine dell\'ultima era glaciale: niente numeri negativi',
  },
  {
    id: 'republican',
    name: 'Repubblicano francese',
    yearOf: (c) => {
      const y = toAstronomical(c) - 1791
      return y >= 1 ? `an ${y}` : null
    },
    note: 'abolito da Napoleone nel 1806, ma ci piace',
    validFromAD: 1792,
  },
  {
    id: 'discordian',
    name: 'Discordiano',
    yearOf: (c) => `${toAstronomical(c) + 1166} YOLD`,
    note: 'Year of Our Lady of Discord',
  },
  {
    id: 'unix',
    name: 'Unix',
    yearOf: (c) => {
      const t = Math.trunc(Date.UTC(1970, 0, 1) / 1000) + 0
      const d = new Date(Date.UTC(2000, 0, 1))
      d.setUTCFullYear(toAstronomical(c))
      const secs = Math.trunc(d.getTime() / 1000) - t + t
      return `${secs.toLocaleString('it')} s`
    },
    note: 'secondi dal 1° gennaio 1970, capodanno compreso',
  },
]

export interface CalendarRow {
  id: string
  name: string
  value: string
  note?: string
  /** true quando l'anno richiesto precede l'epoca di quel calendario */
  outOfRange: boolean
}

export function convertAll(c: CanonicalYear): CalendarRow[] {
  const ad = c.era === 'dc' ? c.year : -Infinity
  return CALENDARS.map((cal) => {
    const outOfRange = cal.validFromAD !== undefined && ad < cal.validFromAD
    const value = cal.yearOf(c)
    return {
      id: cal.id,
      name: cal.name,
      note: cal.note,
      outOfRange,
      value: value ?? '—',
    }
  })
}
