/*
  Grafo audio condiviso dell'app.

  Topologia:
    musicBus  ─┐
               ├─► masterGain ─► analyser ─► destination
    ambientBus┘

  L'AudioContext viene creato pigramente (lazy) alla prima interazione
  dell'utente, per rispettare le autoplay policy dei browser.
*/

export interface AudioGraph {
  ctx: AudioContext
  /** Bus della musica: qui si aggancia il player delle tracce (e il ducking del Pomodoro). */
  musicBus: GainNode
  /** Bus dei suoni ambientali: qui si aggancia l'AmbientSoundEngine. */
  ambientBus: GainNode
  masterGain: GainNode
  /** AnalyserNode a valle del master: alimenta il visualizer. */
  analyser: AnalyserNode
}

let graph: AudioGraph | null = null

export function getAudioGraph(): AudioGraph {
  if (graph) return graph

  const ctx = new AudioContext()
  const musicBus = ctx.createGain()
  const ambientBus = ctx.createGain()
  const masterGain = ctx.createGain()
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 256
  analyser.smoothingTimeConstant = 0.82

  musicBus.connect(masterGain)
  ambientBus.connect(masterGain)
  masterGain.connect(analyser)
  analyser.connect(ctx.destination)

  graph = { ctx, musicBus, ambientBus, masterGain, analyser }
  return graph
}

/** Riattiva il contesto se il browser l'ha sospeso (va chiamata dentro un gesto utente). */
export async function resumeAudio(): Promise<void> {
  const g = getAudioGraph()
  if (g.ctx.state === 'suspended') await g.ctx.resume()
}

/**
 * Rampa dolce di un GainNode verso un valore target.
 * setTargetAtTime evita click/pop udibili nei cambi di volume.
 */
export function rampGain(
  ctx: BaseAudioContext,
  gain: GainNode,
  target: number,
  seconds = 0.08,
): void {
  gain.gain.cancelScheduledValues(ctx.currentTime)
  gain.gain.setTargetAtTime(target, ctx.currentTime, seconds)
}
