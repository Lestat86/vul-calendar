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

function Photo({ file, alt, circled, big, onClick }: {
  file: string
  alt: string
  circled: boolean
  big?: boolean
  onClick?: () => void
}) {
  return (
    <span className={`relative block ${big ? 'w-full' : 'w-[104px]'}`}>
      <img
        src={imageUrl(file, big ? 900 : 280)}
        alt={alt}
        loading="lazy"
        decoding="async"
        onClick={onClick}
        className={`halftone block w-full ${onClick ? 'cursor-zoom-in' : ''}`}
      />
      {/* il retino sta sopra la foto, non dentro il filtro */}
      <span aria-hidden className="halftone-dots pointer-events-none absolute inset-0" />
      {circled && (
        <span aria-hidden className="circled pointer-events-none absolute -inset-x-[5px] -inset-y-[7px]" />
      )}
    </span>
  )
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
    <article className="border-b border-dotted border-paper-edge py-2 last:border-b-0 last:pb-0">
      {event.image && (
        <span className="float-right ml-3 mt-1 mb-1 block">
          <Photo
            file={event.image}
            alt=""
            circled={meta.circled}
            onClick={() => setOpen((v) => !v)}
          />
        </span>
      )}

      <h3 className={`text-[17px] leading-tight ${meta.title}`}>{event.title}</h3>

      <p className={`mt-0.5 text-[11.5px] leading-snug ${meta.tag}`}>
        {event.year} {era === 'dc' ? 'd.C.' : 'a.C.'}
        {event.kind && <> &mdash; {event.kind}</>}
        {event.track === 'naqp' && event.season && (
          <> &mdash; S{event.season}{event.episode ? `E${event.episode}` : ''}</>
        )}
        {event.tier === 'esclusivo' && <> &mdash; esclusivo</>}
        {precision !== 'anno' && (
          <span title={PRECISION_LABEL[precision]}> &mdash; data ~{precision}</span>
        )}
      </p>

      {event.summary && (
        <p className="mt-1.5 max-w-[58ch] text-[14px] leading-[1.62] text-ink-body">
          {event.summary}
        </p>
      )}

      {event.track === 'naqp' && !event.summary && (
        <p className="mt-1.5 text-[12px] text-ink-soft">
          Questo episodio non ha una descrizione nel feed.
        </p>
      )}

      {src && (
        <a
          href={src}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-1.5 inline-block text-[12px] text-ink-soft underline decoration-dotted
            hover:text-red-deep"
        >
          {event.track === 'naqp' ? 'ascolta' : 'fonte'}
        </a>
      )}

      {open && event.image && (
        <figure className="clear-both mt-2.5">
          <Photo file={event.image} alt={event.title} circled={false} big />
          {/* Commons è in larga parte CC-BY/CC-BY-SA: l'attribuzione è obbligatoria */}
          <figcaption className="mt-1 text-[10.5px] leading-tight text-ink-soft">
            {credit
              ? (
                  <>
                    {credit.author ?? 'autore non indicato'}
                    {credit.license && (
                      <>
                        {' — '}
                        {credit.licenseUrl
                          ? <a href={credit.licenseUrl} target="_blank" rel="noreferrer noopener" className="underline">{credit.license}</a>
                          : credit.license}
                      </>
                    )}
                    {' — '}
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
