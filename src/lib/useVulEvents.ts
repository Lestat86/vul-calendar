import { useCallback, useRef, useState } from 'react'
import { type VulEvent, loadChunk } from './data'

/**
 * Eventi caricati, tenuti FUORI da Timeline.
 *
 * Timeline viene smontata quando si passa al convertitore: se lo stato vivesse
 * là dentro, ogni ritorno in timeline ripartirebbe da zero e tutte le righe
 * tornerebbero segnaposto, cambiando altezza sotto i piedi dello scroll.
 */
export function useVulEvents() {
  const [byVul, setByVul] = useState<Map<number, VulEvent[]>>(new Map())
  const requested = useRef(new Map<number, Promise<void>>())

  const ensureChunk = useCallback((bucket: number): Promise<void> => {
    const pending = requested.current.get(bucket)
    if (pending) return pending

    const job = loadChunk(bucket).then((events) => {
      setByVul((prev) => {
        const next = new Map(prev)
        for (const e of events) {
          const list = next.get(e.vul)
          if (list) {
            if (!list.some((x) => x.id === e.id)) list.push(e)
          } else {
            next.set(e.vul, [e])
          }
        }
        // ogni anno resta ordinato per rank: "i primi 4" sono i più notevoli
        for (const list of next.values()) list.sort((a, b) => a.rank - b.rank)
        return next
      })
    })
    requested.current.set(bucket, job)
    return job
  }, [])

  return { byVul, ensureChunk }
}
