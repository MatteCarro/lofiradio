/*
  MusicPlayer — riproduzione della playlist utente con crossfade.

  Usa AudioBufferSourceNode + GainNode sull'AudioContext condiviso
  (niente <audio> tag): questo permette il crossfade sample-accurate
  tra le tracce con curve a potenza costante (equal-power).

  I Blob provengono da IndexedDB e vengono decodificati on-demand,
  con una piccola cache per non ridecodificare a ogni passaggio.
*/

export interface Track {
  id: string
  name: string
  blob: Blob
}

export interface MusicPlayerEvents {
  /** Cambia la traccia corrente (indice e traccia, null se playlist vuota). */
  onTrackChange?: (index: number, track: Track | null) => void
  onPlayStateChange?: (playing: boolean) => void
  onTimeUpdate?: (elapsed: number, duration: number) => void
  onError?: (message: string) => void
}

/** Stato della sorgente attualmente udibile. */
interface CurrentSource {
  source: AudioBufferSourceNode
  gain: GainNode
  buffer: AudioBuffer
  trackId: string
  /** ctx.currentTime al momento dello start. */
  startedAt: number
  /** Offset nella traccia (per pausa/ripresa). */
  offset: number
}

const CROSSFADE_SECONDS = 3
const DECODE_CACHE_SIZE = 4

/** Curve a potenza costante: evitano il "buco" di volume a metà crossfade. */
function equalPowerCurves(steps = 64): { fadeIn: Float32Array; fadeOut: Float32Array } {
  const fadeIn = new Float32Array(steps)
  const fadeOut = new Float32Array(steps)
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    fadeIn[i] = Math.sin((t * Math.PI) / 2)
    fadeOut[i] = Math.cos((t * Math.PI) / 2)
  }
  return { fadeIn, fadeOut }
}

export class MusicPlayer {
  private playlist: Track[] = []
  private index = -1
  private playing = false
  private current: CurrentSource | null = null
  private watcher: ReturnType<typeof setInterval> | null = null
  private advancing = false
  private readonly decodeCache = new Map<string, Promise<AudioBuffer>>()
  private readonly curves = equalPowerCurves()
  /** Contatore generazionale: invalida i callback di sorgenti ormai sostituite. */
  private generation = 0

  private readonly ctx: AudioContext
  private readonly destination: AudioNode
  private readonly events: MusicPlayerEvents

  constructor(
    ctx: AudioContext,
    destination: AudioNode,
    events: MusicPlayerEvents = {},
  ) {
    this.ctx = ctx
    this.destination = destination
    this.events = events
  }

  /* ------------------------------------------------------------------ */
  /* Playlist                                                            */
  /* ------------------------------------------------------------------ */

  setPlaylist(tracks: Track[]): void {
    const currentId = this.currentTrack()?.id
    this.playlist = tracks
    // Mantiene il puntatore sulla stessa traccia se esiste ancora.
    this.index = currentId
      ? tracks.findIndex((t) => t.id === currentId)
      : this.index < tracks.length
        ? this.index
        : -1
    if (this.index === -1 && this.current) {
      // La traccia in riproduzione è stata rimossa dalla playlist.
      this.stopCurrent(0.2)
      this.setPlaying(false)
      this.events.onTrackChange?.(-1, null)
    }
  }

  currentTrack(): Track | null {
    return this.playlist[this.index] ?? null
  }

  currentIndex(): number {
    return this.index
  }

  isPlaying(): boolean {
    return this.playing
  }

  /* ------------------------------------------------------------------ */
  /* Controlli di trasporto                                              */
  /* ------------------------------------------------------------------ */

  async playAt(index: number): Promise<void> {
    if (!this.playlist[index]) return
    await this.startTrack(index, 0, this.current ? 0.4 : 0.05)
  }

  async next(): Promise<void> {
    if (this.playlist.length === 0) return
    await this.playAt((this.index + 1) % this.playlist.length)
  }

  async prev(): Promise<void> {
    if (this.playlist.length === 0) return
    const elapsed = this.elapsed()
    // Comportamento standard: se siamo oltre 3 s, riparte dall'inizio.
    if (elapsed > 3) {
      await this.playAt(this.index)
    } else {
      await this.playAt((this.index - 1 + this.playlist.length) % this.playlist.length)
    }
  }

  pause(): void {
    if (!this.current || !this.playing) return
    const elapsed = this.elapsed()
    this.stopCurrent(0.15)
    // Ricorda l'offset per la ripresa: la sorgente verrà ricreata,
    // perché un AudioBufferSourceNode non è riavviabile.
    this.current = null
    this.pausedState = { index: this.index, offset: elapsed }
    this.setPlaying(false)
  }

  private pausedState: { index: number; offset: number } | null = null

  async resume(): Promise<void> {
    if (this.playing) return
    if (this.pausedState && this.pausedState.index === this.index) {
      await this.startTrack(this.index, this.pausedState.offset, 0.15)
    } else if (this.playlist.length > 0) {
      await this.playAt(this.index >= 0 ? this.index : 0)
    }
  }

  async toggle(): Promise<void> {
    if (this.playing) this.pause()
    else await this.resume()
  }

  async seek(seconds: number): Promise<void> {
    if (this.index < 0) return
    const wasPlaying = this.playing
    if (wasPlaying) {
      await this.startTrack(this.index, seconds, 0.05)
    } else {
      this.pausedState = { index: this.index, offset: seconds }
      const buf = await this.decode(this.playlist[this.index])
      this.events.onTimeUpdate?.(seconds, buf.duration)
    }
  }

  stop(): void {
    this.stopCurrent(0.15)
    this.current = null
    this.pausedState = null
    this.setPlaying(false)
  }

  dispose(): void {
    this.stop()
    if (this.watcher) clearInterval(this.watcher)
    this.decodeCache.clear()
  }

  /* ------------------------------------------------------------------ */
  /* Motore interno                                                      */
  /* ------------------------------------------------------------------ */

  private elapsed(): number {
    if (!this.current) return this.pausedState?.offset ?? 0
    return this.current.offset + (this.ctx.currentTime - this.current.startedAt)
  }

  private setPlaying(v: boolean): void {
    if (this.playing === v) return
    this.playing = v
    this.events.onPlayStateChange?.(v)
    if (v) this.startWatcher()
  }

  private async decode(track: Track): Promise<AudioBuffer> {
    let promise = this.decodeCache.get(track.id)
    if (!promise) {
      promise = track.blob
        .arrayBuffer()
        .then((ab) => this.ctx.decodeAudioData(ab))
      this.decodeCache.set(track.id, promise)
      promise.catch(() => this.decodeCache.delete(track.id))
      // Cache FIFO: elimina la voce più vecchia oltre la capienza.
      while (this.decodeCache.size > DECODE_CACHE_SIZE) {
        const oldest = this.decodeCache.keys().next().value
        if (oldest === undefined) break
        this.decodeCache.delete(oldest)
      }
    }
    return promise
  }

  /**
   * Avvia una traccia con fade-in, applicando il fade-out alla sorgente
   * precedente (se presente): è il cuore del crossfade.
   */
  private async startTrack(
    index: number,
    offset: number,
    fadeSeconds: number,
    attempts = 0,
  ): Promise<void> {
    const track = this.playlist[index]
    if (!track) return
    const generation = ++this.generation

    let buffer: AudioBuffer
    try {
      buffer = await this.decode(track)
    } catch {
      this.events.onError?.(`Impossibile decodificare "${track.name}"`)
      // Salta alla traccia successiva; il contatore di tentativi evita
      // il loop infinito quando tutte le tracce sono illeggibili.
      if (
        attempts + 1 < this.playlist.length &&
        generation === this.generation
      ) {
        await this.startTrack(
          (index + 1) % this.playlist.length,
          0,
          fadeSeconds,
          attempts + 1,
        )
      } else {
        this.setPlaying(false)
      }
      return
    }
    // Nel frattempo è partita un'altra richiesta: questa è obsoleta.
    if (generation !== this.generation) return

    const now = this.ctx.currentTime
    const fade = Math.max(0.03, Math.min(fadeSeconds, buffer.duration / 2))

    // Fade-out equal-power della sorgente precedente.
    const old = this.current
    if (old) {
      // Legge il livello udibile PRIMA di cancellare le automazioni:
      // cancellare una curva in corso fa tornare il param al valore iniziale.
      const level = old.gain.gain.value
      old.gain.gain.cancelScheduledValues(now)
      old.gain.gain.setValueCurveAtTime(
        scaleCurve(this.curves.fadeOut, level),
        now,
        fade,
      )
      const oldSource = old.source
      oldSource.onended = null
      try {
        oldSource.stop(now + fade + 0.05)
      } catch {
        /* già fermata */
      }
      setTimeout(
        () => {
          oldSource.disconnect()
          old.gain.disconnect()
        },
        (fade + 0.2) * 1000,
      )
    }

    // Nuova sorgente con fade-in.
    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    const gain = this.ctx.createGain()
    gain.gain.setValueCurveAtTime(this.curves.fadeIn, now, fade)
    source.connect(gain).connect(this.destination)
    const startOffset = Math.min(Math.max(0, offset), Math.max(0, buffer.duration - 0.1))
    source.start(now, startOffset)

    this.current = {
      source,
      gain,
      buffer,
      trackId: track.id,
      startedAt: now,
      offset: startOffset,
    }
    this.index = index
    this.pausedState = null
    this.advancing = false
    this.setPlaying(true)
    this.events.onTrackChange?.(index, track)

    // Pre-decodifica la prossima traccia così il crossfade non attende I/O.
    const nextTrack = this.playlist[(index + 1) % this.playlist.length]
    if (nextTrack && nextTrack.id !== track.id) {
      void this.decode(nextTrack).catch(() => {})
    }
  }

  private stopCurrent(fadeSeconds: number): void {
    const cur = this.current
    if (!cur) return
    this.generation++
    const now = this.ctx.currentTime
    cur.source.onended = null
    cur.gain.gain.cancelScheduledValues(now)
    cur.gain.gain.setTargetAtTime(0, now, fadeSeconds / 3)
    try {
      cur.source.stop(now + fadeSeconds + 0.1)
    } catch {
      /* già fermata */
    }
    setTimeout(
      () => {
        cur.source.disconnect()
        cur.gain.disconnect()
      },
      (fadeSeconds + 0.3) * 1000,
    )
  }

  /**
   * Watcher a bassa frequenza: emette il tempo corrente e fa partire
   * il crossfade automatico quando mancano CROSSFADE_SECONDS alla fine.
   */
  private startWatcher(): void {
    if (this.watcher) return
    this.watcher = setInterval(() => {
      if (!this.playing || !this.current) return
      const elapsed = this.elapsed()
      const duration = this.current.buffer.duration
      this.events.onTimeUpdate?.(Math.min(elapsed, duration), duration)

      const remaining = duration - elapsed
      if (remaining <= CROSSFADE_SECONDS && !this.advancing) {
        this.advancing = true
        const nextIndex = (this.index + 1) % this.playlist.length
        const fade = Math.max(0.3, Math.min(CROSSFADE_SECONDS, remaining))
        void this.startTrack(nextIndex, 0, fade)
      }
    }, 200)
  }
}

/** Scala una curva di fade per partire dal valore di gain attuale. */
function scaleCurve(curve: Float32Array, from: number): Float32Array {
  const scaled = new Float32Array(curve.length)
  for (let i = 0; i < curve.length; i++) scaled[i] = curve[i] * from
  return scaled
}
