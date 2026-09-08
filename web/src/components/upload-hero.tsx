"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { CircularWaveform } from "@/components/circular-waveform";
import { createProject } from "@/lib/api";

export function UploadHero() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setError(null);
      setIsUploading(true);
      try {
        const project = await createProject(file);
        sessionStorage.setItem(
          `vocalift:project:${project.project_id}`,
          JSON.stringify(project)
        );
        sessionStorage.setItem(
          `vocalift:ai-params:${project.project_id}`,
          JSON.stringify(project.params)
        );
        router.push(`/studio/${project.project_id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "업로드 실패");
        setIsUploading(false);
      }
    },
    [router]
  );

  return (
    <section className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-5 py-8 md:grid-cols-[1.05fr_0.95fr] md:gap-6 md:px-8 md:py-12">
      <div className="relative z-10 max-w-xl">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/70">
          Vocalift Studio
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-syne)] text-4xl font-semibold leading-[1.1] tracking-tight text-white md:text-5xl lg:text-6xl">
          Vocalift
        </h1>
        <p className="mt-4 text-pretty break-keep text-lg leading-snug text-white/70 md:text-xl">
          올린 트랙을 AI가 마스터하고,
          <br />
          수치는 당신이 직접 다듬습니다
        </p>
        <p className="mt-4 max-w-sm text-pretty break-keep text-sm leading-relaxed text-white/40">
          EQ · Comp · Limiter · LUFS를 열어둔 마스터링
          <br />
          Original과 결과물을 비교하며 다듬어 보세요
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload size={16} />
            {isUploading ? "분석·마스터링 중…" : "트랙 올리기"}
          </button>
          <span className="text-xs text-white/35">
            WAV · FLAC · M4A · MP3 · AIFF · 100MB
          </span>
        </div>
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </div>

      <div
        className="relative mx-auto aspect-square w-full max-w-[460px]"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        <CircularWaveform
          className="absolute inset-0 h-full w-full"
          energy={isDragging ? 0.7 : 0.4}
          boosted={isUploading || isDragging}
          playing={isUploading}
        />

        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className={`absolute inset-[18%] flex flex-col items-center justify-center rounded-full border transition ${
            isDragging
              ? "border-cyan-300/50 bg-cyan-400/10"
              : "border-white/10 bg-black/35 hover:border-violet-300/30 hover:bg-black/45"
          } backdrop-blur-md disabled:cursor-wait`}
        >
          <span className="mb-2 text-xs uppercase tracking-[0.2em] text-violet-200/70">
            Drop zone
          </span>
          <span className="px-6 text-center text-base font-medium text-white md:text-lg">
            {isUploading ? "소리를 끌어올리는 중" : "여기로 파일을 놓으세요"}
          </span>
          <span className="mt-2 text-xs text-white/40">또는 클릭해서 선택</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".wav,.flac,.aiff,.aif,.mp3,.m4a,.aac,.caf,audio/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </section>
  );
}
