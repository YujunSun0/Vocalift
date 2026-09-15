"use client";

import { useEffect, useState } from "react";
import { Download, Mic, Music } from "lucide-react";
import type { SeparationResponse } from "@/types/mastering";
import { mediaUrl } from "@/lib/api";

type SeparationResultProps = {
  separation: SeparationResponse;
};

export function SeparationResult({ separation }: SeparationResultProps) {
  const [vocalsAudio, setVocalsAudio] = useState<HTMLAudioElement | null>(null);
  const [instAudio, setInstAudio] = useState<HTMLAudioElement | null>(null);
  const [playingVocals, setPlayingVocals] = useState(false);
  const [playingInst, setPlayingInst] = useState(false);

  useEffect(() => {
    const v = new Audio(mediaUrl(separation.vocals_url));
    const i = new Audio(mediaUrl(separation.instrumental_url));
    setVocalsAudio(v);
    setInstAudio(i);

    return () => {
      v.pause();
      i.pause();
    };
  }, [separation]);

  const toggleVocals = () => {
    if (!vocalsAudio) return;
    if (playingVocals) {
      vocalsAudio.pause();
      setPlayingVocals(false);
    } else {
      vocalsAudio.currentTime = 0;
      void vocalsAudio.play();
      setPlayingVocals(true);
      vocalsAudio.onended = () => setPlayingVocals(false);
    }
  };

  const toggleInst = () => {
    if (!instAudio) return;
    if (playingInst) {
      instAudio.pause();
      setPlayingInst(false);
    } else {
      instAudio.currentTime = 0;
      void instAudio.play();
      setPlayingInst(true);
      instAudio.onended = () => setPlayingInst(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 md:px-8 md:py-12">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.28em] text-violet-300/70">
          완료
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-syne)] text-3xl font-semibold text-white md:text-4xl">
          {separation.filename}
        </h1>
        <p className="mt-2 text-sm text-white/50">
          보컬과 반주가 분리되었습니다. 각 스템을 미리듣기 하거나 다운로드하세요.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-violet-300/20 bg-gradient-to-br from-violet-500/5 to-transparent p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/20">
              <Mic size={24} className="text-violet-300" />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold text-white">
                Vocals
              </h2>
              <p className="text-xs text-white/50">보컬 트랙</p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-white/60">
            <div className="flex justify-between">
              <span>Duration</span>
              <span>
                {separation.vocals_analysis.duration_sec.toFixed(1)}s
              </span>
            </div>
            <div className="flex justify-between">
              <span>Peak</span>
              <span>{separation.vocals_analysis.peak_db.toFixed(1)} dB</span>
            </div>
            <div className="flex justify-between">
              <span>RMS</span>
              <span>{separation.vocals_analysis.rms_db.toFixed(1)} dB</span>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={toggleVocals}
              className="flex-1 rounded-lg bg-violet-500/20 px-4 py-2 text-sm font-medium text-violet-200 transition hover:bg-violet-500/30"
            >
              {playingVocals ? "⏸ 정지" : "▶ 재생"}
            </button>
            <a
              href={mediaUrl(separation.vocals_url)}
              download
              className="flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              <Download size={16} />
              다운로드
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-fuchsia-300/20 bg-gradient-to-br from-fuchsia-500/5 to-transparent p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-fuchsia-500/20">
              <Music size={24} className="text-fuchsia-300" />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold text-white">
                Instrumental
              </h2>
              <p className="text-xs text-white/50">반주 트랙 (MR)</p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-white/60">
            <div className="flex justify-between">
              <span>Duration</span>
              <span>
                {separation.instrumental_analysis.duration_sec.toFixed(1)}s
              </span>
            </div>
            <div className="flex justify-between">
              <span>Peak</span>
              <span>
                {separation.instrumental_analysis.peak_db.toFixed(1)} dB
              </span>
            </div>
            <div className="flex justify-between">
              <span>RMS</span>
              <span>
                {separation.instrumental_analysis.rms_db.toFixed(1)} dB
              </span>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={toggleInst}
              className="flex-1 rounded-lg bg-fuchsia-500/20 px-4 py-2 text-sm font-medium text-fuchsia-200 transition hover:bg-fuchsia-500/30"
            >
              {playingInst ? "⏸ 정지" : "▶ 재생"}
            </button>
            <a
              href={mediaUrl(separation.instrumental_url)}
              download
              className="flex items-center gap-2 rounded-lg bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              <Download size={16} />
              다운로드
            </a>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <a
          href="/"
          className="inline-block text-sm text-white/50 underline decoration-white/20 underline-offset-4 transition hover:text-white/70"
        >
          ← 홈으로 돌아가기
        </a>
      </div>
    </div>
  );
}
