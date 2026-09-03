import type { Track } from '../lib/data'

/**
 * Le tracce non si distinguono con un pallino colorato ma con il MODO in cui
 * sono state annotate sul foglio: la storia è battuta a macchina, il lurido è
 * passato a evidenziatore, NAQP è scritto in rosso e le sue foto sono cerchiate
 * a pennarello.
 *
 * Le classi sono scritte per esteso: Tailwind fa tree-shaking sul sorgente e
 * una classe composta a runtime non finisce nel bundle.
 */
export const TRACK_META: Record<Track, {
  label: string
  blurb: string
  title: string
  tag: string
  chipOn: string
  circled: boolean
}> = {
  storia: {
    label: 'Storia',
    blurb: 'quello che è successo davvero',
    title: 'text-ink',
    tag: 'text-ink-soft',
    chipOn: 'bg-white text-ink',
    circled: false,
  },
  lurido: {
    label: 'Lurido',
    blurb: 'hip hop, Italia, anni novanta',
    title: 'text-ink highlighted',
    tag: 'text-ink-soft',
    chipOn: 'bg-marker text-ink',
    circled: false,
  },
  naqp: {
    label: 'NAQP',
    blurb: 'Non Aprite Quella Podcast, sull\'anno del caso',
    title: 'text-red',
    tag: 'text-red-deep',
    chipOn: 'bg-white text-red',
    circled: true,
  },
}

export const CHIP_OFF =
  'bg-transparent text-ink-soft/75 border border-dashed border-ink-soft'

export const TRACK_ORDER: Track[] = ['storia', 'lurido', 'naqp']
