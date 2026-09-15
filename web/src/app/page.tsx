"use client";

import { useState } from "react";
import { UploadHero } from "@/components/upload-hero";
import { VocalRemoverUpload } from "@/components/vocal-remover-upload";

const FEATURES = [
  {
    title: "AI 초안",
    body: "라우드니스와 톤을 분석해\n시작 파라미터를 채웁니다",
  },
  {
    title: "열린 컨트롤",
    body: "EQ · Comp · Limiter · LUFS를\n수치로 직접 조절합니다",
  },
  {
    title: "A/B 청취",
    body: "Original과 Mastered를 오가며\n변화를 바로 확인합니다",
  },
] as const;

const VOCAL_FEATURES = [
  {
    title: "AI 분리",
    body: "Demucs 모델로 보컬과 반주를\n정확하게 분리합니다",
  },
  {
    title: "고품질 스템",
    body: "Vocals와 Instrumental(MR)을\nWAV 포맷으로 다운로드",
  },
  {
    title: "간편한 프로세스",
    body: "파일 업로드 한 번으로\n두 개의 스템을 얻습니다",
  },
] as const;

export default function HomePage() {
  const [mode, setMode] = useState<"mastering" | "vocal-remover">("mastering");

  return (
    <div className="pb-20 pt-4 md:pt-6">
      <div className="mx-auto mb-8 flex max-w-6xl items-center justify-center gap-3 px-5 md:px-8">
        <button
          type="button"
          onClick={() => setMode("mastering")}
          className={`rounded-full px-6 py-2 text-sm font-medium transition ${
            mode === "mastering"
              ? "bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-950"
              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
          }`}
        >
          마스터링
        </button>
        <button
          type="button"
          onClick={() => setMode("vocal-remover")}
          className={`rounded-full px-6 py-2 text-sm font-medium transition ${
            mode === "vocal-remover"
              ? "bg-gradient-to-r from-violet-500 to-fuchsia-400 text-slate-950"
              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
          }`}
        >
          보컬 분리
        </button>
      </div>

      {mode === "mastering" ? <UploadHero /> : <VocalRemoverUpload />}

      <section className="mx-auto mt-4 grid max-w-6xl gap-4 px-5 md:grid-cols-3 md:px-8">
        {(mode === "mastering" ? FEATURES : VOCAL_FEATURES).map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4"
          >
            <h2 className="font-[family-name:var(--font-syne)] text-base text-cyan-100/90">
              {item.title}
            </h2>
            <p className="mt-2 whitespace-pre-line break-keep text-sm leading-relaxed text-white/40">
              {item.body}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
