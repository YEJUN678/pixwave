import Link from "next/link";
import PackCard from "@/components/pack-card";
import AdSlot from "@/components/ad-slot";
import { CATEGORIES, PACKS, TOTAL_SOUNDS, packsByCategory, soundDuration } from "@/lib/packs";

export default function HomePage() {
  const featured = PACKS.filter((p) => p.featured);
  const totalSeconds = PACKS.reduce(
    (sum, pack) => sum + pack.sounds.reduce((s, sound) => s + soundDuration(sound), 0),
    0,
  );

  const stats = [
    { value: TOTAL_SOUNDS, unit: "개", label: "사운드" },
    { value: PACKS.length, unit: "팩", label: "테마 팩" },
    { value: Math.round(totalSeconds), unit: "초", label: "총 길이" },
    { value: "CC0", unit: "", label: "출처 표기 없이 사용" },
  ];

  return (
    <>
      {/* ── 히어로 ── */}
      <section className="relative overflow-hidden border-b border-ink-800">
        <div className="grid-bg absolute inset-0 opacity-70" aria-hidden />
        <div
          className="absolute inset-x-0 -top-40 h-80 opacity-25 blur-[120px]"
          style={{
            backgroundImage:
              "radial-gradient(50% 60% at 30% 0%, #7c5cff, transparent), radial-gradient(50% 60% at 70% 10%, #22d3ee, transparent)",
          }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <div className="max-w-2xl">
            <p className="rise inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900/80 px-3.5 py-1.5 text-xs text-mute">
              <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden />
              CC0 · 출처 표기 없이 바로 사용 가능
            </p>

            <h1
              className="rise mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-6xl"
              style={{ animationDelay: "60ms" }}
            >
              앱에 필요한 소리를,
              <br />
              <span className="gradient-text">즉석에서 만들어 받으세요.</span>
            </h1>

            <p
              className="rise mt-6 max-w-xl text-base leading-relaxed text-mute sm:text-lg"
              style={{ animationDelay: "120ms" }}
            >
              알림음부터 충전 완료 소리까지. 브라우저에서 먼저 듣고, 고른 것만
              44.1kHz WAV로 내려받으세요. 회원가입도, 로그인도 없습니다.
            </p>

            <div
              className="rise mt-9 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "180ms" }}
            >
              <Link
                href="/packs"
                className="rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-ink-950 transition-opacity hover:opacity-90 active:scale-[0.98]"
              >
                {TOTAL_SOUNDS}개 사운드 둘러보기
              </Link>
              <Link
                href="/categories/charging"
                className="rounded-xl border border-ink-700 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:border-ink-600 hover:bg-ink-900"
              >
                충전음 팩 보기
              </Link>
            </div>
          </div>

          <dl
            className="rise mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink-800 bg-ink-800 sm:grid-cols-4"
            style={{ animationDelay: "240ms" }}
          >
            {stats.map((stat) => (
              <div key={stat.label} className="bg-ink-900 px-5 py-5">
                <dt className="text-xs text-mute">{stat.label}</dt>
                <dd className="mt-1.5 font-mono text-2xl font-medium text-white">
                  {stat.value}
                  <span className="ml-1 text-sm text-mute">{stat.unit}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── 카테고리 ── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <SectionHead
          eyebrow="카테고리"
          title="무엇에 쓰시나요?"
          desc="용도별로 모았습니다. 마음에 안 들면 다른 팩으로 바꿔도 돼요."
        />

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((category) => {
            const count = packsByCategory(category.slug).length;
            return (
              <Link
                key={category.slug}
                href={`/categories/${category.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-ink-800 bg-ink-900 p-5 transition-colors hover:border-ink-700 hover:bg-ink-850"
              >
                <span
                  className="absolute -right-8 -top-8 size-24 rounded-full opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-45"
                  style={{ backgroundColor: category.accent[0] }}
                  aria-hidden
                />
                <span
                  className="relative grid size-10 place-items-center rounded-xl text-lg"
                  style={{
                    color: category.accent[1],
                    backgroundImage: `linear-gradient(135deg, ${category.accent[0]}33, ${category.accent[1]}1a)`,
                  }}
                  aria-hidden
                >
                  {category.glyph}
                </span>
                <h3 className="relative mt-4 font-semibold text-white">
                  {category.name}
                </h3>
                <p className="relative mt-1.5 text-sm leading-relaxed text-mute">
                  {category.description}
                </p>
                <p className="relative mt-3 text-xs text-ink-600">
                  팩 <span className="font-mono">{count}</span>개
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── 인기 팩 ── */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <SectionHead
          eyebrow="인기 팩"
          title="먼저 들어봐도 되는 팩"
          desc="카드에서 바로 재생해 보세요. 마음에 들면 전체를 한 번에 받습니다."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((pack) => (
            <PackCard key={pack.slug} pack={pack} />
          ))}
        </div>

        <div className="mt-10">
          <Link
            href="/packs"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-2 transition-opacity hover:opacity-75"
          >
            전체 {PACKS.length}개 팩 보기
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M5 12h13m0 0-5-5m5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 pb-20">
        <AdSlot format="horizontal" />
      </div>

      {/* ── 이용 방법 ── */}
      <section className="border-y border-ink-800 bg-ink-900/40">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <SectionHead eyebrow="이용 방법" title="세 번이면 끝납니다" />

          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "들어본다",
                body: "카드의 재생 버튼을 누르면 파일을 받기 전에 실제 소리를 먼저 확인할 수 있습니다.",
              },
              {
                title: "고른다",
                body: "팩 단위로는 ZIP으로, 개별 사운드는 WAV로 받습니다. 필요한 것만 골라서 쓰세요.",
              },
              {
                title: "쓴다",
                body: "CC0 팩은 출처 표기가 필요 없습니다. 앱, 영상, 웹, 게임 — 상업적으로도 자유입니다.",
              },
            ].map((step, i) => (
              <li
                key={step.title}
                className="rounded-2xl border border-ink-800 bg-ink-900 p-6"
              >
                <span className="font-mono text-sm text-brand">
                  0{i + 1}
                </span>
                <h3 className="mt-3 font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mute">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── 최근 팩 ── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <SectionHead eyebrow="라이브러리" title="추천 팩 더보기" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PACKS.filter((p) => !p.featured)
            .slice(0, 6)
            .map((pack) => (
              <PackCard key={pack.slug} pack={pack} />
            ))}
        </div>
      </section>

      {/* ── SEO 텍스트 ── */}
      <section className="mx-auto max-w-6xl px-5 pb-4">
        <div className="rounded-2xl border border-ink-800 bg-ink-900/60 p-8 sm:p-10">
          <h2 className="text-lg font-semibold text-white">
            무료 사운드 효과를 찾는다면
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-mute">
            <p>
              앱 알림음, 벨소리, 게임 효과음, 버튼 클릭음, 충전 완료 소리까지.
              Pixwave는 다운로드 전에 반드시 브라우저에서 먼저 들려주기 때문에, 원하면
              어떤 소리가 어떤 느낌인지 확인한 뒤에만 받게 됩니다.
            </p>
            <p>
              모든 파일은 44.1kHz / 16-bit 모노 PCM WAV 포맷입니다. 안드로이드
              <code className="mx-1 rounded bg-ink-800 px-1.5 py-0.5 font-mono text-xs text-brand-2">
                res/raw
              </code>
              에 넣거나, iOS
              <code className="mx-1 rounded bg-ink-800 px-1.5 py-0.5 font-mono text-xs text-brand-2">
                Bundle
              </code>
              에 복사하면 그대로 사용할 수 있습니다. 웹에서는 Web Audio API로 바로 재생할 수
              있습니다.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHead({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
}) {
  return (
    <div>
      <p className="font-mono text-xs tracking-[0.18em] text-brand uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-2.5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {title}
      </h2>
      {desc && <p className="mt-3 max-w-xl text-sm leading-relaxed text-mute">{desc}</p>}
    </div>
  );
}