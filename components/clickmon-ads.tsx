/**
 * clickmon 광고 (배너 / 아이콘 / 전면)
 * ─────────────────────────────────────────────────────────────
 * 광고 코드가 전부 `document.write` 기반이라 **문서가 파싱되는 중에만**
 * 안전합니다. 로드가 끝난 뒤 실행하면 `document.writeln` 이 문서 전체를
 * 지워버립니다. 그래서 전부 파싱 중에 실행되도록 배치했습니다.
 *
 *   - 배너  : React 하이드레이션이 주입 노드를 지우므로 iframe 으로 격리
 *   - 전면  : body 직속 <script> — 하이드레이션에 지워지지 않음
 *   - 아이콘: 전면과 동일
 *
 * ⚠ 절대 appendChild 로 바꾸지 마세요. 로드 이후 실행되는 스크립트가
 *   내부에서 document.write 를 쓰면 문서 전체가 날아갑니다.
 */

const BASE = "https://mtab.clickmon.co.kr/pop";

/**
 * 광고 계정 식별자.
 * 도메인(pixwave.io) 을 바꾸거나 계정을 교체할 때 이 값만 바꾸면 됩니다.
 * .env.local 에 NEXT_PUBLIC_CLICKMON_ACCOUNT 로 둘 수도 있습니다.
 */
const ACCOUNT =
  process.env.NEXT_PUBLIC_CLICKMON_ACCOUNT ??
  "CM_M_1003067%7C%5E%7CCM_A_1157408%7C%5E%7CAdver_M_1046207";

// ───────────────────── 1. 배너 (320x100) ─────────────────────

/**
 * 320x100 배너.
 *
 * 광고 코드가 `document.write` 기반이라 **파싱 중에 실행되어야** 하는데,
 * 그대로 페이지에 두면 React 하이드레이션이 주입된 노드를 지웁니다
 * (서버 HTML 에는 들어가 있지만 브라우저 DOM 에서 사라짐).
 *
 * 그래서 iframe 안에 넣습니다. iframe 의 문서는 독립적으로 파싱되므로
 * document.write 가 정상 동작하고, React 는 iframe 내부를 건드리지 않아
 * 하이드레이션 충돌이 없습니다.
 * ad iframe 안에서 document.referrer 는 부모 페이지 URL 이 되어 의도대로 동작합니다.
 */
export function ClickmonBanner({
  format = "horizontal",
}: {
  format?: "horizontal" | "in-article";
}) {
  const box = format === "horizontal" ? "h-[134px]" : "h-[100px]";

  const adDoc =
    `<!DOCTYPE html><html><head><meta charset="utf-8">` +
    `<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}</style>` +
    `</head><body><script>` +
    // 원본과 동일하게 매개변수는 7개(cl,i,c,k,l,m,o,n), 인자는 5개.
    // l 의 값이 'N' 이므로 매개변수를 하나 줄이면 "l is not defined" 로 죽습니다.
    `(function(cl,i,c,k,l,m,o,n){m=c;o=cl.referrer;m+='&mon_rf='+encodeURIComponent(o);m+='&W100='+l;n='<'+i+' type="text/javascript" src="'+m+'"></'+i+'>';cl.writeln(n);})(document,'script','${BASE}/wp_m_320_100_js.php?PopAd=${ACCOUNT}','PASSBACK_INPUT','N');` +
    `<\/script></body></html>`;

  return (
    <aside
      aria-label="광고 영역"
      data-ad-slot={format}
      className={`flex w-full items-center justify-center overflow-hidden rounded-2xl border border-ink-800 bg-ink-900/40 ${box}`}
    >
      <iframe
        title="광고"
        srcDoc={adDoc}
        width={320}
        height={100}
        loading="lazy"
        referrerPolicy="unsafe-url"
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        className="border-0"
        style={{ width: 320, height: 100 }}
      />
    </aside>
  );
}

// ───────────────────── 2. 전면 (팝) ─────────────────────

/**
 * 세션당 1회 노출 가드.
 * SESSION_ONCE 를 false 로 바꾸거나 해당 부분을 통째로 빼면 매 진입마다 뜹니다.
 */
const SESSION_ONCE = true;

function once(key: string, code: string): string {
  if (!SESSION_ONCE) return code;
  const gate = `(function(){try{if(sessionStorage.getItem('${key}'))return;sessionStorage.setItem('${key}','1');}catch(e){return;}\n`;
  return `${gate}${code}\n})();`;
}

/**
 * 전면 광고.
 * body 맨 마지막에 둬서 **파싱 중에** 실행되게 합니다.
 * body 직속이라 React 하이드레이션이 지우지 않습니다.
 */
export function ClickmonInterstitial() {
  return (
    <script
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: once(
          "cm_pop_seen",
          `(function(cl,i,c,k,m,o,n){m=c;o=cl.referrer;m+='&mon_rf='+encodeURIComponent(o);n='<'+i+' type="text/javascript" src="'+m+'"></'+i+'>';cl.writeln(n);})(document,'script','${BASE}/wp_m_pop.php?PopAd=${ACCOUNT}&iveiw=no');`,
        ),
      }}
    />
  );
}

/**
 * 플로팅 아이콘 광고.
 *
 * 전면과 동일하게 body 직속 + 파싱 중 실행으로 둡니다.
 * 일부러 appendChild 로 바꾸지 마세요 — 로드 이후에 실행되는 스크립트가
 * 내부에서 document.write 를 쓰면 **문서 전체가 날아갑니다.**
 */
export function ClickmonIcon() {
  return (
    <script
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: once(
          "cm_icon_seen",
          `(function(cl,i,c,k,m,o,n){m=c;o=cl.referrer;m+='&mon_rf='+encodeURIComponent(o);n='<'+i+' type="text/javascript" src="'+m+'"></'+i+'>';cl.writeln(n);})(document,'script','${BASE}/wp_m_icon.php?PopAd=${ACCOUNT}');`,
        ),
      }}
    />
  );
}
