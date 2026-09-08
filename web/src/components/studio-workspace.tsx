"use client";

import { useMemo, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { AudioComparer } from "@/components/audio-comparer";
import { ParamSlider } from "@/components/param-slider";
import { reprocessProject } from "@/lib/api";
import type { MasteringParams, ProjectResponse } from "@/types/mastering";

type Props = {
  initial: ProjectResponse;
  aiParams: MasteringParams;
};

function Meter({
  label,
  before,
  after,
  unit,
}: {
  label: string;
  before: number;
  after: number;
  unit: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-white/40">{label}</div>
      <div className="mt-1 flex items-end justify-between gap-2 font-mono text-sm">
        <span className="text-white/50">
          {before.toFixed(1)}
          {unit}
        </span>
        <span className="text-cyan-300">
          {after.toFixed(1)}
          {unit}
        </span>
      </div>
    </div>
  );
}

export function StudioWorkspace({ initial, aiParams }: Props) {
  const [project, setProject] = useState(initial);
  const [params, setParams] = useState<MasteringParams>(initial.params);
  const [mode, setMode] = useState<"original" | "mastered">("mastered");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useMemo(
    () => ({ timer: null as ReturnType<typeof setTimeout> | null }),
    []
  );
  const requestIdRef = useMemo(() => ({ current: 0 }), []);

  function updateParam<K extends keyof MasteringParams>(key: K, value: MasteringParams[K]) {
    const next = { ...params, [key]: value };
    setParams(next);
    setError(null);
    if (debounceRef.timer) clearTimeout(debounceRef.timer);
    debounceRef.timer = setTimeout(() => {
      void runProcess(next);
    }, 700);
  }

  async function runProcess(next: MasteringParams) {
    const requestId = ++requestIdRef.current;
    setIsProcessing(true);
    try {
      const updated = await reprocessProject(project.project_id, next);
      // Ignore outdated responses when sliders moved again
      if (requestId !== requestIdRef.current) return;
      setProject(updated);
      setParams(updated.params);
      sessionStorage.setItem(
        `vocalift:project:${updated.project_id}`,
        JSON.stringify(updated)
      );
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "재처리 실패");
    } finally {
      if (requestId === requestIdRef.current) {
        setIsProcessing(false);
      }
    }
  }

  function resetToAi() {
    setParams(aiParams);
    void runProcess(aiParams);
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-violet-300/80">Studio</p>
          <h1 className="mt-1 text-2xl font-semibold text-white md:text-3xl">
            {project.filename}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            AI 초안을 듣고, 수치를 직접 조절하며 Original과 비교하세요.
          </p>
        </div>

        <AudioComparer
          originalUrl={project.original_url}
          previewUrl={project.preview_url}
          mode={mode}
          onModeChange={setMode}
          isRefreshing={isProcessing}
        />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Meter
            label="LUFS"
            before={project.analysis.lufs}
            after={project.processed_analysis.lufs}
            unit=""
          />
          <Meter
            label="Peak"
            before={project.analysis.peak_db}
            after={project.processed_analysis.peak_db}
            unit=" dB"
          />
          <Meter
            label="RMS"
            before={project.analysis.rms_db}
            after={project.processed_analysis.rms_db}
            unit=" dB"
          />
          <Meter
            label="DR"
            before={project.analysis.dynamic_range_db}
            after={project.processed_analysis.dynamic_range_db}
            unit=" dB"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/api/projects/${project.project_id}/download`}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:brightness-110"
          >
            <Download size={16} />
            WAV 다운로드
          </a>
          <button
            type="button"
            onClick={resetToAi}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/10"
          >
            <RotateCcw size={16} />
            AI 추천으로 되돌리기
          </button>
          <span className="text-xs text-white/40">
            {isProcessing ? "재처리 중…" : "조절 시 자동 프리뷰"}
          </span>
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </section>

      <aside className="max-h-[78vh] space-y-5 overflow-y-auto rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur-md">
        <div>
          <h2 className="text-sm font-semibold text-white">Tone EQ</h2>
          <p className="text-xs text-white/40">전체 톤 밸런스를 미세 조정합니다.</p>
        </div>
        <ParamSlider
          label="Low Shelf Freq"
          hint="저역 선반 필터의 기준 주파수"
          value={params.low_shelf_hz}
          min={40}
          max={400}
          step={1}
          unit=" Hz"
          onChange={(v) => updateParam("low_shelf_hz", v)}
        />
        <ParamSlider
          label="Low Shelf Gain"
          hint="저음을 키우거나 줄입니다"
          value={params.low_shelf_db}
          min={-6}
          max={6}
          step={0.1}
          unit=" dB"
          onChange={(v) => updateParam("low_shelf_db", v)}
        />
        <ParamSlider
          label="Presence Freq"
          hint="보컬/존재감이 모이는 대역"
          value={params.presence_hz}
          min={1000}
          max={8000}
          step={10}
          unit=" Hz"
          onChange={(v) => updateParam("presence_hz", v)}
        />
        <ParamSlider
          label="Presence Gain"
          hint="존재감·명료도를 조절합니다"
          value={params.presence_db}
          min={-6}
          max={6}
          step={0.1}
          unit=" dB"
          onChange={(v) => updateParam("presence_db", v)}
        />
        <ParamSlider
          label="Presence Q"
          hint="존재감 대역의 폭 (높을수록 좁음)"
          value={params.presence_q}
          min={0.3}
          max={4}
          step={0.05}
          onChange={(v) => updateParam("presence_q", v)}
        />
        <ParamSlider
          label="Air Freq"
          hint="고역 ‘에어’ 선반 주파수"
          value={params.air_hz}
          min={6000}
          max={16000}
          step={50}
          unit=" Hz"
          onChange={(v) => updateParam("air_hz", v)}
        />
        <ParamSlider
          label="Air Gain"
          hint="반짝임·공기감을 더하거나 줄입니다"
          value={params.air_db}
          min={-6}
          max={6}
          step={0.1}
          unit=" dB"
          onChange={(v) => updateParam("air_db", v)}
        />

        <div className="border-t border-white/10 pt-4">
          <h2 className="text-sm font-semibold text-white">Glue Compressor</h2>
          <p className="text-xs text-white/40">트랙을 하나로 붙이는 약한 압박.</p>
        </div>
        <ParamSlider
          label="Threshold"
          hint="이 레벨을 넘는 신호만 압축"
          value={params.comp_threshold_db}
          min={-40}
          max={-6}
          step={0.5}
          unit=" dB"
          onChange={(v) => updateParam("comp_threshold_db", v)}
        />
        <ParamSlider
          label="Ratio"
          hint="압축 비율 (높을수록 강하게)"
          value={params.comp_ratio}
          min={1.1}
          max={8}
          step={0.1}
          onChange={(v) => updateParam("comp_ratio", v)}
        />
        <ParamSlider
          label="Attack"
          hint="압축이 걸리는 속도"
          value={params.comp_attack_ms}
          min={1}
          max={100}
          step={1}
          unit=" ms"
          onChange={(v) => updateParam("comp_attack_ms", v)}
        />
        <ParamSlider
          label="Release"
          hint="압축이 풀리는 속도"
          value={params.comp_release_ms}
          min={20}
          max={800}
          step={5}
          unit=" ms"
          onChange={(v) => updateParam("comp_release_ms", v)}
        />
        <ParamSlider
          label="Makeup"
          hint="압축 후 전체 레벨 보정"
          value={params.comp_makeup_db}
          min={0}
          max={12}
          step={0.1}
          unit=" dB"
          onChange={(v) => updateParam("comp_makeup_db", v)}
        />

        <div className="border-t border-white/10 pt-4">
          <h2 className="text-sm font-semibold text-white">Saturation & Limiter</h2>
          <p className="text-xs text-white/40">밀도감과 배포용 라우드니스.</p>
        </div>
        <ParamSlider
          label="Saturation"
          hint="하모닉스를 더해 밀도감을 줍니다"
          value={params.saturation}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => updateParam("saturation", v)}
        />
        <ParamSlider
          label="Target LUFS"
          hint="스트리밍 목표 라우드니스"
          value={params.target_lufs}
          min={-24}
          max={-8}
          step={0.1}
          onChange={(v) => updateParam("target_lufs", v)}
        />
        <ParamSlider
          label="True Peak"
          hint="최대 피크 천장 (클리핑 방지)"
          value={params.true_peak_db}
          min={-3}
          max={-0.1}
          step={0.1}
          unit=" dB"
          onChange={(v) => updateParam("true_peak_db", v)}
        />
        <ParamSlider
          label="Limiter Release"
          hint="리미터 해제 속도"
          value={params.limiter_release_ms}
          min={10}
          max={200}
          step={1}
          unit=" ms"
          onChange={(v) => updateParam("limiter_release_ms", v)}
        />
      </aside>
    </div>
  );
}
