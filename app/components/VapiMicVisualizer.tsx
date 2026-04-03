"use client";

import { useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";

import { type AgentState } from "@/components/ui/bar-visualizer";
import { Matrix, loader, pulse, type Frame } from "@/components/ui/matrix";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? '';
const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? '';

function getMatrixConfig(state: AgentState, connected: boolean): { frames?: Frame[]; pattern?: Frame; fps: number; palette: { on: string; off: string } } {
  if (!connected) {
    return {
      pattern: [
        [0, 0, 1, 0, 0],
        [0, 1, 1, 1, 0],
        [1, 1, 1, 1, 1],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 1, 0, 1, 0],
        [1, 0, 0, 0, 1],
      ],
      fps: 1,
      palette: { on: "#ffffff", off: "rgba(255,255,255,0.08)" },
    };
  }

  switch (state) {
    case "connecting":
      return { frames: loader, fps: 12, palette: { on: "#ffffff", off: "rgba(255,255,255,0.08)" } };
    case "speaking":
      return { frames: pulse, fps: 16, palette: { on: "#ffffff", off: "rgba(255,255,255,0.06)" } };
    case "thinking":
      return { frames: loader, fps: 10, palette: { on: "#ffffff", off: "rgba(255,255,255,0.06)" } };
    case "listening":
    default:
      return { frames: pulse, fps: 8, palette: { on: "#ffffff", off: "rgba(255,255,255,0.08)" } };
  }
}

export default function VapiMicVisualizer() {
  const vapiRef = useRef<Vapi | null>(null);

  const [state, setState] = useState<AgentState>("listening");
  const [connected, setConnected] = useState(false);
  const [micStream, setMicStream] = useState<MediaStream | undefined>(undefined);

  useEffect(() => {
    const vapi = new Vapi(PUBLIC_KEY);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      setConnected(true);
      setState("listening");
    });

    vapi.on("call-end", () => {
      setConnected(false);
      setState("listening");
      setMicStream(undefined);
    });

    vapi.on("speech-start", () => setState("speaking"));
    vapi.on("speech-end", () => setState("listening"));

    vapi.on("message", (msg: any) => {
      if (msg?.type === "transcript" && msg?.role === "user" && msg?.transcriptType === "final") {
        setState("thinking");
      }
    });

    return () => {
        vapi.removeAllListeners();
        vapi.stop();
    };
  }, []);

  const start = async () => {
    setState("connecting");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setMicStream(stream);
    if (!vapiRef.current) return;
    await vapiRef.current.start(ASSISTANT_ID);
  };

  const stop = async () => {
    await vapiRef.current?.stop();
    micStream?.getTracks().forEach((t) => t.stop());
    setMicStream(undefined);
    setConnected(false);
    setState("listening");
  };

  const config = getMatrixConfig(state, connected);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div
        className="group cursor-pointer rounded-2xl bg-black p-4 shadow-lg transition-all duration-300 hover:shadow-xl active:scale-95"
        onClick={connected ? stop : start}
      >
        <Matrix
          rows={config.pattern ? config.pattern.length : 7}
          cols={config.pattern ? config.pattern[0].length : 7}
          frames={config.frames}
          pattern={config.pattern}
          fps={config.fps}
          size={8}
          gap={2}
          palette={config.palette}
          loop
          ariaLabel={connected ? "Click to disconnect" : "Click to start"}
          className="transition-transform duration-300 group-hover:scale-105"
        />
      </div>
    </div>
  );
}
