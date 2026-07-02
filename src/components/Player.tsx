import { Visualizer } from './Visualizer'
import { MusicNoteIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon } from './icons'

interface PlayerProps {
  trackName: string | null
  playing: boolean
  elapsed: number
  duration: number
  musicVolume: number
  analyser: AnalyserNode | null
  onToggle: () => void
  onNext: () => void
  onPrev: () => void
  onSeek: (seconds: number) => void
  onMusicVolume: (v: number) => void
}

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

/* Player centrale: vinile animato, visualizer, trasporto e volume musica. */
export function Player({
  trackName,
  playing,
  elapsed,
  duration,
  musicVolume,
  analyser,
  onToggle,
  onNext,
  onPrev,
  onSeek,
  onMusicVolume,
}: PlayerProps) {
  return (
    <section className="glass flex flex-col items-center gap-4 p-6 sm:p-8">
      {/* Vinile: la rotazione CSS resta fluida e si mette in pausa
          senza scatti grazie ad animation-play-state. */}
      <div className="relative">
        <div
          className="animate-spin-vinyl size-52 rounded-full sm:size-64"
          style={{
            animationPlayState: playing ? 'running' : 'paused',
            background:
              'repeating-radial-gradient(circle at 50% 50%, #16161d 0 2px, #1f1f28 2px 4px)',
            boxShadow:
              '0 0 0 6px rgba(0,0,0,0.35), 0 18px 48px rgba(0,0,0,0.45), inset 0 0 24px rgba(255,255,255,0.05)',
          }}
        >
          {/* Etichetta centrale */}
          <div className="absolute inset-0 m-auto flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-amber to-terra sm:size-24">
            <div className="size-3 rounded-full bg-bg-1" />
          </div>
          {/* Riflesso */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                'conic-gradient(from 210deg, transparent 0deg, rgba(255,255,255,0.07) 40deg, transparent 90deg, transparent 180deg, rgba(255,255,255,0.05) 230deg, transparent 270deg)',
            }}
          />
        </div>
        {playing && (
          <div className="pointer-events-none absolute -inset-3 -z-10 rounded-full bg-glow blur-2xl" />
        )}
      </div>

      {/* Titolo traccia */}
      <div className="flex min-h-12 flex-col items-center justify-center text-center">
        {trackName ? (
          <p className="max-w-64 truncate text-lg font-semibold sm:max-w-96">
            {trackName}
          </p>
        ) : (
          <p className="flex items-center gap-2 text-ink-dim">
            <MusicNoteIcon className="size-5" />
            Aggiungi brani alla playlist per iniziare
          </p>
        )}
      </div>

      {/* Visualizer reattivo */}
      <Visualizer analyser={analyser} className="h-16 w-full" />

      {/* Barra di avanzamento */}
      <div className="flex w-full items-center gap-3 text-xs text-ink-dim tabular-nums">
        <span className="w-10 text-right">{formatTime(elapsed)}</span>
        <input
          type="range"
          className="slider-h flex-1"
          min={0}
          max={Math.max(1, duration)}
          step={0.1}
          value={Math.min(elapsed, duration)}
          onChange={(e) => onSeek(Number(e.target.value))}
          disabled={!trackName}
          aria-label="Posizione nella traccia"
        />
        <span className="w-10">{formatTime(duration)}</span>
      </div>

      {/* Controlli di trasporto (target touch ≥ 44px) */}
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={onPrev}
          disabled={!trackName}
          className="flex size-12 items-center justify-center rounded-full text-ink transition hover:bg-panel active:scale-95 disabled:opacity-30"
          aria-label="Traccia precedente"
        >
          <PrevIcon className="size-6" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          disabled={!trackName}
          className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-amber to-terra text-bg-1 shadow-lg shadow-glow transition hover:brightness-110 active:scale-95 disabled:opacity-30"
          aria-label={playing ? 'Pausa' : 'Riproduci'}
        >
          {playing ? (
            <PauseIcon className="size-7" />
          ) : (
            <PlayIcon className="ml-1 size-7" />
          )}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!trackName}
          className="flex size-12 items-center justify-center rounded-full text-ink transition hover:bg-panel active:scale-95 disabled:opacity-30"
          aria-label="Traccia successiva"
        >
          <NextIcon className="size-6" />
        </button>
      </div>

      {/* Volume musica */}
      <div className="flex w-full max-w-72 items-center gap-3">
        <MusicNoteIcon className="size-5 shrink-0 text-ink-dim" />
        <input
          type="range"
          className="slider-h flex-1"
          min={0}
          max={1}
          step={0.01}
          value={musicVolume}
          onChange={(e) => onMusicVolume(Number(e.target.value))}
          aria-label="Volume musica"
        />
      </div>
    </section>
  )
}
