import { useState } from 'react'
import {
  type ImageCredit, type VulEvent, eraOf, imageUrl, precisionOf, sourceUrl,
} from '../lib/data'
import { TRACK_META } from './tracks'

const PRECISION_LABEL: Record<string, string> = {
  circa: 'data approssimativa',
  decennio: 'anno indicativo, il caso è di quel decennio',
  secolo: 'collocazione secolare',
}

export function EventCard({ event, credits }: {
  event: VulEvent
  credits: Record<string, ImageCredit> | null
}) {
  const [open, setOpen] = useState(false)
  const meta = TRACK_META[event.track]
  const era = eraOf(event)
  const precision = precisionOf(event)
  const credit = event.image ? credits?.[event.image] : null
  const src = sourceUrl(event)

  return (
    <article
      className={`group relative rounded-sm border-l-2 ${meta.border} bg-ink-2/70 pl-3 pr-3 py-2.5
        transition-colors hover:bg-ink-3/70`}
    >
      {event.anchor && (
        <div className="mb-1 inline-block bg-acid px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-ink">
          anno zero
        </div>
      )}

      <div className="flex items-start gap-2.5">
        {event.image && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 overflow-hidden rounded-sm border border-bone/15"
            aria-label={open ? 'Chiudi immagine' : 'Ingrandisci immagine'}
          >
            <img
              src={imageUrl(event.image, 160)}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-14 w-14 object-cover grayscale-[35%] transition group-hover:grayscale-0"
            />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] leading-snug font-semibold text-bone">
            {event.title}
          </h3>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-bone-dim">
            <span className="font-mono">
              {event.year} {era === 'dc' ? 'd.C.' : 'a.C.'}
            </span>
            {event.kind && <span className={`${meta.text} opacity-80`}>{event.kind}</span>}
            {event.track === 'naqp' && event.season && (
              <span className="font-mono">S{event.season}{event.episode ? `E${event.episode}` : ''}</span>
            )}
            {event.tier === 'esclusivo' && (
              <span className="border border-magenta/40 px-1 text-[10px] uppercase text-magenta">
                esclusivo
              </span>
            )}
            {precision !== 'anno' && (
              <span title={PRECISION_LABEL[precision]} className="italic">
                ~ {precision}
              </span>
            )}
          </div>

          {event.summary && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-bone/75">{event.summary}</p>
          )}

          {/* Gli esclusivi Patreon non hanno description pubblica: al posto
              dell'incipit si dice perché manca, invece di lasciare il vuoto. */}
          {event.track === 'naqp' && !event.summary && (
            <p className="mt-1.5 text-[11px] italic text-bone-dim">
              Episodio esclusivo: la descrizione non è pubblica.
            </p>
          )}

          {src && (
            <a
              href={src}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1.5 inline-block text-[11px] text-bone-dim underline decoration-dotted hover:text-acid"
            >
              {event.track === 'naqp' ? 'ascolta' : 'fonte'} ↗
            </a>
          )}
        </div>
      </div>

      {open && event.image && (
        <figure className="mt-2.5">
          <img
            src={imageUrl(event.image, 900)}
            alt={event.title}
            loading="lazy"
            className="w-full rounded-sm border border-bone/15"
          />
          {/* Commons è in larga parte CC-BY/CC-BY-SA: l'attribuzione è obbligatoria */}
          <figcaption className="mt-1 text-[10px] leading-tight text-bone-dim">
            {credit
              ? (
                  <>
                    {credit.author ?? 'autore non indicato'}
                    {credit.license && (
                      <>
                        {' · '}
                        {credit.licenseUrl
                          ? <a href={credit.licenseUrl} target="_blank" rel="noreferrer noopener" className="underline">{credit.license}</a>
                          : credit.license}
                      </>
                    )}
                    {' · '}
                    <a href={credit.filePage} target="_blank" rel="noreferrer noopener" className="underline">Wikimedia Commons</a>
                  </>
                )
              : 'immagine da Wikimedia Commons'}
          </figcaption>
        </figure>
      )}
    </article>
  )
}
