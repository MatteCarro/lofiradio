import { useRef, useState } from 'react'
import type { StoredTrack } from '../db/db'
import { MusicNoteIcon, PauseIcon, PlayIcon, TrashIcon, UploadIcon } from './icons'

interface PlaylistManagerProps {
  tracks: StoredTrack[]
  currentId: string | null
  playing: boolean
  onPlay: (index: number) => void
  onDelete: (id: string) => void
  onFiles: (files: File[]) => void
}

/*
  Gestione playlist: drag&drop + file picker.
  I file vengono passati ad App, che li salva come Blob in IndexedDB:
  restano quindi disponibili offline alle visite successive.
*/
export function PlaylistManager({
  tracks,
  currentId,
  playing,
  onPlay,
  onDelete,
  onFiles,
}: PlaylistManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const acceptFiles = (list: FileList | null) => {
    if (!list) return
    const audio = Array.from(list).filter(
      (f) => f.type.startsWith('audio/') || /\.(mp3|ogg|wav|m4a|flac|aac|opus)$/i.test(f.name),
    )
    if (audio.length > 0) onFiles(audio)
  }

  return (
    <section className="glass flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-ink-dim uppercase">
          Playlist
        </h2>
        <span className="text-xs text-ink-dim">
          {tracks.length} {tracks.length === 1 ? 'brano' : 'brani'}
        </span>
      </div>

      {/* Zona drag&drop + picker */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          acceptFiles(e.dataTransfer.files)
        }}
        className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-4 py-4 text-sm transition ${
          dragOver
            ? 'border-amber bg-glow text-ink'
            : 'border-panel-border text-ink-dim hover:border-amber/60 hover:text-ink'
        }`}
      >
        <UploadIcon className="size-6" />
        <span>Trascina qui i tuoi brani o tocca per sceglierli</span>
        <span className="text-[11px] opacity-70">
          Salvati sul dispositivo, disponibili offline
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        multiple
        hidden
        onChange={(e) => {
          acceptFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {/* Elenco brani */}
      {tracks.length > 0 && (
        <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {tracks.map((track, i) => {
            const isCurrent = track.id === currentId
            return (
              <li
                key={track.id}
                className={`flex items-center gap-2 rounded-xl px-2 py-1 transition ${
                  isCurrent ? 'bg-panel' : 'hover:bg-panel/60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onPlay(i)}
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full transition active:scale-95 ${
                    isCurrent ? 'text-amber' : 'text-ink-dim hover:text-ink'
                  }`}
                  aria-label={
                    isCurrent && playing
                      ? `In riproduzione: ${track.name}`
                      : `Riproduci ${track.name}`
                  }
                >
                  {isCurrent && playing ? (
                    <PauseIcon className="size-5" />
                  ) : (
                    <PlayIcon className="size-5" />
                  )}
                </button>
                <span
                  className={`min-w-0 flex-1 truncate text-sm ${
                    isCurrent ? 'font-semibold text-amber' : ''
                  }`}
                >
                  {track.name}
                </span>
                {isCurrent && playing && (
                  <MusicNoteIcon className="size-4 shrink-0 animate-pulse text-amber" />
                )}
                <button
                  type="button"
                  onClick={() => onDelete(track.id)}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-dim transition hover:text-terra active:scale-95"
                  aria-label={`Elimina ${track.name}`}
                >
                  <TrashIcon className="size-5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
