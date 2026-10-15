import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * cacheComponents(Partial Prerendering) 는 꺼 둡니다.
   *
   * 이 사이트는 92개 페이지가 전부 빌드 시점에 정적으로 생성되므로
   * PPR 로 얻는 이득이 없습니다. 반면 비용이 있습니다.
   * stream 이 먼저 시작되면 존재하지 않는 slug 에서 notFound() 를 불러도
   * HTTP 상태코드가 404 가 아닌 200(soft 404) 이 되어 버립니다.
   * dynamicParams = false 는 PPR 이 켜져 있을 때 쓸 수 없어서,
   * SEO 에 영향이 있는 상태코드 문제를 고치려면 이쪽을 포기해야 합니다.
   */
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
