import { describe, expect, it } from 'vitest'
import { episodeSummary, extractYear, stripDescription } from './lib.mjs'

const ADV = 'Vai su https://saily.com/naqp usa il coupon NAQP #adv '

describe('stripDescription', () => {
  it('butta tag, entità e blocco sponsor', () => {
    expect(stripDescription(`<p>${ADV}Stati Uniti, 1993.</p>`)).toBe('Stati Uniti, 1993.')
  })
})

describe('episodeSummary', () => {
  it('tiene il racconto e taglia l\'indice fra parentesi', () => {
    const s = episodeSummary(
      `${ADV}Busto Arsizio, fine anni '90. Esiste un posto che ogni genitore `
      + 'italiano considera sicuro, e invece no. (00:00) Intro (01:02:17) Rubrica mail',
    )
    expect(s).toContain('Busto Arsizio')
    expect(s).not.toContain('Rubrica mail')
    expect(s).not.toContain('01:02:17')
  })

  it('taglia anche i timestamp nudi, senza parentesi', () => {
    const s = episodeSummary(
      `${ADV}Siamo in Sicilia nel 1976, e un uomo viene accusato di un delitto `
      + 'che non ha commesso. 01:04:30 La Sentenza Storica 01:06:30 Le Conseguenze',
    )
    expect(s).not.toContain('Sentenza Storica')
    expect(s).toContain('Sicilia')
  })

  it('butta il boilerplate di Megaphone e i ringraziamenti ai patron', () => {
    const s = episodeSummary(
      `${ADV}Un conte, un tamarro, una truffa milionaria che nessuno si aspettava. `
      + 'Grazie a BigMac, Nira, Patatti, Svizzerotto '
      + 'Learn more about your ad choices. Visit megaphone.fm/adchoices',
    )
    expect(s).not.toContain('Svizzerotto')
    expect(s).not.toContain('megaphone')
    expect(s).toContain('truffa milionaria')
  })

  it('taglia a fine frase, non a metà parola', () => {
    const long = 'Prima frase che serve. ' + 'Parola '.repeat(120)
    const s = episodeSummary(ADV + long, 120)
    expect(s.length).toBeLessThanOrEqual(122)
    expect(s.endsWith('…') || s.endsWith('.')).toBe(true)
    expect(s).not.toMatch(/Parol$/)
  })

  it('preferisce niente a un moncone', () => {
    expect(episodeSummary(`${ADV}(00:00) Intro`)).toBeNull()
    expect(episodeSummary('')).toBeNull()
    expect(episodeSummary(null)).toBeNull()
  })
})

describe('extractYear', () => {
  it('legge l\'anno dall\'incipit, non dai riferimenti successivi', () => {
    expect(extractYear('Siamo a Napoli, nel 1993. Poi nel 2020 succede altro'))
      .toEqual({ year: 1993, precision: 'anno' })
  })
  it('capisce i decenni scritti a parole', () => {
    expect(extractYear('Siamo in Italia, alla fine degli anni ottanta'))
      .toEqual({ year: 1980, precision: 'decennio' })
  })
})
