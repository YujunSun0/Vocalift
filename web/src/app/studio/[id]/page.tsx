"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { StudioWorkspace } from "@/components/studio-workspace";
import type { MasteringParams, ProjectResponse } from "@/types/mastering";

export default function StudioPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [aiParams, setAiParams] = useState<MasteringParams | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = params.id;
    if (!id) return;
    try {
      const raw = sessionStorage.getItem(`vocalift:project:${id}`);
      const aiRaw = sessionStorage.getItem(`vocalift:ai-params:${id}`);
      if (!raw) {
        setError("프로젝트 세션이 없습니다. 홈에서 다시 업로드해 주세요.");
        return;
      }
      setProject(JSON.parse(raw) as ProjectResponse);
      setAiParams(
        aiRaw
          ? (JSON.parse(aiRaw) as MasteringParams)
          : (JSON.parse(raw) as ProjectResponse).params
      );
    } catch {
      setError("프로젝트 데이터를 읽지 못했습니다.");
    }
  }, [params.id]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <p className="text-rose-300">{error}</p>
        <a href="/" className="mt-4 inline-block text-violet-300 underline">
          홈으로
        </a>
      </div>
    );
  }

  if (!project || !aiParams) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-white/50">
        스튜디오 준비 중…
      </div>
    );
  }

  return <StudioWorkspace initial={project} aiParams={aiParams} />;
}
