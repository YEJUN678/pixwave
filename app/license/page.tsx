import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, PACKS } from "@/lib/packs";
import { LICENSES, og, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "라이선스 안내",
  description:
    "Pixwave 사운드 팩의 라이선스는 CC0와 CC BY 4.0입니다. 상업적 이용이 가능하며, 무엇이 되고 무엇이 안 되는지 정리했습니다.",
  alternates: { canonical: "/license" },
  openGraph: og(
    "/license",
    `라이선스 안내 | ${site.name}`,
    "CC0와 CC BY 4.0. 상업적 이용이 가능하며, 무엇이 되고 무엇이 안 되는지 정리했습니다.",
  ),
};

const FAQ = [
  {
    q: "앱에 넣고 유료로 판매해도 되나요?",
    a: "가능합니다. CC0 팩은 제약이 없고, CC BY 4.0 팩은 앱 내 설정 화면이나 README에 출처를 표기하면 됩니다. 소스 코드로 판매하는 경우에도 동일합니다.",
  },
  {
    q: "영상이나 유튜브 채널 영상에 사용해도 되나요?",
    a: "가능합니다. 여러 플랫폼에서 별도 허가 없이 사용할 수 있고, CC BY 4.0 팩은 영상 설명란에 한 줄 출처를 넣어 주시면 됩니다.",
  },
  {
    q: "파일을 수정하거나 일부만 잘라 써도 되나요?",
    a: "가능합니다. 피치 변경, 컷 편집, 다른 포맷(MP3, OGG, M4A)으로 변환해도 됩니다. 변환한 파일에도 같은 라이선스가 적용됩니다.",
  },
  {
    q: "사운드만 따로 다시 배포해도 되나요?",
    a: "CC0 팩은 가능합니다. CC BY 4.0 팩은 출처를 표기하면 가능합니다. 다만 원본과 거의 동일하게 만들어 다른 곳에서 판매하는 것은 권장하지 않습니다.",
  },
  {
    q: "이 사이트의 사운드는 어떻게 만들어지나요?",
    a: "외부 녹음이 아니라 파형 파라미터로 합성한 사운드입니다. 같은 파라미터로 미리듣기와 다운로드 파일을 생성하기 때문에, 재생한 소리와 받은 파일은 완전히 같습니다.",
  },
];

export default function LicensePage() {
  const cc0Count = PACKS.filter((p) => p.license === "CC0").length;

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <header>
        <p className="font-mono text-xs tracking-[0.18em] text-brand uppercase">
          라이선스
        </p>
        <h1 className="mt-2.5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          자유롭게 쓰세요
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-mute sm:text-base">
          이 사이트의 모든 사운드는 상업적 이용이 가능합니다. 조건이 있는 것은
          하나뿐입니다. 어떤 팩이 어떤 조건인지 먼저 확인해 주세요.
        </p>
      </header>

      <div className="mt-10 space-y-4">
        {Object.values(LICENSES).map((license) => {
          const count =
            license.id === "CC0"
              ? cc0Count
              : PACKS.length - cc0Count;

          return (
            <section
              key={license.id}
              className="rounded-2xl border border-ink-800 bg-ink-900 p-6"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-white">
                  {license.name}
                </h2>
                <span className="font-mono text-xs text-ink-600">
                  적용 팩 {count}개
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-mute">
                {license.summary}
              </p>
              <a
                href={license.url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-4 inline-block text-xs font-semibold text-brand-2 transition-opacity hover:opacity-70"
              >
                원문 보기 ↗
              </a>
            </section>
          );
        })}
      </div>

      <section className="mt-14">
        <h2 className="text-lg font-semibold text-white">자주 묻는 질문</h2>
        <dl className="mt-5 space-y-3">
          {FAQ.map((item) => (
            <div
              key={item.q}
              className="rounded-2xl border border-ink-800 bg-ink-900/60 p-5"
            >
              <dt className="text-sm font-medium text-white">{item.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-mute">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-14">
        <h2 className="text-lg font-semibold text-white">팩별 라이선스 한눈에 보기</h2>
        <ul className="mt-5 divide-y divide-ink-800 overflow-hidden rounded-2xl border border-ink-800">
          {PACKS.map((pack) => (
            <li
              key={pack.slug}
              className="flex items-center justify-between gap-4 bg-ink-900 px-5 py-3.5 text-sm"
            >
              <Link
                href={`/packs/${pack.slug}`}
                className="min-w-0 truncate text-white transition-opacity hover:opacity-75"
              >
                {pack.name}
                <span className="ml-2 text-xs text-ink-600">{pack.nameEn}</span>
              </Link>
              <span
                className={`shrink-0 font-mono text-xs ${pack.license === "CC0" ? "text-emerald-400" : "text-amber-300"}`}
              >
                {pack.license}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 rounded-2xl border border-ink-800 bg-ink-900/60 p-6">
        <h2 className="text-sm font-semibold text-white">CC BY 4.0 팩 출처 문구</h2>
        <p className="mt-2 text-sm leading-relaxed text-mute">
          앱 정보 화면이나 README, 영상 설명란 중 한 곳에 아래 문구를 그대로 넣으면 됩니다.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-ink-800 bg-ink-950 p-4 font-mono text-xs leading-relaxed text-brand-2">
{`음원: ${site.url}
라이선스: CC BY 4.0
출처: ${site.url}/packs/{팩 이름}`}
        </pre>
      </section>

      <div className="mt-12 flex flex-wrap gap-2">
        {CATEGORIES.map((category) => (
          <Link
            key={category.slug}
            href={`/categories/${category.slug}`}
            className="rounded-full border border-ink-800 bg-ink-900 px-4 py-2 text-sm text-mute transition-colors hover:border-ink-700 hover:text-white"
          >
            {category.name}
          </Link>
        ))}
      </div>
    </div>
  );
}