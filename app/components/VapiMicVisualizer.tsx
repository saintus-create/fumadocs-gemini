"use client";

import { useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";

import { BarVisualizer, type AgentState } from "@/components/ui/bar-visualizer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? '';
const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? '';

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Talk to Riley</CardTitle>
        <CardDescription>Visualizer reacts to your microphone audio</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <BarVisualizer state={state} barCount={15} mediaStream={micStream} />
        <Button onClick={connected ? stop : start}>{connected ? "Stop" : "Start"}</Button>
      </CardContent>
    </Card>
  );
}
