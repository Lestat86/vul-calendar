/**
 * Aritmetica dell'era VUL.
 *
 * Anno Zero = 1994, uscita di "Voglio Una Lurida" (Articolo 31).
 *
 * Differenza deliberata dal calendario canonico: il VUL HA un anno zero.
 * Il canonico salta da 1 a.C. a 1 d.C.; il VUL non può, perché l'anno zero
 * è esattamente l'evento che fonda l'era. Internamente lavoriamo quindi in
 * anni "astronomici" (1 a.C. = 0, 2 a.C. = -1, ...) e convertiamo ai bordi.
 */

export const VUL_EPOCH = 1994
/** Articolo *31*: l'era si conta anche in cicli di 31 anni. */
export const VUL_CYCLE = 31

export type Era = 'ac' | 'dc'

export interface CanonicalYear {
  year: number // sempre >= 1
  era: Era
}

/** Anno canonico -> anno astronomico (1 a.C. = 0, continuo attraverso lo zero). */
export function toAstronomical({ year, era }: CanonicalYear): number {
  if (!Number.isInteger(year) || year < 1) {
    throw new RangeError(`anno canonico non valido: ${year} (deve essere >= 1)`)
  }
  return era === 'dc' ? year : 1 - year
}

/** Anno astronomico -> anno canonico con era. */
export function fromAstronomical(astro: number): CanonicalYear {
  return astro >= 1 ? { year: astro, era: 'dc' } : { year: 1 - astro, era: 'ac' }
}

/** Anno canonico -> anno VUL (negativo = aVUL, 0 = Anno Zero, positivo = dVUL). */
export function toVul(canonical: CanonicalYear): number {
  return toAstronomical(canonical) - VUL_EPOCH
}

/** Anno VUL -> anno canonico. */
export function fromVul(vul: number): CanonicalYear {
  if (!Number.isInteger(vul)) throw new RangeError(`anno VUL non intero: ${vul}`)
  return fromAstronomical(vul + VUL_EPOCH)
}

/** Scorciatoia per gli anni d.C., che sono il 99% dei casi. */
export function vulFromAD(year: number): number {
  return toVul({ year, era: 'dc' })
}

export function formatVul(vul: number): string {
  if (vul === 0) return 'Anno Zero'
  return vul > 0 ? `${vul} dVUL` : `${-vul} aVUL`
}

export function formatCanonical({ year, era }: CanonicalYear): string {
  return `${year} ${era === 'dc' ? 'd.C.' : 'a.C.'}`
}

/** Posizione nel ciclo di 31 anni: quale ciclo, e a che punto siamo. */
export function cycleOf(vul: number): { cycle: number; offset: number; isJubilee: boolean } {
  const cycle = Math.floor(vul / VUL_CYCLE)
  const offset = vul - cycle * VUL_CYCLE // sempre in [0, 31)
  return { cycle, offset, isJubilee: offset === 0 && vul !== 0 }
}
