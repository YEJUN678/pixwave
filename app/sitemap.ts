import type { MetadataRoute } from "next";
import { CATEGORIES, PACKS } from "@/lib/packs";
import { site } from "@/lib/site";

/** 프리렌더 중 값이 바뀌지 않도록 모듈 스코프에서 고정 */
const now = new Date();

export default function sitemap(): MetadataRoute.Sitemap {

  const staticRoutes = [
    { path: "", priority: 1 },
    { path: "/packs", priority: 0.9 },
    { path: "/about", priority: 0.5 },
    { path: "/license", priority: 0.5 },
  ].map((route) => ({
    url: `${site.url}${route.path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: route.priority,
  }));

  return [
    ...staticRoutes,
    ...CATEGORIES.map((category) => ({
      url: `${site.url}/categories/${category.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...PACKS.map((pack) => ({
      url: `${site.url}/packs/${pack.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}