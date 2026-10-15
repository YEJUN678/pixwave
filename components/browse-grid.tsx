"use client";

import { useMemo, useState } from "react";
import PackCard from "./pack-card";
import { CATEGORIES, type Pack } from "@/lib/packs";

type SortKey = "featured" | "name" | "count";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "추천순" },
  { key: "name", label: "이름순" },
  { key: "count", label: "사운드 수" },
];

export default function BrowseGrid({ packs }: { packs: Pack[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [license, setLicense] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("featured");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = packs.filter((pack) => {
      if (category && pack.category !== category) return false;
      if (license && pack.license !== license) return false;
      if (!q) return true;

      const haystack = [
        pack.name,
        pack.nameEn,
        pack.description,
        ...pack.sounds.flatMap((sound) => [
          sound.name,
          sound.nameEn,
          ...sound.tags,
        ]),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "ko");
      if (sort === "count") return b.sounds.length - a.sounds.length;
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.name.localeCompare(b.name, "ko");
    });
  }, [packs, query, category, license, sort]);

  const totalSounds = results.reduce((sum, p) => sum + p.sounds.length, 0);
  const hasFilter = Boolean(query || category || license);

  const reset = () => {
    setQuery("");
    setCategory(null);
    setLicense(null);
  };

  return (
    <div>
      {/* 검색 */}
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="사운드 이름, 태그, 팩 이름으로 검색 (예: 클릭, coin, 충전)"
          aria-label="사운드 팩 검색"
          className="w-full rounded-xl border border-ink-800 bg-ink-900 py-3.5 pr-4 pl-11 text-sm text-white placeholder:text-ink-600 transition-colors focus:border-ink-600 focus:outline-none"
        />
      </div>

      {/* 필터 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Chip active={!category} onClick={() => setCategory(null)}>
          전체
        </Chip>
        {CATEGORIES.map((item) => (
          <Chip
            key={item.slug}
            active={category === item.slug}
            onClick={() => setCategory(category === item.slug ? null : item.slug)}
          >
            <span aria-hidden className="opacity-70">
              {item.glyph}
            </span>
            {item.name}
          </Chip>
        ))}

        <span className="mx-1 hidden h-5 w-px bg-ink-800 sm:block" aria-hidden />

        <Chip active={license === "CC0"} onClick={() => setLicense(license === "CC0" ? null : "CC0")}>
          CC0
        </Chip>
        <Chip
          active={license === "CC-BY-4.0"}
          onClick={() => setLicense(license === "CC-BY-4.0" ? null : "CC-BY-4.0")}
        >
          CC BY
        </Chip>

        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="sort" className="sr-only">
            정렬 기준
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-ink-800 bg-ink-900 px-3 py-1.5 text-xs text-mute transition-colors focus:border-ink-600 focus:outline-none"
          >
            {SORTS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 결과 요약 */}
      <div className="mt-8 flex items-baseline gap-2 border-b border-ink-800 pb-3 text-sm">
        <span className="font-mono text-white">{results.length}</span>
        <span className="text-mute">개 팩</span>
        <span className="text-ink-700">·</span>
        <span className="font-mono text-white">{totalSounds}</span>
        <span className="text-mute">개 사운드</span>
        {hasFilter && (
          <button
            type="button"
            onClick={reset}
            className="ml-auto text-xs text-brand-2 transition-opacity hover:opacity-70"
          >
            필터 초기화
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="mt-16 rounded-2xl border border-dashed border-ink-800 py-20 text-center">
          <p className="text-sm text-mute">검색 결과가 없습니다.</p>
          <button
            type="button"
            onClick={reset}
            className="mt-3 text-sm font-semibold text-brand-2 transition-opacity hover:opacity-70"
          >
            필터 초기화하기
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((pack) => (
            <PackCard key={pack.slug} pack={pack} />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
        active
          ? "border-brand bg-brand/12 text-white"
          : "border-ink-800 bg-ink-900 text-mute hover:border-ink-700 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}