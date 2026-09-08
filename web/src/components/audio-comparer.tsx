"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { CircularWaveform } from "@/components/circular-waveform";
import { mediaUrl } from "@/lib/api";

type Props = {
  originalUrl: string;
  previewUrl: string;
  mode: "original" | "mastered";
  onModeChange: (mode: "original" | "mastered") => void;
  isRefreshing?: boolean;
};

function isAbortError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name: string }).name === "AbortError"
  );
}

export function AudioComparer({
  originalUrl,
  previewUrl,
  mode,
  onModeChange,
  isRefreshing = false,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSwitching, setIsSwitching] = useState(false);
  const wantPlayRef = useRef(false);
  const activeSrcRef = useRef<string>("");
  const switchingRef = useRef(false);

  const src = mediaUrl(mode === "original" ? originalUrl : previewUrl);

  useEffect(() => {
    setAudioEl(audioRef.current);
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    // Already on this source — skip reload (avoids AbortError)
    if (activeSrcRef.current === src) return;

    let cancelled = false;
    const resumeAt = el.currentTime || 0;
    const shouldResume = wantPlayRef.current || (!el.paused && !el.ended);

    setIsSwitching(true);
    switchingRef.current = true;

    const preload = new Audio();
    preload.crossOrigin = "anonymous";
    preload.preload = "auto";

    const fail = () => {
      if (cancelled) return;
      switchingRef.current = false;
      setIsSwitching(false);
    };

    const apply = async () => {
      if (cancelled) return;

      try {
        el.pause();
      } catch {
        // ignore
      }

      activeSrcRef.current = src;
      el.src = src;

      const finish = async () => {
        if (cancelled) return;
        try {
          if (Number.isFinite(resumeAt) && resumeAt > 0) {
            const capped =
              Number.isFinite(el.duration) && el.duration > 0
                ? Math.min(resumeAt, Math.max(el.duration - 0.05, 0))
                : resumeAt;
            el.currentTime = capped;
          }
          switchingRef.current = false;
          setIsSwitching(false);
          if (shouldResume) {
            wantPlayRef.current = true;
            await el.play();
            setIsPlaying(true);
          }
        } catch (err) {
          if (!isAbortError(err)) {
            wantPlayRef.current = false;
            setIsPlaying(false);
          }
          switchingRef.current = false;
          setIsSwitching(false);
        }
      };

      if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        await finish();
      } else {
        el.addEventListener("loadeddata", () => void finish(), { once: true });
        el.addEventListener("error", fail, { once: true });
      }
    };

    preload.addEventListener("canplay", () => void apply(), { once: true });
    preload.addEventListener("error", fail, { once: true });
    preload.src = src;

    // Safety timeout if preload stalls
    const timer = window.setTimeout(() => void apply(), 4000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      preload.removeAttribute("src");
      preload.load();
    };
  }, [src]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => {
      if (!el.duration) return;
      setProgress(el.currentTime / el.duration);
    };
    const onEnded = () => {
      wantPlayRef.current = false;
      setIsPlaying(false);
    };
    const onPlay = () => {
      wantPlayRef.current = true;
      setIsPlaying(true);
    };
    const onPause = () => {
      // Don't clear wantPlay during intentional source swap
      if (!switchingRef.current) {
        wantPlayRef.current = false;
        setIsPlaying(false);
      }
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnded);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, []);

  async function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    try {
      if (el.paused) {
        wantPlayRef.current = true;
        await el.play();
        setIsPlaying(true);
      } else {
        wantPlayRef.current = false;
        el.pause();
        setIsPlaying(false);
      }
    } catch (err) {
      if (!isAbortError(err)) {
        wantPlayRef.current = false;
        setIsPlaying(false);
      }
    }
  }

  function seek(ratio: number) {
    const el = audioRef.current;
    if (!el?.duration) return;
    el.currentTime = ratio * el.duration;
    setProgress(ratio);
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md">
      <div className="relative mx-auto aspect-square w-full max-w-md">
        <CircularWaveform
          className="absolute inset-0 h-full w-full"
          playing={isPlaying}
          energy={0.3}
          audioEl={audioEl}
          boosted={isRefreshing || isSwitching}
        />
        <div className="absolute inset-[28%] flex flex-col items-center justify-center rounded-full border border-white/10 bg-black/50 text-center backdrop-blur-sm">
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => onModeChange("original")}
              className={`rounded-full px-3 py-1 text-xs transition ${
                mode === "original"
                  ? "bg-white text-slate-900"
                  : "bg-white/10 text-white/70 hover:bg-white/15"
              }`}
            >
              Original
            </button>
            <button
              type="button"
              onClick={() => onModeChange("mastered")}
              className={`rounded-full px-3 py-1 text-xs transition ${
                mode === "mastered"
                  ? "bg-gradient-to-r from-violet-400 to-cyan-300 text-slate-950"
                  : "bg-white/10 text-white/70 hover:bg-white/15"
              }`}
            >
              Mastered
            </button>
          </div>
          <button
            type="button"
            onClick={() => void togglePlay()}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.35)] transition hover:brightness-110"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
          </button>
          <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-white/40">
            {isRefreshing || isSwitching ? "Updating…" : "A / B Listen"}
          </p>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-3">
        <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={(e) => seek(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-cyan-300"
        />
      </div>
    </div>
  );
}
