import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { ClickmonIcon, ClickmonInterstitial } from "@/components/clickmon-ads";
import { site } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  keywords: [
    "무료 사운드",
    "사운드 팩",
    "효과음",
    "알림음",
    "벨소리",
    "WAV 다운로드",
    "CC0 사운드",
    "free sound effects",
    "royalty free sfx",
  ],
  openGraph: {
    type: "website",
    locale: site.locale,
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    url: site.url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        {/*
          전면/아이콘 광고는 document.write 기반이라 파싱 중에 실행되어야 합니다.
          body 맨 마지막에 둬서 하이드레이션과 충돌하지 않게 하고,
          아이콘은 로드 후 DOM 에 직접 붙입니다.
        */}
        <ClickmonInterstitial />
        <ClickmonIcon />
      </body>
    </html>
  );
}