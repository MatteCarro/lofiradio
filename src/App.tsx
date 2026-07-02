import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AMBIENT_LAYERS,
  AmbientSoundEngine,
  type AmbientLayerId,
} from './audio/AmbientSoundEngine'
import { MusicPlayer } from './audio/MusicPlayer'
import { getAudioGraph, rampGain, resumeAudio, type AudioGraph } from './audio/graph'
import { InstallPrompt } from './components/InstallPrompt'
import { Mixer } from './components/Mixer'
import { Player } from './components/Player'
import { PlaylistManager } from './components/PlaylistManager'
import { PomodoroTimer } from './components/PomodoroTimer'
import { YouTubePlaylist } from './components/YouTubePlaylist'
import {
  ExternalVideoIcon,
  MoonIcon,
  SlidersIcon,
  SunIcon,
  VinylIcon,
} from './components/icons'
import * as db from './db/db'
import type { StoredTrack } from './db/db'

type Theme = 'dark' | 'light'

const DEFAULT_VOLUMES: Record<AmbientLayerId, number> = {
  rain: 0,
  white: 0,
  pink: 0,
  vinyl: 0,
  fire: 0,
  cafe: 0,
}

/** Fattore di attenuazione della musica durante la pausa Pomodoro. */
const DUCK_FACTOR = 0.15

interface AudioBundle {
  graph: AudioGraph
  engine: AmbientSoundEngine
  player: MusicPlayer
}

/** Campanella sintetizzata per i cambi di fase del Pomodoro. */
function playChime(graph: AudioGraph) {
  const { ctx, masterGain } = graph
  ;[880, 1318.5].forEach((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    const env = ctx.createGain()
    const t = ctx.currentTime + i * 0.2
    env.gain.setValueAtTime(0, t)
    env.gain.linearRampToValueAtTime(0.15, t + 0.02)
    env.gain.exponentialRampToValueAtTime(0.0001, t + 1.1)
    osc.connect(env).connect(masterGain)
    osc.start(t)
    osc.stop(t + 1.2)
    osc.onended = () => {
      osc.disconnect()
      env.disconnect()
    }
  })
}

export default function App() {
  const [tracks, setTracks] = useState<StoredTrack[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [duration, setDuration] = useState(0)
  const [ambientVolumes, setAmbientVolumes] = useState(DEFAULT_VOLUMES)
  const [musicVolume, setMusicVolume] = useState(0.8)
  const [theme, setTheme] = useState<Theme>('dark')
  const [mixerOpen, setMixerOpen] = useState(false)
  const [duckEnabled, setDuckEnabled] = useState(true)
  const [youtubeOpen, setYoutubeOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [loaded, setLoaded] = useState(false)

  const audioRef = useRef<AudioBundle | null>(null)
  const duckedRef = useRef(false)
  const musicVolumeRef = useRef(musicVolume)
  musicVolumeRef.current = musicVolume
  const ambientVolumesRef = useRef(ambientVolumes)
  ambientVolumesRef.current = ambientVolumes
  const tracksRef = useRef(tracks)
  tracksRef.current = tracks

  /* ------------------------------------------------------------------ */
  /* Inizializzazione audio (lazy, dentro un gesto utente)               */
  /* ------------------------------------------------------------------ */

  const applyMusicGain = useCallback((bundle: AudioBundle, seconds = 0.15) => {
    // Curva quadratica percettiva + eventuale ducking del Pomodoro.
    const v = musicVolumeRef.current
    const target = v * v * (duckedRef.current ? DUCK_FACTOR : 1)
    rampGain(bundle.graph.ctx, bundle.graph.musicBus, target, seconds)
  }, [])

  const ensureAudio = useCallback((): AudioBundle => {
    if (audioRef.current) return audioRef.current
    const graph = getAudioGraph()
    const engine = new AmbientSoundEngine(graph.ctx, graph.ambientBus)
    const player = new MusicPlayer(graph.ctx, graph.musicBus, {
      onTrackChange: (_i, track) => {
        setCurrentId(track?.id ?? null)
        setElapsed(0)
        if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = track
            ? new MediaMetadata({ title: track.name, artist: 'Lofi Radio' })
            : null
        }
      },
      onPlayStateChange: setPlaying,
      onTimeUpdate: (e, d) => {
        setElapsed(e)
        setDuration(d)
      },
      onError: (msg) => setToast(msg),
    })
    player.setPlaylist(tracksRef.current)
    const bundle: AudioBundle = { graph, engine, player }
    audioRef.current = bundle

    // Ripristina il paesaggio sonoro salvato e il volume musica.
    for (const layer of AMBIENT_LAYERS) {
      const v = ambientVolumesRef.current[layer.id]
      if (v > 0) engine.setVolume(layer.id, v)
    }
    applyMusicGain(bundle, 0.01)
    setAnalyser(graph.analyser)

    // Controlli da lock screen / notifiche di sistema.
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => void player.resume())
      navigator.mediaSession.setActionHandler('pause', () => player.pause())
      navigator.mediaSession.setActionHandler('nexttrack', () => void player.next())
      navigator.mediaSession.setActionHandler('previoustrack', () => void player.prev())
    }
    return bundle
  }, [applyMusicGain])

  /* ------------------------------------------------------------------ */
  /* Caricamento iniziale da IndexedDB                                   */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    void (async () => {
      const [storedTracks, storedTheme, storedVolumes, storedMusicVol, storedDuck] =
        await Promise.all([
          db.getAllTracks(),
          db.getPref<Theme>('theme', 'dark'),
          db.getPref('ambientVolumes', DEFAULT_VOLUMES),
          db.getPref('musicVolume', 0.8),
          db.getPref('pomodoroDuck', true),
        ])
      setTracks(storedTracks)
      setTheme(storedTheme)
      setAmbientVolumes({ ...DEFAULT_VOLUMES, ...storedVolumes })
      setMusicVolume(storedMusicVol)
      setDuckEnabled(storedDuck)
      setLoaded(true)
    })().catch(() => setToast('Impossibile leggere i dati salvati'))
  }, [])

  /* Applica il tema al documento e al colore della barra di sistema. */
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', theme === 'light' ? '#f7ecdc' : '#0d1021')
  }, [theme])

  /* Persistenza preferenze (debounce leggero per gli slider). */
  useEffect(() => {
    if (!loaded) return
    const t = setTimeout(() => {
      void db.setPref('ambientVolumes', ambientVolumes)
      void db.setPref('musicVolume', musicVolume)
    }, 300)
    return () => clearTimeout(t)
  }, [ambientVolumes, musicVolume, loaded])

  useEffect(() => {
    if (!loaded) return
    void db.setPref('theme', theme)
    void db.setPref('pomodoroDuck', duckEnabled)
  }, [theme, duckEnabled, loaded])

  /* Toast auto-dismiss. */
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  /* ------------------------------------------------------------------ */
  /* Azioni                                                              */
  /* ------------------------------------------------------------------ */

  const handleFiles = useCallback(async (files: File[]) => {
    try {
      for (const file of files) await db.addTrack(file)
      const all = await db.getAllTracks()
      setTracks(all)
      audioRef.current?.player.setPlaylist(all)
      setToast(
        files.length === 1
          ? 'Brano aggiunto alla playlist'
          : `${files.length} brani aggiunti alla playlist`,
      )
    } catch {
      setToast('Errore nel salvataggio dei brani')
    }
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    await db.deleteTrack(id)
    const all = await db.getAllTracks()
    setTracks(all)
    audioRef.current?.player.setPlaylist(all)
  }, [])

  const handlePlayIndex = useCallback(
    async (index: number) => {
      const bundle = ensureAudio()
      await resumeAudio()
      const track = tracksRef.current[index]
      if (track && track.id === bundle.player.currentTrack()?.id) {
        await bundle.player.toggle()
      } else {
        await bundle.player.playAt(index)
      }
    },
    [ensureAudio],
  )

  const handleToggle = useCallback(async () => {
    const bundle = ensureAudio()
    await resumeAudio()
    if (bundle.player.currentTrack()) {
      await bundle.player.toggle()
    } else if (tracksRef.current.length > 0) {
      await bundle.player.playAt(0)
    }
  }, [ensureAudio])

  const handleNext = useCallback(async () => {
    const bundle = ensureAudio()
    await resumeAudio()
    await bundle.player.next()
  }, [ensureAudio])

  const handlePrev = useCallback(async () => {
    const bundle = ensureAudio()
    await resumeAudio()
    await bundle.player.prev()
  }, [ensureAudio])

  const handleSeek = useCallback(
    (seconds: number) => {
      setElapsed(seconds)
      void ensureAudio().player.seek(seconds)
    },
    [ensureAudio],
  )

  const handleMusicVolume = useCallback(
    (v: number) => {
      setMusicVolume(v)
      musicVolumeRef.current = v
      const bundle = audioRef.current
      if (bundle) applyMusicGain(bundle, 0.05)
    },
    [applyMusicGain],
  )

  const handleAmbient = useCallback(
    (id: AmbientLayerId, v: number) => {
      setAmbientVolumes((prev) => ({ ...prev, [id]: v }))
      const bundle = ensureAudio()
      void resumeAudio()
      bundle.engine.setVolume(id, v)
    },
    [ensureAudio],
  )

  /* Pomodoro: ducking della musica a fine sessione di lavoro. */
  const handleWorkEnd = useCallback(
    (duck: boolean) => {
      const bundle = audioRef.current
      if (!bundle) return
      playChime(bundle.graph)
      if (duck) {
        duckedRef.current = true
        applyMusicGain(bundle, 1.2)
      }
    },
    [applyMusicGain],
  )

  const handleBreakEnd = useCallback(() => {
    const bundle = audioRef.current
    if (!bundle) return
    playChime(bundle.graph)
    if (duckedRef.current) {
      duckedRef.current = false
      applyMusicGain(bundle, 1.2)
    }
  }, [applyMusicGain])

  const currentTrack = tracks.find((t) => t.id === currentId) ?? null

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <VinylIcon className="size-7 text-amber" />
          Lofi Radio
        </h1>
        <div className="flex items-center gap-2">
          <InstallPrompt />
          <button
            type="button"
            onClick={() => setMixerOpen((v) => !v)}
            className={`flex size-11 items-center justify-center rounded-full border border-panel-border transition hover:bg-panel active:scale-95 ${
              mixerOpen ? 'text-amber' : 'text-ink-dim'
            }`}
            aria-label="Apri/chiudi mixer suoni ambientali"
            aria-expanded={mixerOpen}
          >
            <SlidersIcon className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            className="flex size-11 items-center justify-center rounded-full border border-panel-border text-ink-dim transition hover:bg-panel active:scale-95"
            aria-label={theme === 'dark' ? 'Passa al tema giorno' : 'Passa al tema notte'}
          >
            {theme === 'dark' ? (
              <SunIcon className="size-5" />
            ) : (
              <MoonIcon className="size-5" />
            )}
          </button>
        </div>
      </header>

      <main
        className={`grid flex-1 items-start gap-4 ${
          mixerOpen ? 'lg:grid-cols-[1fr_300px]' : ''
        }`}
      >
        <div className="flex min-w-0 flex-col gap-4">
          <Player
            trackName={currentTrack?.name ?? null}
            playing={playing}
            elapsed={elapsed}
            duration={duration}
            musicVolume={musicVolume}
            analyser={analyser}
            onToggle={() => void handleToggle()}
            onNext={() => void handleNext()}
            onPrev={() => void handlePrev()}
            onSeek={handleSeek}
            onMusicVolume={handleMusicVolume}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <PlaylistManager
              tracks={tracks}
              currentId={currentId}
              playing={playing}
              onPlay={(i) => void handlePlayIndex(i)}
              onDelete={(id) => void handleDelete(id)}
              onFiles={(files) => void handleFiles(files)}
            />
            <PomodoroTimer
              onWorkEnd={handleWorkEnd}
              onBreakEnd={handleBreakEnd}
              duckEnabled={duckEnabled}
              onDuckEnabledChange={setDuckEnabled}
            />
          </div>

          {/* Sezione facoltativa e nettamente separata dal motore audio
              dell'app: montata solo su richiesta, per non generare traffico
              di rete verso YouTube per chi non la usa. */}
          {youtubeOpen ? (
            <YouTubePlaylist onClose={() => setYoutubeOpen(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setYoutubeOpen(true)}
              className="glass flex min-h-14 w-full items-center justify-center gap-2 p-4 text-sm text-ink-dim transition hover:text-ink"
            >
              <ExternalVideoIcon className="size-5" />
              Aggiungi playlist YouTube (richiede connessione)
            </button>
          )}
        </div>

        <Mixer
          volumes={ambientVolumes}
          onChange={handleAmbient}
          open={mixerOpen}
          onClose={() => setMixerOpen(false)}
        />
      </main>

      {toast && (
        <div
          role="status"
          className="glass fixed bottom-5 left-1/2 z-50 -translate-x-1/2 px-5 py-3 text-sm"
        >
          {toast}
        </div>
      )}
    </div>
  )
}
