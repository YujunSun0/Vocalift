import { getSeparation } from "@/lib/api";
import { SeparationResult } from "@/components/separation-result";
import type { SeparationResponse } from "@/types/mastering";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function VocalRemoverPage({ params }: PageProps) {
  const { id } = await params;

  let separation: SeparationResponse | null = null;

  try {
    separation = await getSeparation(id);
  } catch {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-5">
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-syne)] text-2xl font-semibold text-white">
            분리 결과를 찾을 수 없습니다
          </h1>
          <p className="mt-2 text-sm text-white/50">
            유효하지 않은 ID이거나 만료된 결과일 수 있습니다.
          </p>
          <a
            href="/"
            className="mt-4 inline-block text-sm text-violet-300 underline underline-offset-4"
          >
            홈으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  return <SeparationResult separation={separation} />;
}
