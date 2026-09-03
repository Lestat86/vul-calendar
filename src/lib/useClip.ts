import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Riproduce uno spezzone audio a comando.
 *
 * L'elemento si costruisce al MOUNT con preload 'auto', non al primo click.
 * La versione precedente lo creava al click per non scaricare 47KB a chi non
 * li chiede, ma quel risparmio si pagava con un ritardo percepibile fra il
 * click e il suono: il browser doveva scaricare e decodificare prima di
 * partire. Su un file più piccolo del CSS della pagina era il compromesso
 * sbagliato, perché quel click è la battuta di tutta l'app.
 *
 * Un secondo click ferma: chi si è stufato del suono deve poterlo zittire con
 * lo stesso gesto con cui l'ha fatto partire, senza cercare un altro comando.
 */
export function useClip(src: string) {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const el = new Audio(src)
    el.preload = 'auto' // scarica e decodifica adesso, non al click
    const onEnded = () => setPlaying(false)
    el.addEventListener('ended', onEnded)
    el.load()
    ref.current = el
    return () => {
      el.removeEventListener('ended', onEnded)
      el.pause() // niente audio che sopravvive al componente che lo ha avviato
      ref.current = null
    }
  }, [src])

  const stop = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.pause()
    el.currentTime = 0
    setPlaying(false)
  }, [])

  const toggle = useCallback(() => {
    const el = ref.current
    if (!el) return
    if (!el.paused) {
      stop()
      return
    }
    el.currentTime = 0
    // play() può essere rifiutato (blocco del browser, file assente): in quel
    // caso lo stato non deve restare bloccato su "in riproduzione"
    void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }, [stop])

  return { playing, toggle, stop }
}
