import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** 정적 export 에서는 route handler 가 반드시 force-static 여야 합니다 */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${site.url}/sitemap.xml`,
  };
}