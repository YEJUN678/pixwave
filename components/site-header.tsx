"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/packs", label: "전체 팩" },
  { href: "/categories/notification", label: "알림음" },
  { href: "/categories/ui", label: "UI" },
  { href: "/categories/game", label: "게임" },
  { href: "/categories/charging", label: "충전음" },
  { href: "/license", label: "라이선스" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-800 bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
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
          <span className="text-[15px] font-semibold tracking-tight">Pixwave</span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-ink-850 text-white"
                    : "text-mute hover:bg-ink-900 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/packs"
            className="hidden rounded-lg bg-white px-4 py-2 text-sm font-semibold text-ink-950 transition-opacity hover:opacity-90 sm:inline-block"
          >
            사운드 둘러보기
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="메뉴 열기"
            className="grid size-9 place-items-center rounded-lg border border-ink-800 text-mute md:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              {open ? (
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          className="border-t border-ink-800 bg-ink-950 px-5 py-3 md:hidden"
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-lg px-3 py-2.5 text-sm text-mute hover:bg-ink-900 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}