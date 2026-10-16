# Pixwave — 무료 사운드 팩 사이트

알림음, UI, 게임 효과음, 발걸음, 날씨, 동물, 마법, 공포, 차량, 사람 소리까지
**CC0 / CC BY 4.0** 라이선스로 제공하는 무료 사운드 팩 라이브러리.

상업적 이용이 가능하고, 회원가입 없이 바로 받습니다.

**484개 사운드 · 59개 팩 · 22개 카테고리 · 총 785초**

## 핵심 아이디어

사운드는 두 가지 방식으로 제공합니다.

### 1. 합성 사운드 (470개) — 바이너리 파일이 없음

사운드를 전부 파라미터(`SynthSpec`)로 서술합니다.

```
SynthSpec (lib/packs.ts)
  ├─ renderSpec() → Float32Array → Web Audio   (미리듣기)
  └─ renderSpec() → encodeWav()  → .wav        (다운로드)
```

같은 샘플을 양쪽에 쓰므로 **"들은 소리 = 받은 파일"** 이 보장됩니다.
파일을 찾아 스트리밍하는 사이트가 아니므로 CDN 비용도 없습니다.

### 2. 실제 녹음 (14개) — 파일로 제공

박수, 웃음, 클릭, 천둥 등은 합성이 왜곡되기 쉬워 원본 녹음을 사용합니다.
`npm run import:audio` 가 원본을 사이트 규격으로 바꿔 등록합니다.

```
원본 WAV ( Downloads/clap1.wav 등 )
  └─ scripts/import-audio.ts
       ├─ LIST 청크까지 파싱
       ├─ 이벤트 분리 ("클릭 3회분" → "클릭 1회")
       ├─ 무음 트리밍 → 44.1kHz 리샘플 → 모노 → 피크 0.89
       ├─ public/audio/*.wav 저장
       └─ lib/audio-files.ts 자동 생성  ← 파형 바·길이·크기
```

`lib/audio-files.ts` 는 **생성 파일**입니다. 손으로 고치지 마세요.

## 구조

```
app/
  page.tsx                    홈
  packs/page.tsx              전체 팩 + 검색/필터
  packs/[slug]/page.tsx       팩 상세 (개별 미리듣기 + ZIP 다운로드)
  categories/[slug]/page.tsx  카테고리
  license/page.tsx            라이선스 안내
  about/page.tsx              서비스 소개
  sitemap.ts  robots.ts

components/
  sound-player.tsx   재생 + 파형 시각화 + 다운로드   (client)
  download-pack.tsx  팩 전체 ZIP 다운로드           (client)
  browse-grid.tsx    검색 / 카테고리 / 라이선스 필터 (client)
  pack-card.tsx      팩 카드                         (server)
  clickmon-ads.tsx   배너 / 전면 / 아이콘 광고
  ad-slot.tsx        광고 슬롯 (배너로 연결)

lib/
  audio.ts        합성 엔진 · WAV 인코더 · 엔벨로프 시각화
  presets.ts      SFX 생성기 (실감의 핵심)
  zip.ts          의존성 없는 ZIP 작성기 (STORE, 무압축)
  packs.ts        카테고리 · 팩 · 사운드 데이터
  audio-files.ts  ★ 자동 생성 — 실제 녹음 파일 등록 정보
  site.ts         사이트 설정 · 라이선스 정의
  format.ts       공용 포맷터

scripts/
  import-audio.ts   원본 녹음 → public/audio + audio-files.ts
  verify.ts         전수 음향/바이트 검증
  tsconfig.verify.json
```

## 사운드 추가하는 법

### 합성 사운드

`lib/packs.ts` 의 `PACKS` 배열에 한 줄만 추가합니다.

```ts
S("my-sound", "내 사운드", "My Sound", "태그 태그", impact({ body: 120, decay: 0.2 })),
```

| 프리셋 계열 | 대표 함수 |
| --- | --- |
| 타격 | `impact` `softKnock` `crunch` `punch` |
| 금속/공명 | `metal` `pluck` `glassBreak` `bell` |
| 공기 | `swoosh` `wind` `swordSwing` `arrowWhoosh` |
| 물 | `waterDrop` `splash` `bubbles` `pourLiquid` `flowingWater` |
| 불/날씨 | `fire` `thunder` `rain` `lightning` |
| 동물 | `bark` `meow` `wolfHowl` `lionRoar` `crowd` |
| 기계/SF | `servo` `clack` `laser` `zap` `motorSpin` `siren` |
| 사람 | `laugh` `cough` `sneeze` `grunt` `breath` |
| UI | `uiClick` `uiToggle` `uiError` `uiSuccess` `mouseClick` |
| 마법 | `spellCast` `portalOpen` `teleport` `sparkle` |
| 멜로디 | `melody` `melodyCalm` `melodyUplift` `melodyChip` |

`SynthSpec` 을 직접 쓰고 싶다면:
`{ duration, layers: [{ source, notes, filter, amp, gain }], bus: { drive, reverb, delay } }`
— `lib/audio.ts` 의 타입 정의를 보세요.

### 실제 녹음 사운드

1. 원본 WAV 를 저장소 바로 위 디렉터리(`Downloads/`)에 놓습니다
2. `scripts/import-audio.ts` 의 `JOBS` 에 등록합니다
3. `npm run import:audio` — 다른 곳에 있다면 `AUDIO_SRC_DIR` 로 경로를 지정합니다
4. `lib/packs.ts` 에서 `F("id", "이름", "Name", "태그", "레지스트리키")`

## 실행

```bash
npm install
npm run dev            # http://localhost:3000
npm run build          # 정적 92개 페이지 생성 (out/)
npm run verify         # 전수 검증 (원본 녹음 불필요)
npm run import:audio   # 원본 녹음 재변환 (레지스트리 자동 갱신)
npm run verify:rebuild # import + verify
```

`import:audio` 는 이 컴퓨터에만 있는 원본 녹음이 필요합니다. 원본을 찾지 못하면
경고만 남기고 정상 종료합니다 — `public/audio/*.wav` 는 이미 저장소에 커밋돼
있으므로 빌드·CI 에서는 `npm run verify` 만 돌리면 됩니다.

## 합성 엔진에 들어 있는 것

단순한 사인파 + 화이트노이즈로는 실감이 안 나므로 다음을 모두 구현했습니다.

- **TPT 상태변수 필터** — 공진(Q) + 컷오프 스윕. 필터 스윕이 타격음의 핵심입니다
- **지수 감쇠 / ADSR** — 짧은 음은 타격형, 긴 음은 유지 후 릴리즈
  (이 구분이 없으면 6초짜리 드론이 2초 만에 죽습니다)
- **핑크·브라운 노이즈** — 흰 노이즈만 쓰면 빗소리와 바람이 종이 뭉칩니다
- **비조화 부분음 뱅크** — 현악·종·심벌
- **Karplus-Strong** — 현악기 플럭
- **Schroeder 리버브** — 4_comb + 2_allpass, RT60
- **피드백 딜레이**
- **DC 차단** — 반드시 드라이브 *뒤* (tanh 가 새로운 DC 를 만듭니다)
- **결정론적 난수** — 미리듣기 == 다운로드

## 검증

`npm run verify` 가 484개 전수를 검사합니다.

- **합성 470개** — NaN 없음, 클리핑 없음, 무음 없음, 길이 선언값과 일치
- **실제 파일 14개** — 존재/크기/헤더/44.1kHz/모노/16bit/길이 일치
- **음향 타당성** — 크레스트, 활성 구간 비율, 스펙트럼 중심(Goertzel),
  DC 오프셋, 에너지 시간 중심
- **WAV 헤더 470개** — RIFF/WAVE/fmt/data, PCM/모노/44.1k/16bit, 크기 정합
- **ZIP 485항목** — 로컬 헤더/EOCD 시그니처, 엔트리 수, 중앙 디렉터리

측정값 기준: 합성 평균 스펙트럼 중심 951Hz / 파일 711Hz, 파일 클리핑 0%.

## 광고 (clickmon)

`components/clickmon-ads.tsx` 에 세 개가 들어 있습니다.

| 종류 | 위치 | 방식 |
| --- | --- | --- |
| 배너 320x100 | 홈 · 전체 팩 · 카테고리 · 팩 상세 | `<iframe srcDoc>` |
| 전면 (팝) | 전 페이지, 세션당 1회 | body 직속 `<script>` (파싱 중 실행) |
| 아이콘 | 전 페이지, 세션당 1회 | body 직속 `<script>` (파싱 중 실행) |

### 왜 배너만 iframe인가

광고 코드가 전부 `document.write` 기반이라 **파싱 중에 실행되어야** 합니다.
페이지에 그대로 두면 서버 HTML 에는 들어가지만 **React 하이드레이션이
주입된 노드를 지워** 버려 광고가 안 뜹니다.

iframe 은 독립된 문서로 파싱되므로 `document.write` 가 정상 동작하고,
React 는 iframe 내부를 건드리지 않습니다.

전면·아이콘은 `body` 직속에 두면 하이드레이션에 지워지지 않으므로 iframe 이 필요 없습니다.
**절대로 `appendChild` 로 바꾸지 마세요** — 로드 이후 실행되는 스크립트가
내부에서 `document.write` 를 쓰면 **문서 전체가 날아갑니다.**

전면 광고는 body 맨 끝에서 실행해 파싱 중에 뜨게 하고, 세션당 1회만
보이도록 세션 가드를 걸었습니다 (`SESSION_ONCE` 상수로 해제 가능).

계정 식별자는 `NEXT_PUBLIC_CLICKMON_ACCOUNT` 로 뺄 수 있습니다.

### 전면·아이콘이 안 뜹니다 (2026-10 확인)

광고 서버가 빈 응답을 줍니다. 코드 문제가 아닙니다.

| 끝포인트 | 응답 | 렌더 |
| --- | --- | --- |
| `wp_m_320_100_js.php` (배너) | 200 / 779 bytes | 쿠팡 광고 표시됨 |
| `wp_m_pop.php` (전면) | 200 / **0 bytes** | 안 뜸 |
| `wp_m_icon.php` (아이콘) | 200 / **0 bytes** | 안 뜸 |

Referer 를 localhost / example.com / naver.com 으로 바꿔도 동일합니다.
**clickmon 광고주 콘솔에서 전면(팝)·아이콘 상품이 이 계정
(`CM_M_1003067`) 에 승인·활성화되어 있는지, 그리고 해당 상품의
PopAd 코드가 따로 있는지 확인해야 합니다.**

### SEO 주의

전면 광고는 Google 의 침습적 인터스티셜 정책에 걸릴 수 있고,
검색 유입이 이 사이트의 핵심 매출원입니다. 실제로는 첫 진입 1회만 뜨지만,
트래픽이 늘면 전면 광고를 끄는 편이 순이익이 클 수 있습니다.

## 알려진 한계

- **한국어 검색이 부분 문자열에 걸립니다.** `비`를 치면 `위시브 내비`도 나옵니다.
  띄어쓰기 분리를 붙이면 해결됩니다.
- **합성 엔진은 실제 녹음보다 뭉툭합니다.** 사람 말소리는 읽을 수 있는 단어를
  만들지 못합니다. 그런 사운드는 원본 녹음을 쓰세요.
- **lib/packs.ts 는 서버·클라이언트 공용**이라 팩이 수백 개로 늘면 클라이언트
  번들이 무거워집니다. 그때는 데이터와 컴포넌트를 서버 전용으로 분리하세요.
- 원본 녹음 일부는 피크가 0 dBFS 를 찍습니다(입력 클리핑). 정규화로 0.89 로
  낮췄지만 클리핑 distortion 은 원본에 이미 있습니다.
