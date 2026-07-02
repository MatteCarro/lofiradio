import type { ReactNode } from 'react'
import type { AmbientLayerId } from '../audio/AmbientSoundEngine'
import { AMBIENT_LAYERS } from '../audio/AmbientSoundEngine'
import {
  CloseIcon,
  CoffeeIcon,
  FireIcon,
  PinkNoiseIcon,
  RainIcon,
  VinylIcon,
  WhiteNoiseIcon,
} from './icons'

const LAYER_ICONS: Record<AmbientLayerId, (p: { className?: string }) => ReactNode> = {
  rain: RainIcon,
  fire: FireIcon,
  cafe: CoffeeIcon,
  vinyl: VinylIcon,
  pink: PinkNoiseIcon,
  white: WhiteNoiseIcon,
}

interface MixerProps {
  volumes: Record<AmbientLayerId, number>
  onChange: (id: AmbientLayerId, volume: number) => void
  open: boolean
  onClose: () => void
}

/*
  Mixer dei layer ambientali: slider verticali con icona.
  Su desktop è un pannello laterale sempre visibile quando aperto;
  su mobile diventa un "bottom sheet" sovrapposto, chiudibile.
*/
export function Mixer({ volumes, onChange, open, onClose }: MixerProps) {
  return (
    <>
      {/* Sfondo scuro dietro il bottom sheet su mobile */}
      {open && (
        <button
          type="button"
          aria-label="Chiudi mixer"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`glass fixed inset-x-3 bottom-3 z-40 p-5 transition-transform duration-300 lg:static lg:inset-auto lg:z-auto lg:translate-y-0 ${
          open
            ? 'translate-y-0'
            : 'pointer-events-none translate-y-[120%] lg:pointer-events-auto'
        } ${open ? '' : 'lg:hidden'}`}
        aria-label="Mixer suoni ambientali"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-ink-dim uppercase">
            Suoni ambientali
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-full text-ink-dim transition hover:bg-panel"
            aria-label="Chiudi mixer"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 justify-items-center gap-x-2 gap-y-6 sm:grid-cols-6 lg:grid-cols-3">
          {AMBIENT_LAYERS.map((layer) => {
            const Icon = LAYER_ICONS[layer.id]
            const v = volumes[layer.id] ?? 0
            return (
              <div key={layer.id} className="flex flex-col items-center gap-2">
                <div className="slider-v-wrap">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={v}
                    onChange={(e) => onChange(layer.id, Number(e.target.value))}
                    aria-label={`Volume ${layer.label}`}
                  />
                </div>
                <Icon
                  className={`size-6 transition-colors ${
                    v > 0 ? 'text-amber' : 'text-ink-dim'
                  }`}
                />
                <span className="text-[11px] text-ink-dim">{layer.label}</span>
              </div>
            )
          })}
        </div>
      </aside>
    </>
  )
}
