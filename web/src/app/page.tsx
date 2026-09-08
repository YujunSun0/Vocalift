import { UploadHero } from "@/components/upload-hero";

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

export default function HomePage() {
  return (
    <div className="pb-20 pt-4 md:pt-6">
      <UploadHero />
      <section className="mx-auto mt-4 grid max-w-6xl gap-4 px-5 md:grid-cols-3 md:px-8">
        {FEATURES.map((item) => (
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
