import { describe, expect, it } from 'vitest'
import { CALENDARS, convertAll } from './calendars'

const y = (year: number) => ({ year, era: 'dc' as const })

describe('calendari', () => {
  it('il VUL è la prima riga e sull\'Anno Zero lo dice', () => {
    const rows = convertAll(y(1994))
    expect(rows[0]!.id).toBe('vul')
    expect(rows[0]!.value).toBe('Anno Zero')
  })

  it('i calendari inventati sono aritmetica pura', () => {
    const rows = convertAll(y(1994))
    const get = (id: string) => rows.find((r) => r.id === id)!.value
    expect(get('holocene')).toBe('11994 HE')
    expect(get('discordian')).toBe('3160 YOLD')
    expect(get('republican')).toBe('an 203')
  })

  it('Intl risponde per i calendari reali', () => {
    const rows = convertAll(y(1994))
    for (const id of ['hebrew', 'islamic', 'persian']) {
      expect(rows.find((r) => r.id === id)!.value).not.toBe('—')
    }
  })

  it('segnala fuori epoca invece di inventare', () => {
    const rows = convertAll({ year: 500, era: 'ac' })
    expect(rows.find((r) => r.id === 'islamic')!.outOfRange).toBe(true)
    expect(rows.find((r) => r.id === 'roc')!.outOfRange).toBe(true)
    // l'oloceno esiste proprio per non avere negativi
    expect(rows.find((r) => r.id === 'holocene')!.outOfRange).toBe(false)
    expect(rows.find((r) => r.id === 'holocene')!.value).toBe('9501 HE')
  })

  it('il repubblicano francese non esiste prima del 1792', () => {
    expect(convertAll(y(1700)).find((r) => r.id === 'republican')!.value).toBe('—')
    expect(convertAll(y(1800)).find((r) => r.id === 'republican')!.value).toBe('an 9')
  })

  it('nessun calendario lancia su tutto il range della timeline', () => {
    for (const year of [3300, 753, 1, 476, 1492, 1994, 2026]) {
      for (const era of ['ac', 'dc'] as const) {
        expect(() => convertAll({ year, era })).not.toThrow()
      }
    }
    expect(CALENDARS.length).toBeGreaterThan(10)
  })
})
