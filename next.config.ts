import type { NextConfig } from "next";

/**
 * 배포 대상
 * ------------
 * - GitHub Pages (YEJUN678.github.io)  : out/ 폴더를 정적 호스팅
 * - Vercel 등 Node 서버             : 이 설정을 그대로 쓰면 안 됩니다
 *
 * `DEPLOY_TARGET=server npm run build` 로 서버 빌드로 되돌릴 수 있습니다.
 */
const isStaticExport = process.env.DEPLOY_TARGET !== "server";

/**
 * GitHub Pages 를 위한 basePath.
 * 계정 직속(github.io) 배포라 기본값은 빈 문자열입니다.
 * 저장소형 페이지(YEJUN678.github.io/pixwave)로 옮기려면 '/pixwave' 로 바꾸세요.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  /**
   * cacheComponents(Partial Prerendering) 는 꺼 둡니다.
   *
   * 이 사이트는 90개 페이지가 전부 빌드 시점에 정적으로 생성되므로
   * PPR 로 얻는 이득이 없습니다. 반면 비용이 있습니다.
   * stream 이 먼저 시작되면 존재하지 않는 slug 에서 notFound() 를 불러도
   * HTTP 상태코드가 404 가 아닌 200(soft 404) 이 되어 버립니다.
   * dynamicParams = false 는 PPR 이 켜져 있을 때 쓸 수 없어서,
   * SEO 에 영향이 있는 상태코드 문제를 고치려면 이쪽을 포기해야 합니다.
   */
  cacheComponents: false,
  partialPrefetching: false,

  /** 정적 HTML 로 내보내기 (GitHub Pages 용) */
  ...(isStaticExport ? { output: "export" as const } : {}),

  /**
   * GitHub Pages 는 디렉토리 index 처리를 해주지 않습니다.
   * `/packs` 요청에 Pages 가 `packs/index.html` 을 찾아주게 하려면
   * trailingSlash 가 반드시 true 여야 합니다.
   * (false 면 out/packs.html 로 나와서 /packs 가 404 가 됩니다)
   */
  ...(isStaticExport ? { trailingSlash: true as const } : {}),

  /** 저장소형 페이지 배포 시에만 경로를 붙입니다 */
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),

  images: {
    // 정적 export 에서는 이미지 최적화 서버가 없습니다.
    unoptimized: true,
  },

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
