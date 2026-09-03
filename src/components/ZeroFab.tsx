import { useEffect, useState } from 'react'
import { VUL_EPOCH } from '../lib/vul'

type Where = 'above' | 'below' | 'here'

/**
 * Riporta all'Anno Zero. La freccia indica da che parte sta, così il pulsante
 * dice anche dove ti trovi: su una timeline di cinquemila anni è facile
 * perdere il senso della direzione.
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
      const center = window.innerHeight / 2
      const mid = rect.top + rect.height / 2
      setWhere(Math.abs(mid - center) < rect.height ? 'here' : mid < center ? 'above' : 'below')
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

  return (
    <button
      type="button"
      onClick={onJump}
      aria-label={`Torna all'Anno Zero, ${VUL_EPOCH}`}
      className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 flex
        items-center gap-2 rounded-full border-2 px-3.5 py-2.5 shadow-lg shadow-black/50
        transition-all ${
        where === 'here'
          ? 'border-acid/40 bg-ink-2 text-bone-dim'
          : 'border-acid bg-acid text-ink hover:bg-bone'}`}
    >
      <span className="display text-xl leading-none">0</span>
      <span className="text-left text-[9px] font-bold uppercase leading-tight tracking-wider">
        anno
        <br />
        zero
      </span>
      <span aria-hidden className="text-sm leading-none">
        {where === 'above' ? '↑' : where === 'below' ? '↓' : '•'}
      </span>
    </button>
  )
}
