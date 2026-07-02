import { useCallback, useEffect, useRef, useState } from 'react'
import * as db from '../db/db'
import {
  CloseIcon,
  ExternalVideoIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  WifiOffIcon,
} from './icons'

/*
  Sezione "Playlist YouTube" — DELIBERATAMENTE separata dal motore audio
  dell'app (AudioContext/crossfade/mixer/visualizer). Usa esclusivamente
  il player IFrame ufficiale di YouTube (nessuna estrazione o download
  dell'audio, che violerebbe i Termini di Servizio di YouTube): il player
  resta visibile, come richiesto dai ToS.

  Conseguenze pratiche di questa scelta:
  - richiede una connessione a Internet, quindi non funziona offline;
  - non passa dal bus audio dell'app: niente crossfade, niente somma con
    i suoni ambientali, niente analisi per il visualizer.
  Lo script dell'API viene caricato solo quando l'utente apre questa
  sezione, per non generare traffico di rete non necessario per chi non
  la usa.
*/

let apiPromise: Promise<void> | null = null

function loadYouTubeApi(): Promise<void> {
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve, reject) => {
    if (window.YT?.Player) {
      resolve()
      return
    }
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve()
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.onerror = () => reject(new Error('load-failed'))
    document.head.appendChild(script)
  })
  return apiPromise
}

/** Estrae l'ID playlist da un URL YouTube (?list=...) o lo accetta già come ID grezzo. */
function extractPlaylistId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    const list = url.searchParams.get('list')
    if (list) return list
  } catch {
    /* non è un URL assoluto: proviamo a trattarlo come ID diretto */
  }
  // Un ID playlist reale (es. "PLrAXtMErZ...") è alfanumerico misto:
  // richiediamo almeno una maiuscola o una cifra per scartare testo libero
  // (tipo frasi con trattini) inserito per errore.
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed) && /[A-Z0-9]/.test(trimmed)) return trimmed
  return null
}

interface YouTubePlaylistProps {
  onClose: () => void
}

export function YouTubePlaylist({ onClose }: YouTubePlaylistProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YT.Player | null>(null)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  useEffect(() => {
    void db.getPref('youtubePlaylistInput', '').then((v) => {
      if (v) setInput(v)
    })
  }, [])

  useEffect(() => {
    return () => {
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [])

  const loadPlaylist = useCallback(async () => {
    const id = extractPlaylistId(input)
    if (!id) {
      setError('Incolla il link (o l’ID) di una playlist YouTube valida')
      setStatus('error')
      return
    }
    if (!navigator.onLine) {
      setError('Sei offline: questa sezione richiede una connessione a Internet')
      setStatus('error')
      return
    }

    setStatus('loading')
    setError(null)
    void db.setPref('youtubePlaylistInput', input)

    try {
      await loadYouTubeApi()
    } catch {
      setError('Impossibile contattare YouTube (rete assente o bloccata)')
      setStatus('error')
      return
    }

    if (playerRef.current) {
      playerRef.current.loadPlaylist({ list: id, listType: 'playlist' })
      return
    }
    if (!mountRef.current) return

    playerRef.current = new window.YT!.Player(mountRef.current, {
      height: '198',
      width: '100%',
      playerVars: { listType: 'playlist', list: id, rel: 0 },
      events: {
        onReady: () => setStatus('ready'),
        onStateChange: (e: YT.OnStateChangeEvent) => {
          setPlaying(e.data === window.YT!.PlayerState.PLAYING)
          const data = playerRef.current?.getVideoData()
          if (data?.title) setTitle(data.title)
        },
        onError: () => {
          setError('Impossibile riprodurre questa playlist (privata, rimossa o link errato)')
          setStatus('error')
        },
      },
    })
  }, [input])

  return (
    <section className="glass flex flex-col gap-4 border border-night/40 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-ink-dim uppercase">
          <ExternalVideoIcon className="size-4" />
          Playlist YouTube
        </h2>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-panel px-2 py-0.5 text-[10px] text-ink-dim">
            richiede connessione
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full text-ink-dim transition hover:bg-panel"
            aria-label="Chiudi playlist YouTube"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-ink-dim">
        Player ufficiale di YouTube, separato dal motore audio dell&apos;app:
        non passa dal mixer né dal crossfade e non funziona offline.
      </p>

      {!online && (
        <div className="flex items-center gap-2 rounded-xl bg-panel px-3 py-2 text-xs text-terra">
          <WifiOffIcon className="size-4 shrink-0" />
          Nessuna connessione: la playlist YouTube non è disponibile.
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void loadPlaylist()
          }}
          placeholder="Incolla il link di una playlist YouTube"
          className="h-11 min-w-0 flex-1 rounded-xl border border-panel-border bg-transparent px-3 text-sm outline-none focus:border-amber"
        />
        <button
          type="button"
          onClick={() => void loadPlaylist()}
          disabled={!online || status === 'loading'}
          className="h-11 shrink-0 rounded-xl bg-gradient-to-br from-amber to-terra px-4 text-sm font-semibold text-bg-1 transition hover:brightness-110 active:scale-95 disabled:opacity-40"
        >
          {status === 'loading' ? '...' : 'Carica'}
        </button>
      </div>

      {error && <p className="text-xs text-terra">{error}</p>}

      {/* YT.Player monta l'iframe qui: resta visibile, come richiesto dai ToS di YouTube. */}
      <div
        ref={mountRef}
        className={`overflow-hidden rounded-xl ${status === 'ready' ? '' : 'hidden'}`}
      />

      {status === 'ready' && (
        <div className="flex flex-col items-center gap-2">
          {title && <p className="max-w-full truncate text-sm text-ink-dim">{title}</p>}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => playerRef.current?.previousVideo()}
              className="flex size-11 items-center justify-center rounded-full text-ink-dim transition hover:bg-panel active:scale-95"
              aria-label="Video precedente"
            >
              <PrevIcon className="size-5" />
            </button>
            <button
              type="button"
              onClick={() =>
                playing ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo()
              }
              className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-amber to-terra text-bg-1 transition hover:brightness-110 active:scale-95"
              aria-label={playing ? 'Pausa' : 'Riproduci'}
            >
              {playing ? <PauseIcon className="size-5" /> : <PlayIcon className="ml-0.5 size-5" />}
            </button>
            <button
              type="button"
              onClick={() => playerRef.current?.nextVideo()}
              className="flex size-11 items-center justify-center rounded-full text-ink-dim transition hover:bg-panel active:scale-95"
              aria-label="Video successivo"
            >
              <NextIcon className="size-5" />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
