import { describe, expect, it } from 'vitest'
import { nearestPopulatedYear } from './data'

// --- regressione: il convertitore non muoveva lo scroll ---------------------
// Chiedere un anno senza eventi lasciava querySelector a null e la timeline
// ferma dov'era, dando l'impressione di "andare sempre nello stesso posto".
describe('nearestPopulatedYear', () => {
  const popolati = [-2746, -494, -8, -1, 0, 1, 31, 32]

  it('un anno popolato resta se stesso', () => {
    expect(nearestPopulatedYear(popolati, 0)).toBe(0)
    expect(nearestPopulatedYear(popolati, 31)).toBe(31)
  })

  it('un anno vuoto atterra sul vicino, non su null', () => {
    expect(nearestPopulatedYear(popolati, 20)).toBe(31)
    expect(nearestPopulatedYear(popolati, -100)).toBe(-8)
    expect(nearestPopulatedYear(popolati, -3000)).toBe(-2746)
    expect(nearestPopulatedYear(popolati, 9999)).toBe(32)
  })

  it('a parità di distanza vince l\'anno precedente', () => {
    // 16 sta esattamente in mezzo fra 1 e 31
    expect(nearestPopulatedYear([1, 31], 16)).toBe(1)
  })

  it('senza righe non inventa un bersaglio', () => {
    expect(nearestPopulatedYear([], 0)).toBeNull()
  })
})
