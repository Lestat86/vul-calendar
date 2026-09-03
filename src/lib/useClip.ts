import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Riproduce uno spezzone audio a comando.
 *
 * L'elemento si costruisce al PRIMO click e non al mount: così l'mp3 non viene
 * scaricato da chi non lo chiede mai, che su rete mobile è la differenza fra
 * 47KB e zero.
 *
 * Un secondo click ferma: chi si è stufato del suono deve poterlo zittire con
 * lo stesso gesto con cui l'ha fatto partire, senza cercare un altro comando.
 */
export function useClip(src: string) {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  const stop = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.pause()
    el.currentTime = 0
    setPlaying(false)
  }, [])

  const toggle = useCallback(() => {
    if (ref.current && !ref.current.paused) {
      stop()
      return
    }
    if (!ref.current) {
      const el = new Audio(src)
      el.preload = 'none'
      el.addEventListener('ended', () => setPlaying(false))
      ref.current = el
    }
    ref.current.currentTime = 0
    // play() può essere rifiutato (blocco del browser, file assente): in quel
    // caso lo stato non deve restare bloccato su "in riproduzione"
    void ref.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }, [src, stop])

  // niente audio che sopravvive al componente che lo ha avviato
  useEffect(() => () => {
    ref.current?.pause()
    ref.current = null
  }, [])

  return { playing, toggle, stop }
}
