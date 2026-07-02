/*
  Persistenza locale via IndexedDB, senza dipendenze esterne.

  Due object store:
  - "tracks": i file audio dell'utente salvati come Blob (restano quindi
    fruibili offline, senza toccare il filesystem);
  - "prefs":  coppie chiave/valore per volumi, tema, impostazioni Pomodoro.
*/

const DB_NAME = 'lofiradio'
const DB_VERSION = 1
const TRACKS = 'tracks'
const PREFS = 'prefs'

export interface StoredTrack {
  id: string
  name: string
  type: string
  blob: Blob
  addedAt: number
  /** Posizione nella playlist (ordinamento manuale/di inserimento). */
  order: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(TRACKS)) {
        db.createObjectStore(TRACKS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(PREFS)) {
        db.createObjectStore(PREFS)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

/** Promisifica una singola richiesta IndexedDB. */
function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/* ---------------------------- Tracce ------------------------------- */

export async function addTrack(file: File): Promise<StoredTrack> {
  const db = await openDb()
  const existing = await getAllTracks()
  const track: StoredTrack = {
    id: crypto.randomUUID(),
    name: file.name.replace(/\.[^.]+$/, ''),
    type: file.type,
    blob: file,
    addedAt: Date.now(),
    order: existing.length ? Math.max(...existing.map((t) => t.order)) + 1 : 0,
  }
  const tx = db.transaction(TRACKS, 'readwrite')
  await requestToPromise(tx.objectStore(TRACKS).put(track))
  return track
}

export async function getAllTracks(): Promise<StoredTrack[]> {
  const db = await openDb()
  const tx = db.transaction(TRACKS, 'readonly')
  const all = await requestToPromise(
    tx.objectStore(TRACKS).getAll() as IDBRequest<StoredTrack[]>,
  )
  return all.sort((a, b) => a.order - b.order)
}

export async function deleteTrack(id: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(TRACKS, 'readwrite')
  await requestToPromise(tx.objectStore(TRACKS).delete(id))
}

/* -------------------------- Preferenze ----------------------------- */

export async function getPref<T>(key: string, fallback: T): Promise<T> {
  const db = await openDb()
  const tx = db.transaction(PREFS, 'readonly')
  const value = await requestToPromise(tx.objectStore(PREFS).get(key))
  return (value as T | undefined) ?? fallback
}

export async function setPref<T>(key: string, value: T): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(PREFS, 'readwrite')
  await requestToPromise(tx.objectStore(PREFS).put(value, key))
}
