import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SoundPlayer from "@/components/sound-player";
import DownloadPack from "@/components/download-pack";
import AdSlot from "@/components/ad-slot";
import PackCard from "@/components/pack-card";
import { formatDuration } from "@/lib/format";
import { PACKS, getCategory, getPack, soundDuration } from "@/lib/packs";
import { LICENSES, og, site } from "@/lib/site";

export function generateStaticParams() {
  return PACKS.map((pack) => ({ slug: pack.slug }));
}

/**
 * 목록에 없는 slug 는 렌더링조차 하지 않고 라우팅 단계에서 404 로 떨어뜨립니다.
 * (cacheComponents 가 꺼진 상태여야 쓸 수 있습니다)
 */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/packs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const pack = getPack(slug);
  // 셸이 커밋되기 전에 404 를 던져야 HTTP 상태코드가 404 가 됩니다.
  // page 본문에서만 notFound() 를 부르면 PPR 스트림이 이미 시작돼 200 soft 404 가 됩니다.
  if (!pack) notFound();

  return {
    title: `${pack.name} — ${pack.sounds.length}개 무료 사운드 팩`,
    description: `${pack.description} ${pack.sounds.length}개 사운드를 브라우저에서 먼저 듣고 WAV로 내려받으세요.`,
    alternates: { canonical: `/packs/${pack.slug}` },
    openGraph: og(
      `/packs/${pack.slug}`,
      `${pack.name} | ${site.name}`,
      pack.description,
    ),
  };
}

export default async function PackDetailPage({ params }: PageProps<"/packs/[slug]">) {
  const { slug } = await params;
  const pack = getPack(slug);
  if (!pack) notFound();

  const category = getCategory(pack.category);
  const license = LICENSES[pack.license];

  const totalSeconds = pack.sounds.reduce((sum, sound) => sum + soundDuration(sound), 0);
  const allTags = Array.from(
    new Set(pack.sounds.flatMap((sound) => sound.tags)),
  );

  const related = PACKS.filter(
    (item) => item.category === pack.category && item.slug !== pack.slug,
  )
    .concat(PACKS.filter((item) => item.slug !== pack.slug))
    .filter(
      (item, index, arr) =>
        arr.findIndex((other) => other.slug === item.slug) === index,
    )
    .slice(0, 3);

  return (
    <div>
      {/* ── 팩 헤더 ── */}
      <section className="relative overflow-hidden border-b border-ink-800">
        <div
          className="absolute inset-x-0 -top-32 h-72 opacity-20 blur-[110px]"
          style={{
            backgroundImage: `radial-gradient(50% 60% at 35% 0%, ${pack.accent[0]}, transparent), radial-gradient(50% 60% at 70% 20%, ${pack.accent[1]}, transparent)`,
          }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-5 py-14">
          <nav aria-label="위치 경로" className="text-xs text-ink-600">
            <Link href="/packs" className="transition-colors hover:text-white">
              전체 팩
            </Link>
            {category && (
              <>
                <span className="mx-1.5" aria-hidden>
                  /
                </span>
                <Link
                  href={`/categories/${category.slug}`}
                  className="transition-colors hover:text-white"
                >
                  {category.name}
                </Link>
              </>
            )}
            <span className="mx-1.5" aria-hidden>
              /
            </span>
            <span className="text-mute">{pack.name}</span>
          </nav>

          <div className="mt-7 flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {pack.name}
              </h1>
              <p className="mt-1.5 text-sm text-mute">{pack.nameEn}</p>
              <p className="mt-5 text-sm leading-relaxed text-mute sm:text-base">
                {pack.description}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                {category && (
                  <Link
                    href={`/categories/${category.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 px-3 py-1 text-xs transition-colors hover:border-ink-600 hover:text-white"
                  >
                    <span aria-hidden>{category.glyph}</span>
                    {category.name}
                  </Link>
                )}
                <span
                  className="rounded-full border px-3 py-1 text-xs"
                  style={{
                    borderColor: `${pack.accent[1]}55`,
                    color: pack.accent[1],
                  }}
                >
                  {license.id} · 상업적 이용 가능
                </span>
              </div>
            </div>

            <div className="shrink-0 rounded-2xl border border-ink-800 bg-ink-900/80 p-5 backdrop-blur">
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <dt className="text-mute">사운드</dt>
                <dd className="text-right font-mono text-white">
                  {pack.sounds.length}개
                </dd>
                <dt className="text-mute">총 길이</dt>
                <dd className="text-right font-mono text-white">
                  {formatDuration(totalSeconds)}
                </dd>
                <dt className="text-mute">포맷</dt>
                <dd className="text-right font-mono text-white">WAV 44.1k</dd>
              </dl>
              <DownloadPack pack={pack} className="mt-5 w-full justify-center" />
              <p className="mt-3 text-center text-[11px] text-ink-600">
                LICENSE.txt 포함 · 출처 표기 {pack.license === "CC0" ? "불필요" : "필요"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 사운드 목록 ── */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">
            팩에 포함된 사운드
          </h2>
          <p className="text-xs text-ink-600">
            재생하면 아래 파형이 진행됩니다. 아이콘으로 개별 WAV를 받을 수 있어요.
          </p>
        </div>

        <ul className="mt-6 space-y-2.5">
          {pack.sounds.map((sound, index) => (
            <li
              key={sound.id}
              className="rounded-2xl border border-ink-800 bg-ink-900 p-5 transition-colors hover:border-ink-700"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2.5">
                  <span className="font-mono text-xs text-ink-600">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-medium text-white">{sound.name}</h3>
                  <span className="text-xs text-ink-600">{sound.nameEn}</span>
                </div>
                <span className="font-mono text-xs text-ink-600">
                  {sound.id}.wav
                </span>
              </div>

              <div className="mt-4">
                <SoundPlayer
                  sound={sound}
                  prefix={pack.slug}
                  accent={pack.accent}
                />
              </div>

              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {sound.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-ink-850 px-2 py-0.5 text-[11px] text-mute"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-10 space-y-6">
          <AdSlot format="in-article" />
        </div>

        {/* 라이선스 안내 */}
        <div className="mt-10 rounded-2xl border border-ink-800 bg-ink-900/60 p-6">
          <h3 className="text-sm font-semibold text-white">
            이 팩의 라이선스 — {license.name}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-mute">{license.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <span key={tag} className="rounded-md bg-ink-850 px-2 py-1 text-[11px] text-mute">
                #{tag}
              </span>
            ))}
          </div>
          <Link
            href="/license"
            className="mt-5 inline-block text-xs font-semibold text-brand-2 transition-opacity hover:opacity-70"
          >
            전체 라이선스 안내 보기 →
          </Link>
        </div>
      </section>

      {/* ── 관련 팩 ── */}
      <section className="border-t border-ink-800 bg-ink-900/40">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-lg font-semibold text-white">같이 들어보세요</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <PackCard key={item.slug} pack={item} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}