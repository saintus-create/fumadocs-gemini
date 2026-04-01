'use client';

import { useEffect, useRef } from 'react';
import { cn } from '../../lib/cn';

export type AgentState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'thinking';

interface BarVisualizerProps {
  state: AgentState;
  barCount?: number;
  mediaStream?: MediaStream;
  className?: string;
}

export function BarVisualizer({ state, barCount = 15, mediaStream, className }: BarVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!mediaStream) {
      analyserRef.current = null;
      return;
    }

    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(mediaStream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    return () => {
      analyserRef.current = null;
      audioCtx.close();
    };
  }, [mediaStream]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const analyser = analyserRef.current;
      const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
      if (analyser && dataArray) analyser.getByteFrequencyData(dataArray);

      const barWidth = width / barCount;
      const gap = 2;

      for (let i = 0; i < barCount; i++) {
        let barHeight: number;

        if (state === 'speaking' && dataArray) {
          const dataIndex = Math.floor((i / barCount) * (dataArray.length * 0.5));
          barHeight = (dataArray[dataIndex] / 255) * height * 0.8;
        } else if (state === 'thinking') {
          barHeight = height * 0.3 * Math.abs(Math.sin(Date.now() / 300 + i * 0.5));
        } else if (state === 'listening') {
          barHeight = height * 0.1 * Math.abs(Math.sin(Date.now() / 800 + i * 0.3));
        } else {
          barHeight = height * 0.05;
        }

        const x = i * barWidth + gap / 2;
        const y = (height - barHeight) / 2;

        ctx.fillStyle =
          state === 'speaking'
            ? 'hsl(var(--fd-primary))'
            : state === 'thinking'
              ? 'hsl(var(--fd-muted-foreground))'
              : 'hsl(var(--fd-muted-foreground) / 0.5)';

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth - gap, barHeight, 2);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [state, barCount]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('w-full h-24 rounded-lg bg-fd-secondary', className)}
      width={600}
      height={96}
    />
  );
}
