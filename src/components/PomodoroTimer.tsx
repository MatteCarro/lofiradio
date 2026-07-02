import { useEffect, useRef, useState } from 'react'
import { PauseIcon, TimerIcon } from './icons'

interface PomodoroTimerProps {
  /** Fine sessione di lavoro: se duck=true App abbassa la musica per la pausa. */
  onWorkEnd: (duck: boolean) => void
  /** Fine pausa (o reset durante la pausa): App ripristina il volume. */
  onBreakEnd: () => void
  duckEnabled: boolean
  onDuckEnabledChange: (v: boolean) => void
}

const WORK_SECONDS = 25 * 60
const BREAK_SECONDS = 5 * 60

type Phase = 'work' | 'break'

function format(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

/* Timer Pomodoro 25/5 con anello di avanzamento e auto-ciclo. */
export function PomodoroTimer({
  onWorkEnd,
  onBreakEnd,
  duckEnabled,
  onDuckEnabledChange,
}: PomodoroTimerProps) {
  const [phase, setPhase] = useState<Phase>('work')
  const [running, setRunning] = useState(false)
  const [remaining, setRemaining] = useState(WORK_SECONDS)
  const [cycles, setCycles] = useState(0)
  /** Timestamp di fine fase: il conteggio resta esatto anche se il tab rallenta. */
  const endAtRef = useRef(0)
  const phaseRef = useRef<Phase>('work')
  phaseRef.current = phase

  useEffect(() => {
    if (!running) return
    const tick = setInterval(() => {
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) {
        if (phaseRef.current === 'work') {
          onWorkEnd(duckEnabled)
          setPhase('break')
          endAtRef.current = Date.now() + BREAK_SECONDS * 1000
          setRemaining(BREAK_SECONDS)
        } else {
          onBreakEnd()
          setCycles((c) => c + 1)
          setPhase('work')
          endAtRef.current = Date.now() + WORK_SECONDS * 1000
          setRemaining(WORK_SECONDS)
        }
      }
    }, 250)
    return () => clearInterval(tick)
  }, [running, duckEnabled, onWorkEnd, onBreakEnd])

  const start = () => {
    endAtRef.current = Date.now() + remaining * 1000
    setRunning(true)
  }

  const pause = () => setRunning(false)

  const reset = () => {
    setRunning(false)
    if (phase === 'break') onBreakEnd()
    setPhase('work')
    setRemaining(WORK_SECONDS)
  }

  const total = phase === 'work' ? WORK_SECONDS : BREAK_SECONDS
  const progress = 1 - remaining / total
  const R = 44
  const C = 2 * Math.PI * R

  return (
    <section className="glass flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-ink-dim uppercase">
          <TimerIcon className="size-4" />
          Pomodoro
        </h2>
        {cycles > 0 && (
          <span className="text-xs text-ink-dim">
            {cycles} {cycles === 1 ? 'ciclo' : 'cicli'}
          </span>
        )}
      </div>

      <div className="flex items-center justify-center gap-6">
        {/* Anello di avanzamento */}
        <div className="relative size-28">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke="var(--c-panel-border)"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={phase === 'work' ? 'var(--c-amber)' : 'var(--c-night)'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              style={{ transition: 'stroke-dashoffset 0.3s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold tabular-nums">{format(remaining)}</span>
            <span className="text-[11px] text-ink-dim">
              {phase === 'work' ? 'Concentrazione' : 'Pausa'}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={running ? pause : start}
            className="flex h-11 min-w-24 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-amber to-terra px-4 text-sm font-semibold text-bg-1 transition hover:brightness-110 active:scale-95"
          >
            {running ? <PauseIcon className="size-4" /> : null}
            {running ? 'Pausa' : 'Avvia'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="flex h-11 min-w-24 items-center justify-center rounded-full border border-panel-border px-4 text-sm text-ink-dim transition hover:bg-panel active:scale-95"
          >
            Azzera
          </button>
        </div>
      </div>

      {/* Opzione ducking: a fine sessione abbassa la musica durante la pausa */}
      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm">
        <span className="text-ink-dim">Abbassa la musica durante la pausa</span>
        <input
          type="checkbox"
          checked={duckEnabled}
          onChange={(e) => onDuckEnabledChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="relative h-7 w-12 shrink-0 rounded-full bg-panel-border transition peer-checked:bg-amber after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-ink after:transition peer-checked:after:translate-x-5 peer-checked:after:bg-bg-1" />
      </label>
    </section>
  )
}
