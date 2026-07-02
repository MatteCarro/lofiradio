import { useEffect, useState } from 'react'
import { DownloadIcon } from './icons'

/* Evento non ancora tipizzato nelle lib DOM standard. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/*
  Bottone "Installa app": appare solo quando il browser emette
  beforeinstallprompt (cioè quando la PWA è realmente installabile)
  e richiama il prompt nativo "Aggiungi a schermata Home".
*/
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setDeferred(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!deferred) return null

  return (
    <button
      type="button"
      onClick={async () => {
        await deferred.prompt()
        const choice = await deferred.userChoice
        if (choice.outcome === 'accepted') setDeferred(null)
      }}
      className="flex h-11 items-center gap-2 rounded-full border border-panel-border px-4 text-sm text-ink-dim transition hover:bg-panel hover:text-ink active:scale-95"
    >
      <DownloadIcon className="size-4" />
      Installa app
    </button>
  )
}
