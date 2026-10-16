import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, PACKS, TOTAL_SOUNDS } from "@/lib/packs";
import { og, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "서비스 소개",
  description:
    "Pixwave는 브라우저에서 바로 듣고 바로 받을 수 있는 무료 사운드 팩 라이브러리입니다. 모든 소리는 파형 파라미터로 합성됩니다.",
  alternates: { canonical: "/about" },
  openGraph: og(
    "/about",
    `Pixwave란 | ${site.name}`,
    "브라우저에서 바로 듣고 바로 받을 수 있는 무료 사운드 팩 라이브러리. 모든 소리는 파형 파라미터로 합성되거나 실제 녹음으로 제공됩니다.",
  ),
};

const STEPS = [
  {
    title: "파라미터로 사운드를 정의합니다",
    body: "매 샘플을 직접 녹음하지 않습니다. 주파수, 파형, 감쇠, 노이즈 같은 값으로 사운드를 서술해 두기 때문에, 언제든 같은 소음을 다시 만들 수 있습니다.",
  },
  {
    title: "미리듣기는 실제 샘플로 재생합니다",
    body: "재생 버튼을 누르면 그 자리에서 오디오 버퍼를 만들어 그대로 재생합니다. 오디오 파일을 스트리밍하지 않으므로 로딩이 없어요.",
  },
  {
    title: "다운로드는 같은 샘플을 WAV로 저장합니다",
    body: "받은 파일은 44.1kHz / 16-bit 모노 PCM입니다. 미리듣은 소리와 받은 파일은 픽셀 단위로 동일합니다.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <header>
        <p className="font-mono text-xs tracking-[0.18em] text-brand uppercase">
          소개
        </p>
        <h1 className="mt-2.5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Pixwave란
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-mute sm:text-base">
          앱, 웹, 게임에 넣을 사운드를 찾는大多数人에게는 같은 문제가 있습니다.
          검색하면 양질의 파일은 대부분 유료이고, 무료 파일은 라이선스가 애매하거나
          용도에 맞지 않습니다.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-mute sm:text-base">
          Pixwave는 파일을 모아두는 대신 필요한 소리를 직접 만들어 제공합니다.
          {PACKS.length}개 팩 {TOTAL_SOUNDS}개 사운드가{" "}
          {CATEGORIES.length}개 카테고리로 정리되어 있습니다.
        </p>
      </header>

      <section className="mt-14">
        <h2 className="text-lg font-semibold text-white">어떻게 동작하나요</h2>
        <ol className="mt-5 space-y-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="rounded-2xl border border-ink-800 bg-ink-900 p-6"
            >
              <span className="font-mono text-xs text-brand">
                0{index + 1}
              </span>
              <h3 className="mt-2 font-medium text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mute">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14">
        <h2 className="text-lg font-semibold text-white">어디에 쓰나요</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "안드로이드 앱",
              body: "res/raw 에 넣고 SoundPool 또는 MediaPlayer 로 재생. 포맷 호환이 끝내 맞습니다.",
            },
            {
              title: "웹 / PWA",
              body: "Web Audio API 로 재생하거나, 받은 WAV 를 정적 파일로 배포하세요.",
            },
            {
              title: "iOS",
              body: "Bundle 에 복사해 AVAudioPlayer 로 재생. 샘플레이트 44.1kHz 표준 지원.",
            },
            {
              title: "게임",
              body: "짧은 효과음 위주라 지연 없이 재생됩니다. 배경음은 루프용 팩을 추천.",
            },
          ].map((item) => (
            <li
              key={item.title}
              className="rounded-2xl border border-ink-800 bg-ink-900/60 p-5"
            >
              <h3 className="text-sm font-medium text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mute">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 rounded-2xl border border-ink-800 bg-ink-900/60 p-6">
        <h2 className="text-sm font-semibold text-white">바로 시작하기</h2>
        <p className="mt-2 text-sm leading-relaxed text-mute">
          회원가입 없이 바로 받으실 수 있습니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/packs"
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-ink-950 transition-opacity hover:opacity-90"
          >
            전체 팩 둘러보기
          </Link>
          <Link
            href="/license"
            className="rounded-xl border border-ink-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-900"
          >
            라이선스 확인
          </Link>
        </div>
      </section>
    </div>
  );
}