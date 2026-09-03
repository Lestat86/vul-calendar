// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { holdCentered } from './scroll'

/**
 * jsdom non fa layout: getBoundingClientRect è finto e va pilotato a mano.
 * Qui interessa solo CHI muove la pagina e quando smette, non di quanto.
 *
 * I frame si pilotano con una coda invece che coi timer finti: holdCentered
 * usa sia setTimeout sia requestAnimationFrame, e falsificarli entrambi
 * rendeva il test più fragile del codice che verifica.
 */
let queue = new Map<number, FrameRequestCallback>()
let nextId = 1

/** Esegue i frame in coda (i tick che ne accodano altri restano per il giro dopo). */
const flush = () => {
  const now = [...queue.entries()]
  queue = new Map()
  for (const [, cb] of now) cb(performance.now())
}

/** Lascia passare un macrotask, così scatta il setTimeout iniziale. */
const macrotask = () => new Promise((r) => setTimeout(r, 1))

function setup(drift = 300) {
  const el = document.createElement('div')
  document.body.append(el)
  el.getBoundingClientRect = () =>
    ({ top: window.innerHeight / 2 + drift, height: 0 }) as DOMRect

  const scrollBy = vi.fn()
  Object.defineProperty(window, 'scrollBy', { value: scrollBy, writable: true })
  Object.defineProperty(window, 'matchMedia', {
    value: () => ({ matches: false }), writable: true,
  })
  return { el, scrollBy }
}

beforeEach(() => {
  queue = new Map()
  nextId = 1
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = nextId++
    queue.set(id, cb)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { queue.delete(id) })
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('holdCentered', () => {
  it('centra subito il bersaglio', () => {
    const { el, scrollBy } = setup()
    holdCentered(el)
    expect(scrollBy).toHaveBeenCalledTimes(1)
    expect(scrollBy.mock.calls[0]![0]).toMatchObject({ top: 300, behavior: 'auto' })
  })

  it('continua a correggere finché il contenuto si sposta', async () => {
    const { el, scrollBy } = setup()
    holdCentered(el)
    await macrotask()
    flush()
    flush()
    // il ciclo è vivo: senza, il bersaglio resterebbe fuori centro
    expect(scrollBy.mock.calls.length).toBeGreaterThan(1)
  })

  // --- regressione: dall'Anno Zero non si riusciva a scrollare via ----------
  it('smette di correggere appena l\'utente tocca la rotella', async () => {
    const { el, scrollBy } = setup()
    holdCentered(el)
    await macrotask()
    flush()
    const prima = scrollBy.mock.calls.length

    window.dispatchEvent(new Event('wheel'))
    flush()
    flush()

    expect(scrollBy.mock.calls.length).toBe(prima)
    expect(queue.size).toBe(0) // nessun frame residuo che riparta dopo
  })

  it.each(['touchstart', 'pointerdown', 'keydown'])('si arrende anche su %s', async (type) => {
    const { el, scrollBy } = setup()
    holdCentered(el)
    await macrotask()
    flush()
    const prima = scrollBy.mock.calls.length

    window.dispatchEvent(new Event(type))
    flush()

    expect(scrollBy.mock.calls.length).toBe(prima)
  })

  it('un gesto prima che il ciclo parta lo annulla comunque', async () => {
    const { el, scrollBy } = setup()
    holdCentered(el)
    window.dispatchEvent(new Event('wheel')) // subito, prima del setTimeout
    await macrotask()
    flush()
    expect(scrollBy).toHaveBeenCalledTimes(1) // solo il centraggio iniziale
  })

  it('stop() sgancia i listener: niente perdite fra due atterraggi', () => {
    const { el } = setup()
    const remove = vi.spyOn(window, 'removeEventListener')
    holdCentered(el)()
    const staccati = remove.mock.calls.map((c) => c[0])
    for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
      expect(staccati).toContain(type)
    }
  })

  it('chiamare stop() due volte non rompe niente', () => {
    const { el } = setup()
    const stop = holdCentered(el)
    expect(() => { stop(); stop() }).not.toThrow()
  })
})
