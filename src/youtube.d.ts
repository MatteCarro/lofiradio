/* @types/youtube tipizza il namespace YT ma non l'hook globale di caricamento. */
export {}

declare global {
  interface Window {
    YT?: typeof YT
    onYouTubeIframeAPIReady?: () => void
  }
}
