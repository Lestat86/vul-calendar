export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Gesti con cui l'utente prende il controllo dello scroll. */
const USER_INTENT = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const

/**
 * Porta un elemento al centro della viewport e ce lo TIENE mentre il contenuto
 * sopra di lui cambia altezza.
 *
 * Serve perché i chunk si caricano pigramente: appena il bersaglio è a schermo,
 * i decenni vicini entrano in viewport, si popolano e allungano le righe che
 * stanno sopra, spingendo giù il bersaglio. Un solo scrollIntoView lascia
 * l'utente decine di righe lontano dal punto chiesto.
 *
 * IL CICLO SI ARRENDE AL PRIMO GESTO DELL'UTENTE. Senza questo, la scrollata
 * dell'utente viene letta come deriva da correggere: il ciclo riporta indietro
 * la pagina e riarma il proprio timer di quiete, rendendo impossibile
 * allontanarsi dall'anno su cui si è appena atterrati. Gli eventi di scroll
 * non basterebbero a distinguere, perché li genera anche questa funzione:
 * servono gli eventi di input, che sono inequivocabili.
 */
export function holdCentered(
  target: HTMLElement,
  { smooth = false, quietMs = 600, maxMs = 4000 } = {},
): () => void {
  const align = (behavior: ScrollBehavior) => {
    const rect = target.getBoundingClientRect()
    const delta = rect.top + rect.height / 2 - window.innerHeight / 2
    if (Math.abs(delta) < 2) return false
    window.scrollBy({ top: delta, behavior })
    return true
  }

  let frame = 0
  let delay = 0
  let stopped = false

  const stop = () => {
    if (stopped) return
    stopped = true
    clearTimeout(delay)
    cancelAnimationFrame(frame)
    for (const type of USER_INTENT) window.removeEventListener(type, stop)
  }
  for (const type of USER_INTENT) {
    window.addEventListener(type, stop, { passive: true })
  }

  const animate = smooth && !prefersReducedMotion()
  align(animate ? 'smooth' : 'auto')

  const started = performance.now()
  let lastFix = started

  const tick = () => {
    if (stopped) return
    const now = performance.now()
    if (now - lastFix > quietMs || now - started > maxMs) return stop()
    if (align('auto')) lastFix = now
    frame = requestAnimationFrame(tick)
  }
  // se c'è un'animazione in corso, non litigarci: aspetta che finisca
  delay = window.setTimeout(() => { frame = requestAnimationFrame(tick) }, animate ? 420 : 0)

  return stop
}
