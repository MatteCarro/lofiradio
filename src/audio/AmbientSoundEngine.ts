/*
  AmbientSoundEngine — sintesi pura di suoni ambientali via Web Audio API.

  Nessun campione scaricato: tutto è generato proceduralmente a partire da
  rumore (bianco/rosa/marrone) filtrato, più "grani" transienti schedulati
  (gocce di pioggia, scoppiettii del fuoco, tintinnii di tazze).

  La classe è indipendente dalla UI: riceve un AudioContext e un nodo di
  destinazione nel costruttore, quindi è testabile anche con un
  OfflineAudioContext.
*/

export type AmbientLayerId =
  | 'rain'
  | 'white'
  | 'pink'
  | 'vinyl'
  | 'fire'
  | 'cafe'

export interface AmbientLayerInfo {
  id: AmbientLayerId
  label: string
}

export const AMBIENT_LAYERS: AmbientLayerInfo[] = [
  { id: 'rain', label: 'Pioggia' },
  { id: 'fire', label: 'Fuoco' },
  { id: 'cafe', label: 'Caffetteria' },
  { id: 'vinyl', label: 'Vinile' },
  { id: 'pink', label: 'Rumore rosa' },
  { id: 'white', label: 'Rumore bianco' },
]

/** Nodi attivi di un layer, con la funzione di cleanup per fermarlo. */
interface RunningLayer {
  gain: GainNode
  stop: () => void
}

/**
 * Scheduler "lookahead" per eventi transienti casuali (gocce, crepitii...).
 * Un setInterval JS a bassa frequenza pianifica gli eventi con anticipo
 * sul clock preciso dell'AudioContext: il timing resta accurato anche se
 * il main thread è occupato.
 */
class TransientScheduler {
  private timer: ReturnType<typeof setInterval> | null = null
  private nextTime = 0
  private readonly ctx: BaseAudioContext
  private readonly schedule: (when: number) => void
  private readonly nextDelay: () => number
  private readonly lookahead: number

  constructor(
    ctx: BaseAudioContext,
    schedule: (when: number) => void,
    nextDelay: () => number,
    lookahead = 0.3,
  ) {
    this.ctx = ctx
    this.schedule = schedule
    this.nextDelay = nextDelay
    this.lookahead = lookahead
  }

  start(): void {
    if (this.timer) return
    this.nextTime = this.ctx.currentTime + 0.05
    this.timer = setInterval(() => {
      while (this.nextTime < this.ctx.currentTime + this.lookahead) {
        this.schedule(this.nextTime)
        this.nextTime += this.nextDelay()
      }
    }, 80)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}

const rand = (min: number, max: number) => min + Math.random() * (max - min)

export class AmbientSoundEngine {
  private readonly output: GainNode
  private readonly layers = new Map<AmbientLayerId, RunningLayer>()
  private readonly volumes = new Map<AmbientLayerId, number>()

  /* Buffer di rumore creati una sola volta e riusati da tutti i layer. */
  private whiteBuffer: AudioBuffer | null = null
  private pinkBuffer: AudioBuffer | null = null
  private brownBuffer: AudioBuffer | null = null
  /** Piccolo "grano" di rumore con inviluppo a decadimento già impresso. */
  private grainBuffer: AudioBuffer | null = null

  private readonly ctx: AudioContext

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx
    this.output = ctx.createGain()
    this.output.connect(destination)
  }

  /* ------------------------------------------------------------------ */
  /* API pubblica                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Imposta il volume (0..1) di un layer. A volume > 0 il layer viene
   * avviato se necessario; a volume 0 viene fermato e smontato.
   */
  setVolume(id: AmbientLayerId, volume: number): void {
    const v = Math.min(1, Math.max(0, volume))
    this.volumes.set(id, v)

    if (v === 0) {
      this.stopLayer(id)
      return
    }

    let layer = this.layers.get(id)
    if (!layer) {
      layer = this.startLayer(id)
      this.layers.set(id, layer)
    }
    // Curva quadratica: più risoluzione percepita sui volumi bassi.
    const t = this.ctx.currentTime
    layer.gain.gain.cancelScheduledValues(t)
    layer.gain.gain.setTargetAtTime(v * v, t, 0.1)
  }

  getVolume(id: AmbientLayerId): number {
    return this.volumes.get(id) ?? 0
  }

  isActive(id: AmbientLayerId): boolean {
    return this.layers.has(id)
  }

  /** Ferma tutti i layer e rilascia i nodi. */
  dispose(): void {
    for (const id of [...this.layers.keys()]) this.stopLayer(id)
    this.output.disconnect()
  }

  /* ------------------------------------------------------------------ */
  /* Gestione layer                                                      */
  /* ------------------------------------------------------------------ */

  private startLayer(id: AmbientLayerId): RunningLayer {
    // Ogni layer esce da un proprio GainNode (lo slider del mixer)
    // collegato al bus d'uscita dell'engine.
    const gain = this.ctx.createGain()
    gain.gain.value = 0
    gain.connect(this.output)

    const stops: Array<() => void> = []
    switch (id) {
      case 'white':
        stops.push(this.buildWhite(gain))
        break
      case 'pink':
        stops.push(this.buildPink(gain))
        break
      case 'rain':
        stops.push(this.buildRain(gain))
        break
      case 'vinyl':
        stops.push(this.buildVinyl(gain))
        break
      case 'fire':
        stops.push(this.buildFire(gain))
        break
      case 'cafe':
        stops.push(this.buildCafe(gain))
        break
    }

    return {
      gain,
      stop: () => {
        for (const s of stops) s()
        gain.disconnect()
      },
    }
  }

  private stopLayer(id: AmbientLayerId): void {
    const layer = this.layers.get(id)
    if (!layer) return
    this.layers.delete(id)
    // Breve fade-out prima dello smontaggio per evitare click.
    const t = this.ctx.currentTime
    layer.gain.gain.cancelScheduledValues(t)
    layer.gain.gain.setTargetAtTime(0, t, 0.06)
    setTimeout(() => layer.stop(), 400)
  }

  /* ------------------------------------------------------------------ */
  /* Generatori di buffer di rumore                                      */
  /* ------------------------------------------------------------------ */

  private getWhiteBuffer(): AudioBuffer {
    if (this.whiteBuffer) return this.whiteBuffer
    const len = this.ctx.sampleRate * 2
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    this.whiteBuffer = buf
    return buf
  }

  private getPinkBuffer(): AudioBuffer {
    if (this.pinkBuffer) return this.pinkBuffer
    const len = this.ctx.sampleRate * 4
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    // Rumore rosa con l'approssimazione a filtri di Paul Kellet:
    // somma di 7 filtri passa-basso del primo ordine con costanti di tempo
    // scalate, che produce uno spettro ~ -3 dB/ottava.
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.969 * b2 + white * 0.153852
      b3 = 0.8665 * b3 + white * 0.3104856
      b4 = 0.55 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.016898
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    }
    this.pinkBuffer = buf
    return buf
  }

  private getBrownBuffer(): AudioBuffer {
    if (this.brownBuffer) return this.brownBuffer
    const len = this.ctx.sampleRate * 4
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    // Rumore marrone (browniano): integrazione "leaky" del rumore bianco.
    // Il fattore 0.02 limita la deriva, il *3.5 recupera il livello.
    let last = 0
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    }
    this.brownBuffer = buf
    return buf
  }

  /** Grano di rumore di ~80 ms con decadimento esponenziale impresso nel buffer. */
  private getGrainBuffer(): AudioBuffer {
    if (this.grainBuffer) return this.grainBuffer
    const len = Math.floor(this.ctx.sampleRate * 0.08)
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      const env = Math.exp((-5 * i) / len)
      data[i] = (Math.random() * 2 - 1) * env
    }
    this.grainBuffer = buf
    return buf
  }

  /** Sorgente in loop da un buffer, restituisce la funzione di stop. */
  private loopSource(buffer: AudioBuffer, dest: AudioNode): () => void {
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true
    // Piccola variazione di velocità per mascherare la ripetizione del loop.
    src.playbackRate.value = rand(0.98, 1.02)
    src.connect(dest)
    src.start()
    return () => {
      try {
        src.stop()
      } catch {
        /* già fermato */
      }
      src.disconnect()
    }
  }

  /* ------------------------------------------------------------------ */
  /* Layer: rumore bianco / rosa                                         */
  /* ------------------------------------------------------------------ */

  private buildWhite(out: GainNode): () => void {
    const trim = this.ctx.createGain()
    trim.gain.value = 0.35
    trim.connect(out)
    const stop = this.loopSource(this.getWhiteBuffer(), trim)
    return () => {
      stop()
      trim.disconnect()
    }
  }

  private buildPink(out: GainNode): () => void {
    const trim = this.ctx.createGain()
    trim.gain.value = 0.5
    trim.connect(out)
    const stop = this.loopSource(this.getPinkBuffer(), trim)
    return () => {
      stop()
      trim.disconnect()
    }
  }

  /* ------------------------------------------------------------------ */
  /* Layer: pioggia                                                      */
  /* ------------------------------------------------------------------ */

  private buildRain(out: GainNode): () => void {
    // "Letto" della pioggia: rumore rosa passa-basso — il fruscio continuo
    // dell'acqua che cade, senza le frequenze acute del rumore puro.
    const bedFilter = this.ctx.createBiquadFilter()
    bedFilter.type = 'lowpass'
    bedFilter.frequency.value = 1300
    bedFilter.Q.value = 0.6
    const bedGain = this.ctx.createGain()
    bedGain.gain.value = 0.55
    bedFilter.connect(bedGain).connect(out)
    const stopBed = this.loopSource(this.getPinkBuffer(), bedFilter)

    // "Scroscio" acuto: rumore bianco passa-alto molto attenuato,
    // simula il ticchettio diffuso sulle superfici.
    const hissFilter = this.ctx.createBiquadFilter()
    hissFilter.type = 'highpass'
    hissFilter.frequency.value = 3500
    const hissGain = this.ctx.createGain()
    hissGain.gain.value = 0.09
    hissFilter.connect(hissGain).connect(out)
    const stopHiss = this.loopSource(this.getWhiteBuffer(), hissFilter)

    // Gocce singole: grani di rumore filtrati passa-banda a frequenza
    // casuale — ogni goccia "risuona" a un'altezza diversa.
    const grain = this.getGrainBuffer()
    const scheduler = new TransientScheduler(
      this.ctx,
      (when) => {
        const src = this.ctx.createBufferSource()
        src.buffer = grain
        src.playbackRate.value = rand(0.6, 1.6)
        const bp = this.ctx.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.value = rand(1200, 5500)
        bp.Q.value = rand(6, 14)
        const g = this.ctx.createGain()
        g.gain.value = rand(0.1, 0.45)
        src.connect(bp).connect(g).connect(out)
        src.start(when)
        src.onended = () => {
          src.disconnect()
          bp.disconnect()
          g.disconnect()
        }
      },
      () => rand(0.03, 0.14),
    )
    scheduler.start()

    return () => {
      scheduler.stop()
      stopBed()
      stopHiss()
      bedFilter.disconnect()
      bedGain.disconnect()
      hissFilter.disconnect()
      hissGain.disconnect()
    }
  }

  /* ------------------------------------------------------------------ */
  /* Layer: vinyl crackle                                                */
  /* ------------------------------------------------------------------ */

  private buildVinyl(out: GainNode): () => void {
    // Fruscio di fondo del solco: rumore rosa passa-alto, molto tenue.
    const hissFilter = this.ctx.createBiquadFilter()
    hissFilter.type = 'highpass'
    hissFilter.frequency.value = 2200
    const hissGain = this.ctx.createGain()
    hissGain.gain.value = 0.12
    hissFilter.connect(hissGain).connect(out)
    const stopHiss = this.loopSource(this.getPinkBuffer(), hissFilter)

    // Crackle: buffer di ~8 s con impulsi sparsi generati proceduralmente.
    // Ogni "tick" è un impulso con decadimento esponenziale di 5–60 campioni;
    // la probabilità bassa li rende irregolari come polvere sul disco.
    const sr = this.ctx.sampleRate
    const len = sr * 8
    const buf = this.ctx.createBuffer(1, len, sr)
    const data = buf.getChannelData(0)
    let i = 0
    while (i < len) {
      if (Math.random() < 0.00012) {
        const tickLen = Math.floor(rand(5, 60))
        const amp = rand(0.1, 0.9) * (Math.random() < 0.08 ? 1.6 : 1)
        const sign = Math.random() < 0.5 ? -1 : 1
        for (let j = 0; j < tickLen && i + j < len; j++) {
          data[i + j] += sign * amp * Math.exp((-6 * j) / tickLen)
        }
        i += tickLen
      } else {
        i++
      }
    }
    // Passa-banda largo: toglie sia il DC dei pop sia l'eccesso di acuti.
    const crackleFilter = this.ctx.createBiquadFilter()
    crackleFilter.type = 'bandpass'
    crackleFilter.frequency.value = 3200
    crackleFilter.Q.value = 0.4
    const crackleGain = this.ctx.createGain()
    crackleGain.gain.value = 0.8
    crackleFilter.connect(crackleGain).connect(out)
    const stopCrackle = this.loopSource(buf, crackleFilter)

    return () => {
      stopHiss()
      stopCrackle()
      hissFilter.disconnect()
      hissGain.disconnect()
      crackleFilter.disconnect()
      crackleGain.disconnect()
    }
  }

  /* ------------------------------------------------------------------ */
  /* Layer: fuoco scoppiettante                                          */
  /* ------------------------------------------------------------------ */

  private buildFire(out: GainNode): () => void {
    // Rombo di base: rumore marrone passa-basso = la "massa" del fuoco.
    const roarFilter = this.ctx.createBiquadFilter()
    roarFilter.type = 'lowpass'
    roarFilter.frequency.value = 380
    const roarGain = this.ctx.createGain()
    roarGain.gain.value = 0.75
    roarFilter.connect(roarGain).connect(out)
    const stopRoar = this.loopSource(this.getBrownBuffer(), roarFilter)

    // LFO lento sulla frequenza del filtro: il "respiro" delle fiamme.
    const lfo = this.ctx.createOscillator()
    lfo.frequency.value = 0.18
    const lfoDepth = this.ctx.createGain()
    lfoDepth.gain.value = 110
    lfo.connect(lfoDepth).connect(roarFilter.frequency)
    lfo.start()

    // Scoppiettii: grani di rumore passa-banda con intervalli irregolari;
    // ogni tanto (per il ~12% degli eventi) un pop più grave e forte.
    const grain = this.getGrainBuffer()
    const scheduler = new TransientScheduler(
      this.ctx,
      (when) => {
        const big = Math.random() < 0.12
        const src = this.ctx.createBufferSource()
        src.buffer = grain
        src.playbackRate.value = big ? rand(0.35, 0.6) : rand(0.7, 1.4)
        const bp = this.ctx.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.value = big ? rand(500, 1100) : rand(1200, 3400)
        bp.Q.value = rand(1.5, 4)
        const g = this.ctx.createGain()
        g.gain.value = big ? rand(0.7, 1.2) : rand(0.15, 0.5)
        src.connect(bp).connect(g).connect(out)
        src.start(when)
        src.onended = () => {
          src.disconnect()
          bp.disconnect()
          g.disconnect()
        }
      },
      () => rand(0.06, 0.55),
    )
    scheduler.start()

    return () => {
      scheduler.stop()
      stopRoar()
      lfo.stop()
      lfo.disconnect()
      lfoDepth.disconnect()
      roarFilter.disconnect()
      roarGain.disconnect()
    }
  }

  /* ------------------------------------------------------------------ */
  /* Layer: caffetteria                                                  */
  /* ------------------------------------------------------------------ */

  private buildCafe(out: GainNode): () => void {
    // Brusio di voci: rumore rosa in un passa-banda stretto sulle
    // frequenze del parlato. Due LFO lenti e non correlati muovono
    // la frequenza centrale e l'ampiezza: l'effetto è quel mormorio
    // che "ondeggia" senza parole distinguibili.
    const murmurFilter = this.ctx.createBiquadFilter()
    murmurFilter.type = 'bandpass'
    murmurFilter.frequency.value = 550
    murmurFilter.Q.value = 1.1
    const murmurGain = this.ctx.createGain()
    murmurGain.gain.value = 0.5
    murmurFilter.connect(murmurGain).connect(out)
    const stopMurmur = this.loopSource(this.getPinkBuffer(), murmurFilter)

    const freqLfo = this.ctx.createOscillator()
    freqLfo.frequency.value = 0.11
    const freqDepth = this.ctx.createGain()
    freqDepth.gain.value = 220
    freqLfo.connect(freqDepth).connect(murmurFilter.frequency)
    freqLfo.start()

    const ampLfo = this.ctx.createOscillator()
    ampLfo.frequency.value = 0.07
    const ampDepth = this.ctx.createGain()
    ampDepth.gain.value = 0.15
    ampLfo.connect(ampDepth).connect(murmurGain.gain)
    ampLfo.start()

    // Rumore di sala: letto passa-basso molto tenue (sedie, passi, fondo).
    const roomFilter = this.ctx.createBiquadFilter()
    roomFilter.type = 'lowpass'
    roomFilter.frequency.value = 300
    const roomGain = this.ctx.createGain()
    roomGain.gain.value = 0.25
    roomFilter.connect(roomGain).connect(out)
    const stopRoom = this.loopSource(this.getBrownBuffer(), roomFilter)

    // Tintinnii di tazze/cucchiaini: brevi sinusoidi acute con decadimento
    // esponenziale, sparse nello stereo, a intervalli di qualche secondo.
    const scheduler = new TransientScheduler(
      this.ctx,
      (when) => {
        const osc = this.ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = rand(1800, 4200)
        const env = this.ctx.createGain()
        env.gain.setValueAtTime(0, when)
        env.gain.linearRampToValueAtTime(rand(0.04, 0.12), when + 0.005)
        env.gain.exponentialRampToValueAtTime(0.0001, when + rand(0.12, 0.3))
        const pan = this.ctx.createStereoPanner()
        pan.pan.value = rand(-0.8, 0.8)
        osc.connect(env).connect(pan).connect(out)
        osc.start(when)
        osc.stop(when + 0.4)
        osc.onended = () => {
          osc.disconnect()
          env.disconnect()
          pan.disconnect()
        }
      },
      () => rand(2.5, 11),
    )
    scheduler.start()

    return () => {
      scheduler.stop()
      stopMurmur()
      stopRoom()
      freqLfo.stop()
      ampLfo.stop()
      freqLfo.disconnect()
      freqDepth.disconnect()
      ampLfo.disconnect()
      ampDepth.disconnect()
      murmurFilter.disconnect()
      murmurGain.disconnect()
      roomFilter.disconnect()
      roomGain.disconnect()
    }
  }
}
