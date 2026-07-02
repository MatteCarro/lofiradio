/* Icone SVG inline: nessuna richiesta di rete, ereditano il colore corrente. */

interface IconProps {
  className?: string
}

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function PlayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function PauseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="6" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="14" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function NextIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M5 5v14l9-7z" fill="currentColor" stroke="none" />
      <rect x="16" y="5" width="3" height="14" rx="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function PrevIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M19 5v14l-9-7z" fill="currentColor" stroke="none" />
      <rect x="5" y="5" width="3" height="14" rx="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function RainIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
      <path d="M17.5 12a4 4 0 0 0-.6-7.97A5.5 5.5 0 0 0 6.4 6.6 3.5 3.5 0 0 0 7 13.5h10.5z" />
      <path d="M8 16.5l-1 3M12 16.5l-1 3M16 16.5l-1 3" />
    </svg>
  )
}

export function FireIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
      <path d="M12 21c3.9 0 6.5-2.4 6.5-6 0-2.5-1.4-4.4-2.8-6-.4 1-1 1.8-2 2.3.3-2.8-1-6-3.7-7.3.2 2.3-.6 3.9-2 5.4C6.6 10.9 5.5 12.6 5.5 15c0 3.6 2.6 6 6.5 6z" />
      <path d="M12 21c-1.8 0-3-1.3-3-3 0-1.3.8-2.2 1.7-3.2.5.6 1 .9 1.7 1.1-.1-1 .2-2 1-2.7.9 1 1.6 2.4 1.6 4 0 2.2-1.2 3.8-3 3.8z" />
    </svg>
  )
}

export function CoffeeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
      <path d="M4 9h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z" />
      <path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17" />
      <path d="M7.5 3.5c-.8 1 .8 1.7 0 2.9M11 3.5c-.8 1 .8 1.7 0 2.9" />
    </svg>
  )
}

export function VinylIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M12 12h.01" strokeWidth="2.4" />
      <path d="M17.5 8.5a7 7 0 0 1 1 3.5" opacity="0.6" />
      <path d="M5.5 15.5a7 7 0 0 1-1-3.5" opacity="0.6" />
    </svg>
  )
}

export function PinkNoiseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
      <path d="M3 12c1.5-3 3-3 4.5 0s3 3 4.5 0 3-3 4.5 0 3 3 4.5 0" />
    </svg>
  )
}

export function WhiteNoiseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
      <path d="M3 12l1.5-4 2 8 2-11 2 13 2-9 2 6 2-8 2 7 1.5-2" />
    </svg>
  )
}

export function SunIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3L19 19M19 5l-1.7 1.7M6.7 17.3L5 19" />
    </svg>
  )
}

export function MoonIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />
    </svg>
  )
}

export function SlidersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
      <path d="M6 20v-7M6 9V4M12 20v-4M12 12V4M18 20v-9M18 7V4" />
      <circle cx="6" cy="11" r="2" />
      <circle cx="12" cy="14" r="2" />
      <circle cx="18" cy="9" r="2" />
    </svg>
  )
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
      <path d="M4.5 6.5h15M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5M6.5 6.5l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12" />
      <path d="M10 10.5v6M14 10.5v6" />
    </svg>
  )
}

export function UploadIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
      <path d="M12 16V4.5M7.5 8.5L12 4l4.5 4.5" />
      <path d="M4.5 15.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

export function TimerIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 13.5V9M9.5 2.5h5" />
    </svg>
  )
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
      <path d="M12 4v11.5M7.5 11.5L12 16l4.5-4.5" />
      <path d="M4.5 16.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2" />
    </svg>
  )
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function MusicNoteIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
      <path d="M9 18.5V6l10-2v12.5" />
      <circle cx="6.5" cy="18.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </svg>
  )
}

/* Icona generica "video esterno": rettangolo con triangolo di play, non il logo YouTube. */
export function ExternalVideoIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
      <rect x="3" y="5.5" width="18" height="13" rx="3" />
      <path d="M10.5 9.5l5 3-5 3z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function WifiOffIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
      <path d="M3 3l18 18" />
      <path d="M5 9.5a13 13 0 0 1 4.5-2.6M19 9.5a13 13 0 0 0-6-3.4" />
      <path d="M8 13a7.5 7.5 0 0 1 3.2-1.7M16 13a7.5 7.5 0 0 0-2.3-1.5" />
      <path d="M11 16.3a3.5 3.5 0 0 1 2.4.1" />
      <circle cx="12" cy="19.3" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
