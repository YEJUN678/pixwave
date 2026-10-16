import type { MetadataRoute } from "next";
import { CATEGORIES, PACKS } from "@/lib/packs";
import { site } from "@/lib/site";

/** 프리렌더 중 값이 바뀌지 않도록 모듈 스코프에서 고정 */
const now = new Date();

/** 정적 export 에서는 route handler 가 반드시 force-static 여야 합니다 */
export const dynamic = "force-static";

/**
 * sitemap URL 은 canonical 과 형식을 맞춰야 합니다.
 * 정적 export(trailingSlash: true) 에서 Next 는 canonical 에
 * `/packs/ui-clicks/` 처럼 슬래시를 붙입니다. sitemap 에서 빼면
 * 두 개가 서로 다른 URL 로 정규화되어 크롤러가 혼란스러워합니다.
 */
function url(path: string): string {
  if (!path || path === "/") return site.url + "/";
  return site.url + path.replace(/\/$/, "") + "/";
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    { path: "/", priority: 1 },
    { path: "/packs", priority: 0.9 },
    { path: "/about", priority: 0.5 },
    { path: "/license", priority: 0.5 },
  ].map((route) => ({
    url: url(route.path),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: route.priority,
  }));

  return [
    ...staticRoutes,
    ...CATEGORIES.map((category) => ({
      url: url(`/categories/${category.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...PACKS.map((pack) => ({
      url: url(`/packs/${pack.slug}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
