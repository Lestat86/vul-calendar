// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useClip } from './useClip'

/** jsdom non implementa HTMLMediaElement.play: va sostituito. */
class FakeAudio {
  static made: FakeAudio[] = []
  static rejectPlay = false
  paused = true
  currentTime = 0
  preload = ''
  plays = 0
  src: string
  constructor(src: string) { this.src = src; FakeAudio.made.push(this) }
  addEventListener() {}
  pause() { this.paused = true }
  play() {
    this.plays += 1
    if (FakeAudio.rejectPlay) return Promise.reject(new Error('bloccato'))
    this.paused = false
    return Promise.resolve()
  }
}

type Api = ReturnType<typeof useClip>
let api: Api
let root: ReturnType<typeof createRoot>
let host: HTMLDivElement

function Harness() {
  api = useClip('/audio/lurida-cut.mp3')
  return null
}

async function mount() {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => { root.render(<Harness />) })
}

beforeEach(() => {
  // @ts-expect-error flag interno di React per act()
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  FakeAudio.made = []
  FakeAudio.rejectPlay = false
  vi.stubGlobal('Audio', FakeAudio)
})
afterEach(async () => {
  await act(async () => { root.unmount() })
  host.remove()
  vi.unstubAllGlobals()
})

describe('useClip', () => {
  it('non scarica niente finché nessuno lo chiede', async () => {
    await mount()
    expect(FakeAudio.made).toHaveLength(0)
    expect(api.playing).toBe(false)
  })

  it('al primo click costruisce l\'audio e lo fa partire', async () => {
    await mount()
    await act(async () => { api.toggle() })
    expect(FakeAudio.made).toHaveLength(1)
    const el = FakeAudio.made[0]!
    expect(el.src).toContain('lurida-cut.mp3')
    expect(el.preload).toBe('none') // niente prefetch
    expect(el.plays).toBe(1)
    expect(api.playing).toBe(true)
  })

  it('il secondo click ferma e riavvolge', async () => {
    await mount()
    await act(async () => { api.toggle() })
    await act(async () => { api.toggle() })
    const el = FakeAudio.made[0]!
    expect(el.paused).toBe(true)
    expect(el.currentTime).toBe(0)
    expect(api.playing).toBe(false)
    expect(FakeAudio.made).toHaveLength(1) // riusa lo stesso elemento
  })

  it('riparte da capo, non da dove era rimasto', async () => {
    await mount()
    await act(async () => { api.toggle() })
    FakeAudio.made[0]!.currentTime = 2.5
    await act(async () => { api.toggle() }) // ferma
    await act(async () => { api.toggle() }) // riparte
    expect(FakeAudio.made[0]!.currentTime).toBe(0)
  })

  it('se il browser rifiuta la riproduzione lo stato non resta appeso', async () => {
    FakeAudio.rejectPlay = true
    await mount()
    await act(async () => { api.toggle() })
    expect(api.playing).toBe(false)
  })

  it('smontando il componente il suono non sopravvive', async () => {
    await mount()
    await act(async () => { api.toggle() })
    const el = FakeAudio.made[0]!
    await act(async () => { root.unmount() })
    expect(el.paused).toBe(true)
    // afterEach smonta di nuovo: non deve rompersi
    root = createRoot(document.createElement('div'))
  })
})
