import Link from "next/link";
import SoundPlayer from "./sound-player";
import { LICENSES } from "@/lib/site";
import { getCategory, type Pack } from "@/lib/packs";

export default function PackCard({ pack }: { pack: Pack }) {
  const category = getCategory(pack.category);
  const license = LICENSES[pack.license];
  const preview = pack.sounds[0];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-ink-800 bg-ink-900 transition-colors duration-200 hover:border-ink-700 hover:bg-ink-850">
      <div
        className="absolute inset-x-0 top-0 h-32 opacity-[0.14] transition-opacity duration-300 group-hover:opacity-25"
        style={{
          backgroundImage: `radial-gradient(120% 100% at 50% 0%, ${pack.accent[0]}, transparent 70%)`,
        }}
      />

      <div className="relative flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-mute">
              {category && (
                <Link
                  href={`/categories/${category.slug}`}
                  className="relative z-10 inline-flex items-center gap-1.5 rounded-full border border-ink-700 px-2 py-0.5 transition-colors hover:border-ink-600 hover:text-white"
                >
                  <span aria-hidden>{category.glyph}</span>
                  {category.name}
                </Link>
              )}
              {pack.featured && (
                <span className="rounded-full border border-ink-700 px-2 py-0.5 text-brand">
                  인기
                </span>
              )}
            </div>

            <h3 className="mt-2.5 text-lg font-semibold tracking-tight text-white">
              <Link href={`/packs/${pack.slug}`} className="before:absolute before:inset-0">
                {pack.name}
              </Link>
            </h3>
            <p className="mt-0.5 text-xs text-mute">{pack.nameEn}</p>
          </div>

          <span
            className="mt-1 grid size-9 shrink-0 place-items-center rounded-xl text-base"
            style={{
              backgroundImage: `linear-gradient(135deg, ${pack.accent[0]}33, ${pack.accent[1]}22)`,
              color: pack.accent[1],
            }}
            aria-hidden
          >
            {category?.glyph ?? "♪"}
          </span>
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-mute">
          {pack.description}
        </p>

        <div className="mt-auto space-y-4 pt-1">
          <div className="relative z-10">
            <SoundPlayer sound={preview} accent={pack.accent} compact />
          </div>

          <div className="flex items-center justify-between border-t border-ink-800 pt-3 text-xs text-mute">
            <span>
              사운드 <span className="font-mono text-white">{pack.sounds.length}</span>개
            </span>
            <span title={license.summary}>{license.id}</span>
          </div>
        </div>
      </div>
    </article>
  );
}