"use client";

import { useEffect, useRef } from "react";

type Props = {
  className?: string;
  /** 0~1 idle energy when no analyser */
  energy?: number;
  /** Boost while uploading / processing */
  boosted?: boolean;
  /** When true, synthetic motion intensifies like playback */
  playing?: boolean;
  /** Optional audio element for real FFT reactivity */
  audioEl?: HTMLAudioElement | null;
  bars?: number;
};

type AudioGraph = {
  ctx: AudioContext;
  analyser: AnalyserNode;
  data: Uint8Array;
};

const audioGraphs = new WeakMap<HTMLAudioElement, AudioGraph>();

function getAudioGraph(audioEl: HTMLAudioElement): AudioGraph | null {
  const existing = audioGraphs.get(audioEl);
  if (existing) return existing;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const source = ctx.createMediaElementSource(audioEl);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.78;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    const graph: AudioGraph = {
      ctx,
      analyser,
      data: new Uint8Array(analyser.frequencyBinCount),
    };
    audioGraphs.set(audioEl, graph);
    return graph;
  } catch {
    return audioGraphs.get(audioEl) ?? null;
  }
}

/**
 * Circular frequency-style waveform ring.
 * Uses Web Audio Analyser when audio is playing; otherwise a musical idle motion.
 */
export function CircularWaveform({
  className,
  energy = 0.35,
  boosted = false,
  playing = false,
  audioEl = null,
  bars = 96,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const graphRef = useRef<AudioGraph | null>(null);

  useEffect(() => {
    if (!audioEl) {
      graphRef.current = null;
      return;
    }
    graphRef.current = getAudioGraph(audioEl);
    const resume = () => {
      const graph = graphRef.current;
      if (graph && graph.ctx.state === "suspended") void graph.ctx.resume();
    };
    audioEl.addEventListener("play", resume);
    return () => audioEl.removeEventListener("play", resume);
  }, [audioEl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const phases = Array.from({ length: bars }, (_, i) => (i / bars) * Math.PI * 2);

    const draw = (now: number) => {
      const { width, height } = canvas.getBoundingClientRect();
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.34;
      ctx.clearRect(0, 0, width, height);

      let spectrum: number[] | null = null;
      const graph = graphRef.current;
      if (graph && playing) {
        graph.analyser.getByteFrequencyData(graph.data);
        spectrum = Array.from(graph.data);
      }

      const t = now / 1000;
      const base = boosted ? 0.85 : playing ? 0.7 : energy;
      const pulse = 0.55 + 0.45 * Math.sin(t * (playing || boosted ? 3.2 : 1.4));

      const glow = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 1.35);
      glow.addColorStop(0, `rgba(167, 139, 250, ${0.08 + base * 0.1})`);
      glow.addColorStop(0.55, `rgba(34, 211, 238, ${0.04 + base * 0.05})`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < bars; i++) {
        const angle = phases[i] - Math.PI / 2 + t * (playing ? 0.15 : 0.04);
        let amp: number;
        if (spectrum) {
          const idx = Math.floor((i / bars) * (spectrum.length * 0.55));
          amp = spectrum[idx] / 255;
        } else {
          const wave =
            0.35 * Math.sin(t * 2.1 + i * 0.22) +
            0.25 * Math.sin(t * 3.7 + i * 0.51) +
            0.2 * Math.sin(t * 5.3 + i * 0.09);
          amp = Math.max(0, (wave + 0.55) * base * pulse);
        }

        const len = (6 + amp * (playing || boosted ? 42 : 28)) * (0.85 + base * 0.3);
        const inner = radius - 2;
        const outer = radius + len;
        const x1 = cx + Math.cos(angle) * inner;
        const y1 = cy + Math.sin(angle) * inner;
        const x2 = cx + Math.cos(angle) * outer;
        const y2 = cy + Math.sin(angle) * outer;

        const mix = i / bars;
        const r = Math.round(140 + mix * 80);
        const g = Math.round(90 + (1 - mix) * 120);
        const b = Math.round(250 - mix * 40);
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.35 + amp * 0.55})`;
        ctx.lineWidth = Math.max(1.5, width * 0.0035);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.beginPath();
      for (let i = 0; i <= bars; i++) {
        const a = (i / bars) * Math.PI * 2 - Math.PI / 2 + t * 0.08;
        let amp = 0.15;
        if (spectrum) {
          const idx = Math.floor((i / bars) * (spectrum.length * 0.5));
          amp = spectrum[Math.min(idx, spectrum.length - 1)] / 255;
        } else {
          amp =
            0.2 +
            0.15 * Math.sin(t * 2.4 + i * 0.35) +
            0.1 * Math.sin(t * 4.1 + i * 0.12);
          amp *= base * pulse;
        }
        const rr = radius + 8 + amp * (playing || boosted ? 36 : 22);
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle =
        playing || boosted ? "rgba(165, 243, 252, 0.55)" : "rgba(196, 181, 253, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [bars, boosted, energy, playing]);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
