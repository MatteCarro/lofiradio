# Lofi Radio 📻

PWA per ascoltare la tua musica lofi con suoni ambientali **sintetizzati in
tempo reale** — pioggia, fuoco scoppiettante, caffetteria, vinyl crackle,
rumore bianco/rosa — più timer Pomodoro integrato. Funziona **completamente
offline** dopo il primo caricamento.

## Caratteristiche

- **Player con crossfade**: le tracce vengono riprodotte via
  `AudioBufferSourceNode` sull'`AudioContext` (niente `<audio>` tag) con
  crossfade automatico equal-power di 3 secondi tra i brani.
- **Suoni ambientali sintetizzati**: nessun campione scaricato. Ogni layer è
  generato via Web Audio API da rumore bianco/rosa/marrone filtrato più
  transienti schedulati (gocce, scoppiettii, tintinnii). Vedi
  `src/audio/AmbientSoundEngine.ts`.
- **Mixer**: slider verticali indipendenti per ogni layer, sommati al bus
  master via `GainNode`.
- **Visualizer**: canvas alimentato da un `AnalyserNode` a valle del master.
- **Playlist offline**: i file audio (drag&drop o file picker) sono salvati
  come `Blob` in IndexedDB e restano fruibili offline.
- **Pomodoro 25/5**: a fine sessione può abbassare automaticamente il volume
  della musica durante la pausa (ducking) e ripristinarlo al termine.
- **Tema giorno/notte** con palette calda (ambra/terracotta/blu notte),
  pannelli in vetro smerigliato, gradiente di sfondo animato.
- **PWA installabile**: manifest completo, service worker cache-first,
  prompt "Aggiungi a schermata Home".
- **Playlist YouTube (opzionale)**: sezione volutamente separata dal motore
  audio, montata solo su richiesta dell'utente. Usa esclusivamente il player
  IFrame ufficiale di YouTube (nessuna estrazione/download dell'audio):
  richiede una connessione e non entra nel mixer/crossfade/visualizer.
  Vedi `src/components/YouTubePlaylist.tsx`.

## Stack

Vite · React · TypeScript · Tailwind CSS 4 · vite-plugin-pwa (Workbox) ·
Web Audio API · IndexedDB

## Sviluppo

```bash
npm install
npm run dev       # server di sviluppo
npm run build     # build di produzione + service worker in dist/
npm run preview   # serve la build (necessario per testare la PWA/offline)
npm run lint      # oxlint
```

Per rigenerare le icone PNG da `scripts/icon-source.svg` (richiede un
Chromium locale):

```bash
CHROMIUM_PATH=/percorso/di/chrome node scripts/generate-icons.mjs
```

## Struttura

```
src/
├── audio/
│   ├── graph.ts               # AudioContext condiviso + bus musica/ambient/master
│   ├── AmbientSoundEngine.ts  # sintesi dei suoni ambientali (testabile senza UI)
│   └── MusicPlayer.ts         # playlist + crossfade equal-power
├── components/
│   ├── Player.tsx             # vinile animato, trasporto, volume musica
│   ├── Visualizer.tsx         # barre di frequenza su canvas
│   ├── Mixer.tsx              # pannello collassabile con slider verticali
│   ├── PlaylistManager.tsx    # drag&drop, elenco brani
│   ├── PomodoroTimer.tsx      # timer 25/5 con ducking opzionale
│   ├── InstallPrompt.tsx      # bottone di installazione PWA
│   └── YouTubePlaylist.tsx    # player IFrame YouTube, separato dal motore audio
└── db/
    └── db.ts                  # IndexedDB: tracce (Blob) + preferenze
```

## Note su privacy e licenze

Il motore audio principale (player + mixer ambientale) non incorpora stream
di terze parti: riproduce solo file locali dell'utente o audio sintetizzato
al volo, e non effettua chiamate di rete non necessarie. La sezione
"Playlist YouTube" è un'eccezione esplicita e isolata, attivabile solo su
richiesta dell'utente: usa il player ufficiale IFrame di YouTube (mai
estrazione/download dell'audio, per rispettarne i Termini di Servizio),
richiede una connessione e non funziona offline.
