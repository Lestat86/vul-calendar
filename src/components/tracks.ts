import type { Track } from '../lib/data'

/**
 * Le classi sono scritte per esteso e non composte a runtime: Tailwind fa
 * tree-shaking sul sorgente e una classe costruita con un template literal
 * non finisce nel bundle.
 */
export const TRACK_META: Record<Track, {
  label: string
  blurb: string
  dot: string
  text: string
  border: string
  chipOn: string
  chipOff: string
}> = {
  storia: {
    label: 'Storia',
    blurb: 'quello che è successo davvero',
    dot: 'bg-bone',
    text: 'text-bone',
    border: 'border-bone/30',
    chipOn: 'bg-bone text-ink border-bone',
    chipOff: 'bg-transparent text-bone/60 border-bone/25',
  },
  lurido: {
    label: 'Lurido',
    blurb: 'hip hop, Italia, anni novanta',
    dot: 'bg-acid',
    text: 'text-acid',
    border: 'border-acid/40',
    chipOn: 'bg-acid text-ink border-acid',
    chipOff: 'bg-transparent text-acid/60 border-acid/30',
  },
  naqp: {
    label: 'NAQP',
    blurb: 'Non Aprite Quella Podcast, sull\'anno del caso',
    dot: 'bg-magenta',
    text: 'text-magenta',
    border: 'border-magenta/40',
    chipOn: 'bg-magenta text-ink border-magenta',
    chipOff: 'bg-transparent text-magenta/60 border-magenta/30',
  },
}

export const TRACK_ORDER: Track[] = ['storia', 'lurido', 'naqp']
