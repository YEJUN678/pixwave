export const site = {
  name: "Pixwave",
  tagline: "무료 사운드 팩 · 상업적 이용 가능",
  description:
    "알림음, UI, 게임 효과음, 벨소리까지. 브라우저에서 바로 듣고 WAV로 내려받는 무료 사운드 팩 라이브러리.",
  /**
   * canonical / sitemap / og:url 에 쓰이는 정식 도메인.
   *
   * GitHub Pages(github.io) 로 먼저 배포할 때는 NEXT_PUBLIC_SITE_URL 로
   * 실제 배포 주소를 넘겨야 합니다. 그대로 두면 아직 없는
   * pixwave.io 를 가리키게 됩니다.
   */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://pixwave.io").replace(/\/$/, ""),
  locale: "ko_KR",
} as const;

/**
 * 빌드 시점 기준 연도.
 * 렌더 중에 `new Date()` 를 부르면 프리렌더가 불안정해지므로 모듈 상수로 고정합니다.
 */
export const YEAR = new Date().getFullYear();

/**
 * Open Graph 태그를 한곳에서 만듭니다.
 *
 * Next 는 metadata 를 레이아웃 → 페이지 순으로 top-level 키 단위로 덮어씁니다.
 * 페이지에서 `openGraph` 를 한 번만 지정하면 루트의 og:url / og:siteName 이
 * 통째로 사라집니다 — 실제로 팩 상세 페이지에 og:url 이 빠진 이유입니다.
 */
export function og(path: string, title: string, description: string) {
  return {
    url: site.url + path,
    siteName: site.name,
    title,
    description,
    locale: site.locale,
  };
}

export type License = {
  id: "CC0" | "CC-BY-4.0";
  name: string;
  summary: string;
  url: string;
};

export const LICENSES: Record<License["id"], License> = {
  CC0: {
    id: "CC0",
    name: "CC0 1.0 (퍼블릭 도메인)",
    summary:
      "복사·수정·재배포·상업적 이용에 제한이 없습니다. 출처 표기도 필요 없습니다.",
    url: "https://creativecommons.org/publicdomain/zero/1.0/deed.ko",
  },
  "CC-BY-4.0": {
    id: "CC-BY-4.0",
    name: "CC BY 4.0 (출처 표기)",
    summary:
      "복사·수정·상업적 이용이 가능하지만, 앱·웹사이트에 크레딧 표기가 필요합니다.",
    url: "https://creativecommons.org/licenses/by/4.0/deed.ko",
  },
};