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

describe('episodeSummary — teaser Patreon troncati a 140 caratteri', () => {
  it('ricuce la parola mozzata invece di lasciarla a metà', () => {
    const s = episodeSummary(
      "Siamo in Francia, nell'est del paese, nel 1984. In una cit",
    )
    expect(s).toBe("Siamo in Francia, nell'est del paese, nel 1984. In una…")
    expect(s).not.toMatch(/cit$/)
  })

  it('non tocca un incipit che finisce già con la punteggiatura', () => {
    const done = 'Skidmore, Missouri, 10 luglio 1981. In pieno giorno davanti a tutti.'
    expect(episodeSummary(done)).toBe(done)
  })

  it('non aggiunge puntini a chi ne ha già', () => {
    const s = episodeSummary('Manaus, Brasile, primi anni 2000. Una città isolata…')
    expect(s.endsWith('…')).toBe(true)
    expect(s).not.toMatch(/…\s*…/)
  })
})

describe('extractYear — trappole trovate sui dati veri', () => {
  it('"anni 2000" è un decennio, non l\'anno 2000', () => {
    expect(extractYear('Stati Uniti, anni 2000. Tuo figlio prende brutti voti'))
      .toEqual({ year: 2000, precision: 'decennio' })
    expect(extractYear('Manaus, Brasile, primi anni 2000. Una città isolata'))
      .toEqual({ year: 2000, precision: 'decennio' })
  })

  it('"anni 2010" resta il decennio giusto', () => {
    expect(extractYear('Siamo negli anni 2010, e tutto cambia'))
      .toEqual({ year: 2010, precision: 'decennio' })
  })

  it('"alla fine del 1800" è il secolo, e il qualificatore dice dove dentro', () => {
    // ancorare al primo anno del secolo metterebbe H.H. Holmes nel 1800
    // invece che negli anni 1890: novant'anni di errore
    expect(extractYear("Chicago. Siamo alla fine del 1800, in un'epoca in cui la medicina"))
      .toEqual({ year: 1890, precision: 'decennio' })
    expect(extractYear('Roma, metà del 1900, la città cambia faccia'))
      .toEqual({ year: 1950, precision: 'decennio' })
  })

  it('un anno vero che finisce per 00 resta un anno', () => {
    expect(extractYear('Siamo nel 1900 e nasce il secolo breve'))
      .toEqual({ year: 1900, precision: 'anno' })
  })

  it('gli anni normali non sono toccati dalle due regole nuove', () => {
    expect(extractYear('1914, Francia. È appena scoppiata la guerra'))
      .toEqual({ year: 1914, precision: 'anno' })
    expect(extractYear('New York, 2011. Sarma è la regina del crudismo'))
      .toEqual({ year: 2011, precision: 'anno' })
    expect(extractYear("anni '90 in Svezia")).toEqual({ year: 1990, precision: 'decennio' })
  })
})

describe('extractYear — forme trovate leggendo i 63 episodi non datati', () => {
  it('apici tipografici: ‘ U+2018 oltre a ’ e \'', () => {
    expect(extractYear('Veneto, primi anni ‘80. Il mondo è diviso'))
      .toEqual({ year: 1980, precision: 'decennio' })
    expect(extractYear('Siamo in Francia, tra gli anni ‘60 e ‘70'))
      .toEqual({ year: 1960, precision: 'decennio' })
  })

  it('"Anni" con la maiuscola', () => {
    expect(extractYear("Channelview, Texas. Anni '90. In questa cittadina operaia"))
      .toEqual({ year: 1990, precision: 'decennio' })
  })

  it('"anni duemila"', () => {
    expect(extractYear("Siamo nei primi anni duemila, nell'internet lento"))
      .toEqual({ year: 2000, precision: 'decennio' })
  })

  it('secoli apocopati: "fine \'800", "inizio 800"', () => {
    expect(extractYear('provincia bergamasca di fine ‘800. Un uomo misterioso'))
      .toEqual({ year: 1890, precision: 'decennio' })
    expect(extractYear('Germania, inizio 800. Un medico incapace di curare'))
      .toEqual({ year: 1800, precision: 'decennio' })
    expect(extractYear("La Porte, Indiana. Nei primi anni del '900, questa cittadina"))
      .toEqual({ year: 1900, precision: 'decennio' })
  })

  it('secoli in parole', () => {
    expect(extractYear("Milano, metà dell'Ottocento. Nelle strade strette e buie"))
      .toEqual({ year: 1850, precision: 'decennio' })
    expect(extractYear('Il Novecento europeo comincia male'))
      .toEqual({ year: 1900, precision: 'secolo' })
  })

  it('secoli in numeri romani', () => {
    expect(extractYear('Siamo a New York, alla fine del XIX secolo. Decine di migliaia'))
      .toEqual({ year: 1890, precision: 'decennio' })
    expect(extractYear('Nel XVI secolo la stampa cambia tutto'))
      .toEqual({ year: 1500, precision: 'secolo' })
  })

  it('"a cavallo di due secoli" indica un confine: meglio tacere', () => {
    // prendere il primo dei due sbaglierebbe di cent'anni
    expect(extractYear('Francia, a cavallo del XX e del XXI secolo. Una famiglia'))
      .toBeNull()
  })

  it('il qualificatore sposta dentro il secolo, non lo ancora al primo anno', () => {
    expect(extractYear('Chicago. Siamo alla fine del 1800, in un\'epoca in cui la medicina'))
      .toEqual({ year: 1890, precision: 'decennio' })
  })

  it('"metallo" non è "metà"', () => {
    expect(extractYear('Un pezzo di metallo ritrovato nel 1975'))
      .toEqual({ year: 1975, precision: 'anno' })
  })
})

describe('extractYear — mezzo secolo', () => {
  it('"prima metà" non è "metà": il centro, non la fine', () => {
    // ancorare al 1950 metteva Padre Pio trent'anni dopo le stigmate
    expect(extractYear('Siamo in Puglia nella prima metà del Novecento. Una cittadina'))
      .toEqual({ year: 1925, precision: 'circa' })
  })
  it('"seconda metà" sta nella metà giusta', () => {
    expect(extractYear('Roma, seconda metà del XIX secolo, la città cambia faccia'))
      .toEqual({ year: 1875, precision: 'circa' })
  })
  it('"metà" da sola resta il centro del secolo', () => {
    expect(extractYear("Milano, metà dell'Ottocento. Nelle strade strette"))
      .toEqual({ year: 1850, precision: 'decennio' })
  })
})
