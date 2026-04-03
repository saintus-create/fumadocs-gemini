"use client"

import { useEffect, useRef } from "react"
import { cn } from "../../lib/cn"

interface LiquidBackgroundProps {
  className?: string
  colors?: string[]
  speed?: number
  intensity?: number
}

export function LiquidBackground({
  className,
  colors = ["#000", "#1a1a1a", "#333"],
  speed = 0.002,
  intensity = 30,
}: LiquidBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let time = 0

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener("resize", resize)

    const draw = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)

      for (let i = 0; i < colors.length; i++) {
        const offset = i * 1.5
        ctx.beginPath()
        ctx.moveTo(0, h)

        for (let x = 0; x <= w; x += 4) {
          const y =
            h * 0.4 +
            Math.sin(x * 0.005 + time + offset) * intensity +
            Math.sin(x * 0.01 + time * 1.3 + offset) * intensity * 0.5 +
            Math.cos(x * 0.003 + time * 0.7 + offset) * intensity * 0.8
          ctx.lineTo(x, y)
        }

        ctx.lineTo(w, h)
        ctx.closePath()
        ctx.fillStyle = colors[i]
        ctx.globalAlpha = 0.6
        ctx.fill()
      }

      ctx.globalAlpha = 1
      time += speed
      animRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener("resize", resize)
    }
  }, [colors, speed, intensity])

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 w-full h-full pointer-events-none", className)}
    />
  )
}
