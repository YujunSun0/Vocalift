import type { Metadata } from "next";
import { Noto_Sans_KR, Outfit, Syne } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Vocalift — AI Vocal Production Assistant",
  description:
    "MR과 보컬 테이크를 올려 분석·믹스·마스터링까지. V0에서는 AI 마스터링과 수치 조절 A/B를 제공합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${outfit.variable} ${syne.variable} ${notoSansKr.variable} h-full antialiased`}
    >
      <body className="vocalift-bg min-h-full flex flex-col text-white">
        <SiteHeader />
        <main className="relative flex-1">{children}</main>
      </body>
    </html>
  );
}
