import { useEffect, useState } from 'react'
import { VUL_EPOCH } from '../lib/vul'

type Where = 'above' | 'below' | 'here'

/** Freccia disegnata a pennarello: l'asta oscilla e la punta è asimmetrica.
 *  Un carattere tipografico qui si vedrebbe subito come intruso. */
function MarkerArrow({ flip }: { flip: boolean }) {
  return (
    <svg
      viewBox="0 0 14 21"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[19px] w-[13px]"
      style={flip ? { transform: 'rotate(180deg)' } : undefined}
    >
      <path d="M7.2 1.6 C6.3 6.4 7.9 10.8 6.9 16.6" />
      <path d="M2.2 11.9 L6.9 17.6 L11.6 11.2" />
    </svg>
  )
}

/**
 * Timbro che riporta all'Anno Zero. La freccia indica da che parte sta, così il
 * timbro dice anche dove ti trovi: su cinquemila anni di bacheca è facile
 * perdere la direzione. Quando ci sei sopra, l'inchiostro si sbiadisce.
 */
export function ZeroFab({ onJump }: { onJump: () => void }) {
  const [where, setWhere] = useState<Where>('here')

  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const el = document.querySelector<HTMLElement>('[data-vul="0"]')
      if (!el) return
      const rect = el.getBoundingClientRect()
      const centre = window.innerHeight / 2
      const mid = rect.top + rect.height / 2
      setWhere(Math.abs(mid - centre) < rect.height / 2 ? 'here' : mid < centre ? 'above' : 'below')
    }
    const onScroll = () => { frame ||= requestAnimationFrame(measure) }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const spent = where === 'here'

  return (
    <button
      type="button"
      onClick={onJump}
      aria-label={`Torna all'Anno Zero, ${VUL_EPOCH}`}
      className={`fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30
        flex h-[82px] w-[82px] -rotate-[7deg] flex-col items-center justify-center gap-px
        rounded-full border-[3px] text-white shadow-[0_6px_16px_rgba(0,0,0,.6)]
        max-[400px]:h-[70px] max-[400px]:w-[70px]
        ${spent
          ? 'border-red-deep bg-red/35'
          : 'border-red-deep bg-red/95 hover:bg-red'}`}
      style={{
        // inchiostro di timbro: non è mai uniforme
        backgroundImage: 'radial-gradient(circle at 30% 25%, rgb(255 255 255 / .22), transparent 60%)',
      }}
    >
      <span className="hand text-[26px] max-[400px]:text-[22px]">0</span>
      <span className="text-[9.5px] leading-none tracking-wide">ANNO ZERO</span>
      <MarkerArrow flip={where === 'above'} />
    </button>
  )
}
