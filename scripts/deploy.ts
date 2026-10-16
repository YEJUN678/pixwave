/**
 * YEJUN678.github.io 로 정적 사이트를 배포합니다.
 *
 * 실행: npm run deploy
 *
 * GitHub Actions 가 아직 PAT 를 못 쓰는 상태일 때 쓰는 경로입니다.
 * 워크플로우(PAGES_DEPLOY_TOKEN Secret)가 설정되면 이 스크립트는 안 써도 됩니다.
 *
 * 하는 일:
 *   1. NEXT_PUBLIC_SITE_URL 로 정적 export
 *   2. out/ 을 임시 디렉터리에 복사 + .nojekyll 추가
 *   3. YEJUN678.github.io 저장소로 푸시 (커밋 그대로, 히스토리 보존)
 *
 * Pages 빌드는 푸시 직후 시작되므로 반영까지 1~2분 걸립니다.
 */
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const PAGES_REPO = process.env.PAGES_REPO ?? "YEJUN678/YEJUN678.github.io";
const SITE_URL = process.env.SITE_URL ?? "https://YEJUN678.github.io";
const REMOTE = `https://github.com/${PAGES_REPO}.git`;

/**
 * git 은 shell 없이 직접 실행합니다.
 * shell 을 거치면 Windows cmd 가 공백에서 인자를 쪼개버려서
 * 커밋 메시지("deploy: ... UTC")가 세 개의 pathspec 으로 해석됩니다.
 */
function git(args: string[], cwd?: string): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function step(msg: string): void {
  console.log(`\n[36m▸ ${msg}[0m`);
}

// ── 1. 빌드 ──────────────────────────────────────────────
step(`정적 export (${SITE_URL})`);
execFileSync("npm.cmd", ["run", "build"], {
  encoding: "utf8",
  stdio: "inherit",
  shell: true,
});

const out = resolve(process.cwd(), "out");
if (!existsSync(join(out, "index.html"))) {
  console.error("out/index.html 이 없습니다 — 빌드가 실패했습니다.");
  process.exit(1);
}

// ── 2. 스테이징 ─────────────────────────────────────────
step("배포본 준비");
const stage = mkdtempSync(join(tmpdir(), "pixwave-deploy-"));
cpSync(out, stage, { recursive: true });
// Jekyll 이 _next/ 를 무시하므로 Pages 는 .nojekyll 이 꼭 있어야 합니다
writeFileSync(join(stage, ".nojekyll"), "");

// ── 3. 푸시 ─────────────────────────────────────────────
step(`${PAGES_REPO} 로 푸시`);
git(["init", "-q", "-b", "main"], stage);
git(["add", "-A"], stage);
git(["config", "user.name", "YEJUN678"], stage);
git(["config", "user.email", "hirobababo0@gmail.com"], stage);

const files = git(["ls-files"], stage).split("\n").filter(Boolean);
console.log(`  ${files.length}개 파일`);

// 기존 커밋 위에 얹어야 히스토리가 남습니다 (Pages 는 rebuild 로는 못 갱신)
let hasHistory = true;
try {
  git(["remote", "add", "origin", REMOTE], stage);
  git(["fetch", "--depth", "1", "origin", "main"], stage);
  git(["reset", "--soft", "FETCH_HEAD"], stage);
} catch {
  hasHistory = false;
  console.log("  원격에 커밋이 없어 새 히스토리로 시작합니다");
}

const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
git(["commit", "-q", "-m", `deploy: ${stamp} UTC`], stage);
git(["push", "-q", hasHistory ? "origin" : "--force", "HEAD:main"], stage);

const sha = git(["rev-parse", "--short", "HEAD"], stage).trim();
rmSync(stage, { recursive: true, force: true });

console.log(`\n[32m✓ 배포 완료[0m  ${SITE_URL}  (${sha})`);
console.log("  Pages 반영까지 1~2분 걸립니다.\n");