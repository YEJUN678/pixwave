import Link from "next/link";
import { CATEGORIES } from "@/lib/packs";
import { site, YEAR } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ink-800 bg-ink-950">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <span
                className="grid size-8 place-items-center rounded-lg text-ink-950"
                style={{
                  backgroundImage: "linear-gradient(135deg, #7c5cff, #22d3ee)",
                }}
                aria-hidden
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                  <path d="M4 9.5h2.2L8.6 17 11 6.5h2L15.4 17l2.4-7.5H20l-3.6 11h-2.1L12 13.5 11.7 20.5H9.6Z" />
                </svg>
              </span>
              <span className="text-[15px] font-semibold tracking-tight">{site.name}</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-mute">
              {site.description}
            </p>
          </div>

          <nav aria-labelledby="footer-categories">
            <h2
              id="footer-categories"
              className="text-xs font-semibold tracking-[0.14em] text-ink-600 uppercase"
            >
              카테고리
            </h2>
            <ul className="mt-4 space-y-2.5">
              {CATEGORIES.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="text-sm text-mute transition-colors hover:text-white"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-info">
            <h2
              id="footer-info"
              className="text-xs font-semibold tracking-[0.14em] text-ink-600 uppercase"
            >
              정보
            </h2>
            <ul className="mt-4 space-y-2.5">
              {[
                { href: "/packs", label: "전체 사운드 팩" },
                { href: "/license", label: "라이선스 안내" },
                { href: "/about", label: "서비스 소개" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-mute transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-xs font-semibold tracking-[0.14em] text-ink-600 uppercase">
              포맷
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-mute">
              <li>44.1 kHz · 16-bit · Mono</li>
              <li>PCM WAV (무손실)</li>
              <li>ZIP 묶음 다운로드</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-ink-800 pt-6 text-xs text-ink-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© {YEAR} {site.name}. 모든 사운드는 합성 생성물입니다.</p>
          <p>CC0 / CC BY 4.0 — 상업적 이용 가능</p>
        </div>
      </div>
    </footer>
  );
}