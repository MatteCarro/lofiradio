import { useEffect, useRef } from 'react'

interface VisualizerProps {
  /** AnalyserNode del grafo audio; null finché l'audio non è stato avviato. */
  analyser: AnalyserNode | null
  className?: string
}

/*
  Visualizer a barre di frequenza su canvas.
  Legge l'AnalyserNode a ogni frame (requestAnimationFrame) e disegna
  barre arrotondate con un gradiente ambra→terracotta preso dalle
  variabili CSS del tema, così segue il toggle giorno/notte.
*/
export function Visualizer({ analyser, className }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const analyserRef = useRef(analyser)
  analyserRef.current = analyser

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) return

    let raf = 0
    let data: Uint8Array<ArrayBuffer> | null = null

    // Adatta la risoluzione del canvas al devicePixelRatio per nitidezza.
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.height = Math.max(1, Math.round(rect.height * dpr))
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const draw = () => {
      raf = requestAnimationFrame(draw)
      const w = canvas.width
      const h = canvas.height
      ctx2d.clearRect(0, 0, w, h)

      const styles = getComputedStyle(document.documentElement)
      const amber = styles.getPropertyValue('--c-amber').trim() || '#f2a952'
      const terra = styles.getPropertyValue('--c-terra').trim() || '#d1755b'

      const analyserNode = analyserRef.current
      const bins = analyserNode ? analyserNode.frequencyBinCount : 64
      if (analyserNode) {
        if (!data || data.length !== bins) data = new Uint8Array(bins)
        analyserNode.getByteFrequencyData(data)
      }

      // Usa solo i ~3/4 inferiori dello spettro: sopra c'è quasi sempre silenzio.
      const usable = Math.floor(bins * 0.75)
      const barCount = 48
      const step = usable / barCount
      const gap = w * 0.004
      const barW = (w - gap * (barCount - 1)) / barCount

      const gradient = ctx2d.createLinearGradient(0, h, 0, 0)
      gradient.addColorStop(0, terra)
      gradient.addColorStop(1, amber)
      ctx2d.fillStyle = gradient

      for (let i = 0; i < barCount; i++) {
        let v = 0
        if (data) {
          // Media dei bin coperti da questa barra.
          const from = Math.floor(i * step)
          const to = Math.max(from + 1, Math.floor((i + 1) * step))
          let sum = 0
          for (let j = from; j < to; j++) sum += data[j]
          v = sum / (to - from) / 255
        }
        const barH = Math.max(h * 0.04, v * h * 0.95)
        const x = i * (barW + gap)
        const y = h - barH
        const r = Math.min(barW / 2, barH / 2)
        ctx2d.beginPath()
        ctx2d.roundRect(x, y, barW, barH, r)
        ctx2d.fill()
      }
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
