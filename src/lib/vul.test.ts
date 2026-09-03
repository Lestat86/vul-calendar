import { describe, expect, it } from 'vitest'
import {
  VUL_EPOCH, cycleOf, formatCanonical, formatVul, fromVul, toVul, vulFromAD,
} from './vul'

describe('anno zero', () => {
  it('il 1994 è l\'Anno Zero', () => {
    expect(vulFromAD(1994)).toBe(0)
    expect(formatVul(0)).toBe('Anno Zero')
  })
  it('gli anni adiacenti sono 1 aVUL e 1 dVUL', () => {
    expect(vulFromAD(1993)).toBe(-1)
    expect(vulFromAD(1995)).toBe(1)
    expect(formatVul(-1)).toBe('1 aVUL')
    expect(formatVul(1)).toBe('1 dVUL')
  })
})

describe('attraversamento dello zero canonico', () => {
  // Il canonico non ha anno 0: 1 a.C. è immediatamente prima di 1 d.C.
  it('1 d.C. = 1993 aVUL', () => {
    expect(toVul({ year: 1, era: 'dc' })).toBe(-1993)
  })
  it('1 a.C. = 1994 aVUL, senza salti', () => {
    expect(toVul({ year: 1, era: 'ac' })).toBe(-1994)
  })
  it('non esiste un buco tra 1 a.C. e 1 d.C. in scala VUL', () => {
    expect(toVul({ year: 1, era: 'dc' }) - toVul({ year: 1, era: 'ac' })).toBe(1)
  })
  it('753 a.C., fondazione di Roma', () => {
    expect(toVul({ year: 753, era: 'ac' })).toBe(-2746)
  })
})

describe('round trip', () => {
  it('regge su tutto il range utile, ere incluse', () => {
    for (let vul = -5000; vul <= 3000; vul++) {
      expect(toVul(fromVul(vul))).toBe(vul)
    }
  })
  it('fromVul non produce mai anno 0 canonico', () => {
    for (let vul = -2000; vul <= -1980; vul++) {
      expect(fromVul(vul).year).toBeGreaterThanOrEqual(1)
    }
  })
  it('il confine di era cade dove deve', () => {
    expect(fromVul(-1993)).toEqual({ year: 1, era: 'dc' })
    expect(fromVul(-1994)).toEqual({ year: 1, era: 'ac' })
    expect(fromVul(-1995)).toEqual({ year: 2, era: 'ac' })
  })
})

describe('input non validi', () => {
  it('rifiuta l\'anno canonico 0, che non esiste', () => {
    expect(() => toVul({ year: 0, era: 'dc' })).toThrow(RangeError)
  })
  it('rifiuta anni VUL frazionari', () => {
    expect(() => fromVul(1.5)).toThrow(RangeError)
  })
})

describe('ciclo di 31 anni', () => {
  it('il 2025 è il primo Giubileo VUL', () => {
    const v = vulFromAD(2025)
    expect(v).toBe(31)
    expect(cycleOf(v)).toEqual({ cycle: 1, offset: 0, isJubilee: true })
  })
  it('l\'Anno Zero non è un giubileo', () => {
    expect(cycleOf(0).isJubilee).toBe(false)
  })
  it('l\'offset resta in [0,31) anche prima dell\'Anno Zero', () => {
    for (let vul = -100; vul <= 100; vul++) {
      const { offset } = cycleOf(vul)
      expect(offset).toBeGreaterThanOrEqual(0)
      expect(offset).toBeLessThan(31)
    }
  })
})

describe('formattazione', () => {
  it('epoca e formati canonici', () => {
    expect(VUL_EPOCH).toBe(1994)
    expect(formatCanonical({ year: 1994, era: 'dc' })).toBe('1994 d.C.')
    expect(formatCanonical({ year: 753, era: 'ac' })).toBe('753 a.C.')
  })
})
