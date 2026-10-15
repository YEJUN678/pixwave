import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PackCard from "@/components/pack-card";
import AdSlot from "@/components/ad-slot";
import { CATEGORIES, getCategory, packsByCategory, soundDuration } from "@/lib/packs";

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ slug: category.slug }));
}

/**
 * 목록에 없는 slug 는 렌더링조차 하지 않고 라우팅 단계에서 404 로 떨어뜨립니다.
 * (cacheComponents 가 꺼진 상태여야 쓸 수 있습니다)
 */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  // 셸이 커밋되기 전에 404 를 던져야 HTTP 상태코드가 404 가 됩니다.
  // page 본문에서만 notFound() 를 부르면 PPR 스트림이 이미 시작돼 200 soft 404 가 됩니다.
  if (!category) notFound();

  const packs = packsByCategory(slug);
  const count = packs.reduce((sum, pack) => sum + pack.sounds.length, 0);

  return {
    title: `무료 ${category.name} — ${count}개 사운드`,
    description: `${category.description} 총 ${count}개의 무료 ${category.name}을 브라우저에서 먼저 듣고 WAV로 내려받으세요.`,
    alternates: { canonical: `/categories/${slug}` },
  };
}

export default async function CategoryPage({
  params,
}: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const packs = packsByCategory(category.slug);
  const sounds = packs.flatMap((pack) => pack.sounds);
  const totalSeconds = sounds.reduce((sum, sound) => sum + soundDuration(sound), 0);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-ink-800">
        <div
          className="absolute inset-x-0 -top-28 h-64 opacity-20 blur-[100px]"
          style={{
            backgroundImage: `radial-gradient(55% 60% at 40% 0%, ${category.accent[0]}, transparent), radial-gradient(45% 60% at 75% 20%, ${category.accent[1]}, transparent)`,
          }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-5 py-14">
          <nav aria-label="위치 경로" className="text-xs text-ink-600">
            <Link href="/packs" className="transition-colors hover:text-white">
              전체 팩
            </Link>
            <span className="mx-1.5" aria-hidden>
              /
            </span>
            <span className="text-mute">{category.name}</span>
          </nav>

          <div className="mt-7 flex items-start gap-5">
            <span
              className="grid size-14 shrink-0 place-items-center rounded-2xl text-2xl"
              style={{
                color: category.accent[1],
                backgroundImage: `linear-gradient(135deg, ${category.accent[0]}33, ${category.accent[1]}1a)`,
              }}
              aria-hidden
            >
              {category.glyph}
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                무료 {category.name}
              </h1>
              <p className="mt-1.5 text-sm text-mute">{category.nameEn}</p>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-mute sm:text-base">
                {category.description}
              </p>
            </div>
          </div>

          <dl className="mt-9 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <div className="flex items-baseline gap-2">
              <dt className="text-mute">팩</dt>
              <dd className="font-mono text-white">{packs.length}</dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="text-mute">사운드</dt>
              <dd className="font-mono text-white">{sounds.length}</dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="text-mute">총 길이</dt>
              <dd className="font-mono text-white">
                {Math.round(totalSeconds)}초
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        {packs.length === 0 ? (
          <p className="py-20 text-center text-sm text-mute">
            이 카테고리에는 아직 팩이 없습니다.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {packs.map((pack) => (
              <PackCard key={pack.slug} pack={pack} />
            ))}
          </div>
        )}

        <div className="mt-14">
          <AdSlot format="horizontal" />
        </div>
      </section>

      <section className="border-t border-ink-800 bg-ink-900/40">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-sm font-semibold tracking-[0.14em] text-ink-600 uppercase">
            다른 카테고리
          </h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {CATEGORIES.filter((item) => item.slug !== category.slug).map((item) => (
              <Link
                key={item.slug}
                href={`/categories/${item.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink-800 bg-ink-900 px-4 py-2 text-sm text-mute transition-colors hover:border-ink-700 hover:text-white"
              >
                <span aria-hidden>{item.glyph}</span>
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}