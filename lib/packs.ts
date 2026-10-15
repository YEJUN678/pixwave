import type { SynthSpec } from "./audio";
import { envelopeBars } from "./audio";
import type { License } from "./site";
import { audioFile } from "./audio-files";
import * as P from "./presets";

/**
 * 합성이 아닌 실제 녹음 사운드.
 * 파일은 public/audio/ 에 있고, 미리 계산해 둔 파형 바로 시각화합니다.
 */
export interface FileSound {
  /** public/ 기준 경로 */
  path: string;
  /** 길이(초) */
  duration: number;
  /** 미리 계산한 파형 바 (44개) */
  bars: number[];
  /** 파일 크기(바이트) */
  bytes: number;
}

export interface Sound {
  id: string;
  name: string;
  nameEn: string;
  tags: string[];
  /** 합성 사운드 */
  spec?: SynthSpec;
  /** 실제 녹음 파일. 지정하면 spec 대신 이쪽이 쓰입니다 */
  file?: FileSound;
}

export interface Category {
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  glyph: string;
  accent: [string, string];
}

export interface Pack {
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  category: string;
  license: License["id"];
  accent: [string, string];
  featured?: boolean;
  sounds: Sound[];
}

/** 사운드 한 줄 정의 헬퍼 */
const S = (
  id: string,
  name: string,
  nameEn: string,
  tags: string,
  spec: SynthSpec,
): Sound => ({ id, name, nameEn, tags: tags.split(/\s+/).filter(Boolean), spec });

/** 실제 녹음 파일 사운드 헬퍼 */
const F = (
  id: string,
  name: string,
  nameEn: string,
  tags: string,
  key: keyof typeof import("./audio-files").AUDIO_FILES,
): Sound => ({ id, name, nameEn, tags: tags.split(/\s+/).filter(Boolean), file: audioFile(key) });

/** 사운드 길이 (합성이든 파일이든) */
export function soundDuration(sound: Sound): number {
  return sound.file ? sound.file.duration : (sound.spec?.duration ?? 0);
}

/** 시각화용 파형 바 (합성이든 파일이든) */
export function soundBars(sound: Sound, count = 44): number[] {
  if (sound.file) {
    const src = sound.file.bars;
    if (count >= src.length) return src;
    // 44개를 count 개로 균등하게 리샘플
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
      out.push(src[Math.min(src.length - 1, Math.round((i / count) * src.length))]);
    }
    return out;
  }
  return sound.spec ? envelopeBars(sound.spec, count) : [];
}

export const CATEGORIES: Category[] = [
  { slug: "ui", name: "UI 사운드", nameEn: "UI", description: "버튼, 토글, 페이지 전환 등 인터페이스 피드백", glyph: "◈", accent: ["#38e2c4", "#1f9fd6"] },
  { slug: "notification", name: "알림 · 메시지", nameEn: "Notifications", description: "알림음, 벨, 톡, 시스템 메시지", glyph: "◔", accent: ["#8b7bff", "#5b8cff"] },
  { slug: "impact", name: "타격 · 충돌", nameEn: "Impacts", description: "부딪힘, 낙하, 깨지는 소리", glyph: "✦", accent: ["#ffb547", "#ff7a45"] },
  { slug: "whoosh", name: "휘이 · 이동", nameEn: "Whoosh", description: "스치는 공기, 휘두름, 지나감", glyph: "≈", accent: ["#a78bfa", "#6d5ef2"] },
  { slug: "explosion", name: "폭발 · 파괴", nameEn: "Explosions", description: "폭발, 파편, 붕괴", glyph: "◉", accent: ["#ff6b6b", "#d63031"] },
  { slug: "footstep", name: "발걸음", nameEn: "Footsteps", description: "표면별, 보행 속도별 발소리", glyph: "⬢", accent: ["#c8a27a", "#8d6e4f"] },
  { slug: "object", name: "사물 · 소도구", nameEn: "Objects", description: "문, 스위치, 가전제품, 공구", glyph: "▣", accent: ["#9ad0ff", "#5b8cff"] },
  { slug: "water", name: "물", nameEn: "Water", description: "방울, 튀김, 흐름", glyph: "◍", accent: ["#5bc8f5", "#2b7fd4"] },
  { slug: "fire", name: "불", nameEn: "Fire", description: "불꽃, 점화, 램프", glyph: "✺", accent: ["#ffb347", "#f25c1f"] },
  { slug: "weather", name: "날씨 · 천기", nameEn: "Weather", description: "비, 바람, 천둥, 번개", glyph: "☁", accent: ["#8fa8bd", "#5a7186"] },
  { slug: "nature", name: "자연 · 숲", nameEn: "Nature", description: "새소리, 숲, 물소리", glyph: "✿", accent: ["#8ef06a", "#3aa981"] },
  { slug: "animal", name: "동물", nameEn: "Animals", description: "반려동물과 야생동물", glyph: "◑", accent: ["#ffd166", "#c98a2b"] },
  { slug: "game", name: "게임 효과음", nameEn: "Game SFX", description: "코인, 점프, 무기, 레이스", glyph: "⌁", accent: ["#ff8fab", "#c9184a"] },
  { slug: "sci-fi", name: "SF · 로봇", nameEn: "Sci-Fi", description: "레이저, 로봇, 우주선", glyph: "❖", accent: ["#22d3ee", "#0e7490"] },
  { slug: "magic", name: "마법 · 판타지", nameEn: "Fantasy", description: "주문, 포털, 전이", glyph: "⌾", accent: ["#c77dff", "#7b2ff7"] },
  { slug: "horror", name: "공포 · 괴물", nameEn: "Horror", description: "드론, 점프스케어, 괴물", glyph: "⊙", accent: ["#6b6b7b", "#2d2d3a"] },
  { slug: "music", name: "멜로디 · 벨소리", nameEn: "Melody", description: "멜로디, 벨소리, 현악기", glyph: "♪", accent: ["#ff6fae", "#b05cff"] },
  { slug: "vehicle", name: "차량 · 기계", nameEn: "Vehicles", description: "자동차, 기차, 비행기, 경고음", glyph: "⬣", accent: ["#8ecae6", "#3a86c8"] },
  { slug: "crowd", name: "사람 · 군중", nameEn: "People", description: "함성, 박수, 시장 소음", glyph: "⌂", accent: ["#f4a261", "#e76f51"] },
  { slug: "foley", name: "소도구 · 몸소리", nameEn: "Foley", description: "종이, 타이핑, 몸 움직임", glyph: "▤", accent: ["#b8c0cc", "#7d8796"] },
  { slug: "human", name: "사람 소리", nameEn: "Human", description: "숨, 웃음, 기침, 헉헉거림", glyph: "⊞", accent: ["#e9a8c9", "#c2557e"] },
  { slug: "charging", name: "충전음", nameEn: "Charging", description: "충전 시작·완료·분리. 기기 상태 앱용", glyph: "⚡", accent: ["#8ef06a", "#2fd6a8"] },
];

export const PACKS: Pack[] = [
  // ═══════════════ UI ═══════════════
  {
    slug: "ui-clicks", name: "클릭 & 호버", nameEn: "Clicks & Hover",
    description: "가장 많이 쓰이는 클릭 계열. 짧고 깔끔해 연속 입력에도 피로가 없습니다.",
    category: "ui", license: "CC0", accent: ["#38e2c4", "#1f9fd6"], featured: true,
    sounds: [
      F("click", "클릭", "Click", "ui 클릭 button", "click"),
      S("click-soft", "클릭 (부드럽게)", "Click Soft", "ui 클릭 부드럽게", P.uiClick({ pitch: 1100, soft: true })),
      F("click-2", "클릭 2", "Click 2", "ui 클릭 다른 버전", "click-2"),
      F("click-3", "클릭 3", "Click 3", "ui 클릭 다른 버전", "click-3"),
      F("click-double", "더블클릭", "Double Click", "ui 더블클릭", "double-click"),
      F("click-triple", "트리플클릭", "Triple Click", "ui 트리플클릭", "triple-click"),
      S("click-right", "우클릭", "Right Click", "ui 우클릭 메뉴", P.uiClick({ pitch: 900 })),
      S("hover", "호버", "Hover", "ui hover 마우스", P.uiClick({ pitch: 2000, soft: true })),
      S("press", "누름", "Press", "ui press 눌림", P.softKnock({ body: 320, decay: 0.06 })),
      S("drag", "드래그", "Drag", "ui drag 드래그", P.scrub(0.4)),
      S("release", "놓기", "Release", "ui release 놓기", P.uiClick({ pitch: 1700, soft: true })),
    ],
  },
  {
    slug: "ui-toggles", name: "토글 & 스위치", nameEn: "Toggles & Switches",
    description: "스위치와 체크박스에 붙이는 음. 켜짐과 꺼짐이 명확히 구분됩니다.",
    category: "ui", license: "CC0", accent: ["#4dd0c1", "#2a9d8f"],
    sounds: [
      S("toggle-on", "토글 켜기", "Toggle On", "ui 토글 켜기 on", P.uiToggle(true)),
      S("toggle-off", "토글 끄기", "Toggle Off", "ui 토글 끄기 off", P.uiToggle(false)),
      S("check", "체크", "Check", "ui 체크 확인", P.uiSuccess()),
      S("uncheck", "체크 해제", "Uncheck", "ui 체크 해제", P.uiToggle(false)),
      S("slider-tick", "슬라이더", "Slider", "ui 슬라이더 조절", P.typeKey()),
      S("switch-on", "스위치 켜기", "Switch On", "ui 스위치 전원", P.powerSwitch(true)),
      S("switch-off", "스위치 끄기", "Switch Off", "ui 스위치 전원", P.powerSwitch(false)),
    ],
  },
  {
    slug: "ui-transitions", name: "전환 & 네비게이션", nameEn: "Transitions",
    description: "페이지 이동과 메뉴. 화면 전환에 속도를 붙여줍니다.",
    category: "ui", license: "CC0", accent: ["#7bdff2", "#00b4d8"],
    sounds: [
      S("page-turn", "페이지 넘김", "Page Turn", "ui 페이지 이동 전환", P.swoosh({ dur: 0.4, from: 600, to: 3000 })),
      S("drawer-open", "서랍 열기", "Drawer Open", "ui 서랍 드로어 열림", P.doorMove()),
      S("drawer-close", "서랍 닫기", "Drawer Close", "ui 서랍 드로어 닫힘", P.doorMove({ close: true })),
      S("tab-switch", "탭 전환", "Tab Switch", "ui 탭 이동", P.uiClick({ pitch: 1900 })),
      S("menu-open", "메뉴 열기", "Menu Open", "ui 메뉴 열림", P.uiWhooshSmall()),
      S("back", "뒤로 가기", "Back", "ui 뒤로 뒤로가기", P.uiClick({ pitch: 800 })),
      S("forward", "앞으로 가기", "Forward", "ui 앞으로 앞으로가기", P.uiClick({ pitch: 2200 })),
      S("modal-open", "모달 열림", "Modal Open", "ui 모달 팝업", P.uiPop({ pitch: 520 })),
    ],
  },
  {
    slug: "ui-feedback", name: "상태 피드백", nameEn: "Status Feedback",
    description: "성공, 에러, 경고. 사용자를 혼내지 않으면서 분명히 알려줍니다.",
    category: "ui", license: "CC0", accent: ["#ff9f6e", "#ef5f6c"],
    sounds: [
      S("success", "성공", "Success", "ui 성공 완료", P.uiSuccess()),
      S("error", "에러", "Error", "ui 에러 실패", P.uiError()),
      S("warning", "경고", "Warning", "ui 경고 주의", P.uiError()),
      S("info", "정보", "Info", "ui 정보 안내", P.messageBlip("receive")),
      S("loading-done", "로딩 완료", "Loading Done", "ui 로딩 완료 끝", P.uiSuccess()),
      S("progress", "진행", "Progress", "ui 진행 중", P.uiPop({ pitch: 380 })),
      S("locked", "잠김", "Locked", "ui 잠금 lock", P.clack({ pitch: 900, len: 0.2 })),
      S("delete-confirm", "삭제 확인", "Delete Confirm", "ui 삭제 위험", P.uiError()),
    ],
  },

  // ═══════════════ 알림 ═══════════════
  {
    slug: "notify-chimes", name: "알림 차임", nameEn: "Notification Chimes",
    description: "차분하면서 눈에 띄는 알림음. 지하철에서 꺼내도 괜찮은 음량.",
    category: "notification", license: "CC0", accent: ["#8b7bff", "#5b8cff"], featured: true,
    sounds: [
      F("chime", "차임", "Chime", "알림 차임", "notification"),
      S("chime-deep", "차임 (낮게)", "Chime Deep", "알림 차임 낮게", P.chime({ notes: [587.33, 880], dur: 2.2 })),
      S("double-tone", "더블 톤", "Double Tone", "알림 더블톤", P.messageBlip("send")),
      S("triple-tone", "트리플 톤", "Triple Tone", "알림 트리플", P.countdownTick(true)),
      S("bell-ding", "띵동", "Ding", "알림 띵동", P.metal({ freq: 1400, decay: 1.1 })),
      S("soft-notify", "소프트 알림", "Soft Notify", "알림 부드럽게", P.uiNotification({ soft: true, pitch: 660 })),
      S("notify-up", "상승 알림", "Notify Up", "알림 상승", P.messageBlip("receive")),
      S("notify-down", "하강 알림", "Notify Down", "알림 하강", P.uiNotification({ pitch: 987.77 })),
    ],
  },
  {
    slug: "notify-messages", name: "메시지", nameEn: "Messages",
    description: "톡, 메일, 알림 수신음. 메신저 UI에 바로 붙여 쓰세요.",
    category: "notification", license: "CC0", accent: ["#6fa8ff", "#3d5afe"],
    sounds: [
      S("message-sent", "발송", "Message Sent", "메시지 보냄 발송", P.messageBlip("send")),
      S("message-received", "수신", "Message Received", "메시지 받음 수신", P.messageBlip("receive")),
      S("message-read", "읽음", "Read", "메시지 읽음 확인", P.uiClick({ pitch: 1800, soft: true })),
      S("message-unread", "읽지 않음", "Unread", "메시지 안읽음 미읽음", P.messageBlip("receive")),
      S("chat-bubble", "톡 도착", "Chat Bubble", "메시지 톡 카톡", P.uiPop({ pitch: 700 })),
      S("dm", "디엠", "DM", "메시지 dm 개인", P.messageBlip("send")),
      S("group-chat", "그룹톡", "Group Chat", "메시지 그룹 단체", P.messageBlip("receive")),
      S("typing", "입력 중", "Typing", "메시지 입력 타이핑", P.typeKey({ soft: true })),
    ],
  },
  {
    slug: "notify-bells", name: "벨 & 종", nameEn: "Bells",
    description: "종 계열. 어셈블리·자물쇠·학교종 같은 실감 있는 공명.",
    category: "notification", license: "CC-BY-4.0", accent: ["#ffd166", "#f0a500"],
    sounds: [
      F("bell-small", "작은 종", "Small Bell", "벨 종bell", "bell"),
      S("school-bell", "학교종", "School Bell", "벨 학교 종", P.bell({ freq: 320, dur: 3.5 })),
      S("doorbell", "초인종", "Doorbell", "벨 초인종 문bell", P.metal({ freq: 1100, decay: 2 })),
      S("old-bell", "묵은 종", "Old Bell", "벨 오래된 종", P.bell({ freq: 200, dur: 5 })),
      S("jingle", "자물쇠 벨", "Jingle", "벨 자물쇠", P.metal({ freq: 2400, decay: 0.6 })),
      S("buzzer", "부저", "Buzzer", "벨 부저", P.securityAlarm(1.6)),
      S("alarm-clock", "알람시계", "Alarm Clock", "벨 알람 기상", P.alarmClock()),
    ],
  },

  // ═══════════════ 타격 ═══════════════
  {
    slug: "impact-hits", name: "타격", nameEn: "Hits",
    description: "부딪히는 소리. 저역 몸통과 고역 트랜지언트를 분리해 실감을 냈습니다.",
    category: "impact", license: "CC0", accent: ["#ffb547", "#ff7a45"], featured: true,
    sounds: [
      S("thud-light", "가벼운 쿵", "Light Thud", "타격 쿵 부딪힘", P.impact({ body: 140, decay: 0.13, crack: 0.32, tone: 2600 })),
      S("thud", "쿵", "Thud", "타격 쿵 부딪힘", P.impact({ body: 92, decay: 0.24 })),
      S("thud-heavy", "큰 쿵", "Heavy Thud", "타격 쿵 무거운", P.impact({ body: 62, decay: 0.42, crack: 0.65, tone: 3600, drive: 0.18 })),
      S("head-hit", "머리 타격", "Head Hit", "타격 머리 아프", P.impact({ body: 260, decay: 0.1, crack: 0.5, tone: 3200 })),
      S("metal-hit", "철판 타격", "Metal Hit", "타격 철판 금속", P.metal({ freq: 380, decay: 1.5 })),
      S("wood-hit", "나무 타격", "Wood Hit", "타격 나무", P.softKnock({ body: 260, decay: 0.2 })),
      S("glass-break", "유리 깨짐", "Glass Break", "타격 깨지는 유리", P.glassBreak({ size: "large" })),
      S("smash", "부서짐", "Smash", "타격 부서짐 깨뜨리", P.glassBreak({ size: "small" })),
      S("crunch", "찌그러짐", "Crunch", "타격 찌그러림", P.crunch({ duration: 0.45 })),
      S("dirt", "흙", "Dirt", "타격 흙 땅", P.impact({ body: 70, decay: 0.16, crack: 0.4, tone: 1400, crackDecay: 0.06 })),
    ],
  },
  {
    slug: "impact-punches", name: "주먹 & 발차기", nameEn: "Punches & Kicks",
    description: "액션·타이쿤 등 격투 장면용 타격음.",
    category: "impact", license: "CC-BY-4.0", accent: ["#ff6b6b", "#c1121f"],
    sounds: [
      S("jab", "주먹", "Jab", "타격 주먹", P.punch(false)),
      S("cross", "크로스", "Cross", "타격 크로스", P.punch(true)),
      S("body-blow", "몸통 타격", "Body Blow", "타격 몸통", P.impact({ body: 78, decay: 0.3, crack: 0.5, tone: 2000, drive: 0.2 })),
      S("elbow", "팔꿈치", "Elbow", "타격 팔꿈치", P.impact({ body: 150, decay: 0.16, crack: 0.55, tone: 2800 })),
      S("knee", "무릎", "Knee", "타격 무릎", P.impact({ body: 180, decay: 0.14, crack: 0.45, tone: 2400 })),
      S("kick", "킥", "Kick", "타격 킥 차기", P.punch(true)),
      S("headbutt", "머리 맞대기", "Headbutt", "타격 머리 박기", P.impact({ body: 120, decay: 0.2, crack: 0.62, tone: 3400 })),
      S("slam", "바닥 던지기", "Slam", "타격 슬램", P.impact({ body: 55, decay: 0.5, crack: 0.7, tone: 3000, drive: 0.22 })),
    ],
  },
  {
    slug: "impact-crashes", name: "충돌 & 낙하", nameEn: "Crashes & Falls",
    description: "추락, 전도, 넘어짐. 영상 편집에서 자주 쓰이는 소리.",
    category: "impact", license: "CC0", accent: ["#a8a29e", "#57534e"],
    sounds: [
      S("collision", "충돌", "Collision", "충돌 부딪힘", P.impact({ body: 110, decay: 0.3, crack: 0.7, tone: 4200 })),
      S("fall", "추락", "Fall", "충돌 낙하 떨어짐", P.swoosh({ dur: 0.5, from: 400, to: 1800 })),
      S("bump", "부딪힘", "Bump", "충돌 gentle", P.impact({ body: 160, decay: 0.12, crack: 0.3, tone: 2200 })),
      S("body-fall", "쓰러짐", "Body Fall", "충돌 쓰러짐 넘어", P.landSfx(true)),
      S("roll", "굴러감", "Roll", "충돌 굴러", P.softKnock({ body: 90, decay: 0.12 })),
      S("trip", "넘어짐", "Trip", "충돌 넘어짐 걸 넘어", P.landSfx(false)),
      S("car-body", "차량 손상", "Car Body", "충돌 차량", P.impact({ body: 84, decay: 0.36, crack: 0.68, tone: 5200, drive: 0.24 })),
      S("bike-crash", "자전거 전도", "Bike Crash", "충돌 자전거 전도", P.metal({ freq: 620, decay: 1.8 })),
    ],
  },

  // ═══════════════ 휘이 ═══════════════
  {
    slug: "whoosh-swings", name: "휘두르기", nameEn: "Swings",
    description: "칼·검·채찍. 공기를 가르는 소리. 액션 장면에 필수.",
    category: "whoosh", license: "CC-BY-4.0", accent: ["#a78bfa", "#6d5ef2"], featured: true,
    sounds: [
      S("swing-light", "가벼운 휘둘러", "Light Swing", "휘이 휘두르기", P.swordSwing()),
      S("swing-fast", "빠른 휘둘러", "Fast Swing", "휘이 빠른", P.swoosh({ dur: 0.3, from: 900, to: 6000 })),
      S("sword", "검", "Sword", "휘이 검 칼", P.swordSwing()),
      S("katana", "카타나", "Katana", "휘이 일본검", P.swoosh({ dur: 0.45, from: 800, to: 5200 })),
      S("spear", "창", "Spear", "휘이 창 창문", P.swoosh({ dur: 0.55, from: 500, to: 3600 })),
      S("bow-range", "활 사거리", "Bow Range", "휘이 활 저격", P.arrowWhoosh()),
      S("swing-wide", "넓게 휘둘러", "Wide Swing", "휘이 넓게", P.swoosh({ dur: 0.75, from: 350, to: 2800 })),
      S("miss", "빗나감", "Miss", "휘이 빗나감 실패", P.swoosh({ dur: 0.34, from: 2600, to: 500 })),
    ],
  },
  {
    slug: "whoosh-moves", name: "이동 & 스침", nameEn: "Moves & Pass By",
    description: "빠르게 지나가는 물체. 카메라 왁드래시에 곁들이는 효과.",
    category: "whoosh", license: "CC0", accent: ["#8ecae6", "#3a86c8"],
    sounds: [
      S("pass-by", "지나감", "Pass By", "휘이 지나감 통과", P.swoosh({ dur: 0.5, from: 450, to: 2400 })),
      S("pass-by-fast", "빠른 지나감", "Fast Pass By", "휘이 빠르게 지나감", P.swoosh({ dur: 0.3, from: 800, to: 6500 })),
      S("graze", "스쳐 지나감", "Graze", "휘이 스침 스쳐", P.swoosh({ dur: 0.22, from: 3000, to: 1400 })),
      S("ricochet", "튕겨 나감", "Ricochet", "휘이 튕김", P.zap({ len: 0.28 })),
      S("leap", "도약", "Leap", "휘이 도약 점프", P.swoosh({ dur: 0.35, from: 300, to: 2000 })),
      S("landing-sweep", "착지 스윕", "Landing Sweep", "휘이 착지", P.swoosh({ dur: 0.3, from: 2200, to: 400 })),
      S("slide", "미끄러짐", "Slide", "휘이 미끄러", P.slide()),
      S("rise", "상승", "Rise", "휘이 상승 올라", P.riser(2)),
    ],
  },

  // ═══════════════ 폭발 ═══════════════
  {
    slug: "boom-explosions", name: "폭발", nameEn: "Explosions",
    description: "저역 럼블 + 화약 크래클 + 잔해 소리로 구성한 폭발.",
    category: "explosion", license: "CC-BY-4.0", accent: ["#ff6b6b", "#d63031"], featured: true,
    sounds: [
      S("boom-small", "작은 폭발", "Small Explosion", "폭발 작게", P.explosionSfx("small")),
      S("boom", "폭발", "Explosion", "폭발 기본", P.explosionSfx("medium")),
      S("boom-large", "대형 폭발", "Large Explosion", "폭발 대형", P.explosionSfx("large")),
      S("fuel-blast", "연료 폭발", "Fuel Blast", "폭발 연료 기름", P.explosionSfx("large")),
      S("air-blast", "공중 폭발", "Air Blast", "폭발 공중", P.explosionSfx("medium")),
      S("underground-blast", "지하 폭발", "Underground Blast", "폭발 지하", P.thunder({ size: "large" })),
      S("bomb", "폭탄", "Bomb", "폭발 폭탄", P.explosionSfx("large")),
      S("chokeout", "차크아웃", "Chokeout", "폭발 차크아웃", P.crunch({ duration: 0.6, tone: 1100 })),
      S("warehouse", "물류창고 폭발", "Warehouse Blast", "폭발 창고", P.explosionSfx("large")),
      S("rocket-launch", "로켓 발사", "Rocket Launch", "폭발 로켓 발사", P.firework()),
    ],
  },
  {
    slug: "boom-debris", name: "파편 & 붕괴", nameEn: "Debris & Collapse",
    description: "폭발 뒤에 따라오는 잔해. 파편이 떨어지고 부서지는 소리.",
    category: "explosion", license: "CC0", accent: ["#b08968", "#7f5539"],
    sounds: [
      S("glass-debris", "유리 파편", "Glass Debris", "파편 유리 깨진", P.glassBreak({ size: "small" })),
      S("metal-debris", "금속 파편", "Metal Debris", "파편 금속", P.metal({ freq: 900, decay: 0.9 })),
      S("wall-collapse", "벽 무너짐", "Wall Collapse", "파편 붕괴 무너", P.impact({ body: 45, decay: 0.9, crack: 0.9, tone: 1400, crackDecay: 0.5 })),
      S("rubble", "잔해 굴러감", "Rubble", "파편 잔해 쓰레기", P.crunch({ duration: 1.1, tone: 900 })),
      S("debris-fall", "낙하 쓰레기", "Falling Debris", "파편 낙하 떨어지는", P.impact({ body: 130, decay: 0.08, crack: 0.35, tone: 5200, crackDecay: 0.02 })),
      S("roof-collapse", "지붕 붕괴", "Roof Collapse", "파편 지붕 무너", P.impact({ body: 38, decay: 1.3, crack: 0.95, tone: 1100, crackDecay: 0.7 })),
      S("stone-fall", "돌 낙하", "Stone Fall", "파편 돌 떨어지는", P.impact({ body: 85, decay: 0.18, crack: 0.5, tone: 2400 })),
      S("dust-settle", "먼지 가라앉음", "Dust Settle", "파편 먼지", P.crunch({ duration: 1.6, tone: 700 })),
    ],
  },

  // ═══════════════ 발걸음 ═══════════════
  {
    slug: "steps-surfaces", name: "표면별 발걸음", nameEn: "Footsteps by Surface",
    description: "표면마다 노이즈 대역과 공명이 다릅니다. 실제 녹음과 구분하기 어렵습니다.",
    category: "footstep", license: "CC0", accent: ["#c8a27a", "#8d6e4f"], featured: true,
    sounds: [
      S("concrete", "콘크리트", "Concrete", "발걸음 콘크리트", P.footstep("concrete")),
      S("wood-floor", "나무 바닥", "Wood Floor", "발걸음 나무 마루", P.footstep("wood")),
      S("grass", "잔디", "Grass", "발걸음 잔디 풀", P.footstep("grass")),
      S("snow", "눈", "Snow", "발걸음 눈 설경", P.footstep("snow")),
      S("metal-floor", "금속 바닥", "Metal Floor", "발걸음 금속", P.footstep("metal")),
      S("water-puddle", "물웅덩이", "Water Puddle", "발걸음 물", P.footstep("water")),
      S("gravel", "자갈", "Gravel", "발걸음 자갈길", P.footstep("snow")),
      S("sand", "모래", "Sand", "발걸음 모래", P.footstep("grass")),
      S("marble", "대리석", "Marble", "발걸음 대리석", P.footstep("wood")),
      S("mud", "흙길", "Mud", "발걸음 진흙", P.squelchStep()),
    ],
  },
  {
    slug: "steps-gait", name: "보행 패턴", nameEn: "Gaits",
    description: "걷기, 달리기, 계단 등 이동 방식별 세트.",
    category: "footstep", license: "CC0", accent: ["#b0a08a", "#6f6355"],
    sounds: [
      S("single-step", "한 걸음", "Single Step", "발걸음 한 발", P.footstep("concrete")),
      S("walk-concrete", "걷기 (콘크리트)", "Walk Concrete", "발걸음 걷기", P.footsteps("concrete", 4)),
      S("walk-wood", "걷기 (나무)", "Walk Wood", "발걸음 걷기 나무", P.footsteps("wood", 4)),
      S("fast-walk", "빠르게 걷기", "Fast Walk", "발걸음 빠르게", P.footsteps("concrete", 6)),
      S("run", "달리기", "Run", "발걸음 달리기", P.footsteps("concrete", 7)),
      S("stairs-up", "계단 오르기", "Stairs Up", "발걸음 계단 올라", P.footsteps("wood", 5)),
      S("stairs-down", "계단 내려가기", "Stairs Down", "발걸음 계단 내려", P.footsteps("wood", 5)),
      S("land-run", "달려서 착지", "Running Landing", "발걸음 착지", P.landSfx(true)),
    ],
  },
  {
    slug: "steps-characters", name: "캐릭터별 발소리", nameEn: "Character Footsteps",
    description: "맨발, 하이힐, 장화, 로봇. 캐릭터에 맞는 걸음.",
    category: "footstep", license: "CC-BY-4.0", accent: ["#d4a373", "#a9714b"],
    sounds: [
      S("barefoot", "맨발", "Barefoot", "발걸음 맨발", P.footstep("grass")),
      S("heels", "하이힐", "Heels", "발걸음 하이힐", P.footstep("wood")),
      S("sneakers", "운동화", "Sneakers", "발걸음 운동화", P.footstep("snow")),
      S("boots", "장화", "Boots", "발걸음 장화", P.footstep("metal")),
      S("military-boots", "군화", "Military Boots", "발걸음 군화", P.footsteps("metal", 4)),
      S("quiet", "조용한 걸음", "Quiet Step", "발걸음 조용히", P.footstep("grass")),
      S("child", "아이 발소리", "Child Steps", "발걸음 아이", P.footsteps("wood", 5)),
      S("robot-walk", "로봇 걸음", "Robot Walk", "발걸음 로봇 기계", P.robotStep()),
    ],
  },

  // ═══════════════ 사물 ═══════════════
  {
    slug: "object-doors", name: "문과 서랍", nameEn: "Doors & Drawers",
    description: "여닫히는 소리. 마찰음과 공기 흐름을 분리해 만들었습니다.",
    category: "object", license: "CC0", accent: ["#9ad0ff", "#5b8cff"],
    sounds: [
      S("door-open", "문 열기", "Door Open", "문 여닫기 열다", P.doorMove()),
      S("door-close", "문 닫기", "Door Close", "문 닫기", P.doorMove({ close: true })),
      S("drawer-open", "서랍 열기", "Drawer Open", "서랍 열기", P.swoosh({ dur: 0.4, from: 400, to: 1400 })),
      S("drawer-close", "서랍 닫기", "Drawer Close", "서랍 닫기", P.impact({ body: 130, decay: 0.14, crack: 0.4, tone: 1800 })),
      S("cabinet-open", "찬장 열기", "Cabinet Open", "찬장 서랍", P.doorMove()),
      S("sliding-door", "미닫이", "Sliding Door", "문 미닫이", P.scrub(1.2)),
      S("lock", "잠금", "Lock", "문 잠금 자물쇠", P.clack({ pitch: 1600, len: 0.16 })),
      S("latch", "걸쇠", "Latch", "문 걸쇠", P.switchFlip()),
    ],
  },
  {
    slug: "object-switches", name: "스위치 & 조작", nameEn: "Switches & Controls",
    description: "손으로 조작하는 작은 소리들.",
    category: "object", license: "CC0", accent: ["#7bdff2", "#00a6be"],
    sounds: [
      S("switch-toggle", "스위치", "Switch Toggle", "스위치 조작", P.switchFlip()),
      S("power-on", "전원 켜기", "Power On", "전원 켜기 on", P.powerSwitch(true)),
      S("power-off", "전원 끄기", "Power Off", "전원 끄기 off", P.powerSwitch(false)),
      S("unplug", "플러그 뽑기", "Unplug", "플러그 뽑기", P.impact({ body: 180, decay: 0.1, crack: 0.6, tone: 4200, crackDecay: 0.014 })),
      S("plug-in", "플러그 꽂기", "Plug In", "플러그 꽂기", P.impact({ body: 140, decay: 0.14, crack: 0.5, tone: 2800 })),
      S("button-press", "버튼 누르기", "Button Press", "버튼 누르기", P.uiClick({ pitch: 1000 })),
      S("dial", "다이얼", "Dial", "다이얼 다이얼", P.clack({ pitch: 2000, len: 0.1 })),
      S("handle", "손잡이", "Handle", "손잡이 잡아당", P.scrub(0.5)),
    ],
  },
  {
    slug: "object-household", name: "가전 · 일상용품", nameEn: "Household",
    description: "집에서 매일 나는 소리들.",
    category: "object", license: "CC-BY-4.0", accent: ["#ffd6a5", "#ff8552"],
    sounds: [
      S("zipper", "지퍼", "Zipper", "지퍼 압수", P.zipper()),
      S("printer", "프린터", "Printer", "프린터 출력기", P.printer()),
      S("remote", "리모컨", "Remote", "리모컨 리모콘", P.mouseClick()),
      S("fridge-door", "냉장고 문", "Fridge Door", "냉장고 문", P.doorMove({ close: true })),
      S("washing-machine", "세탁기", "Washing Machine", "세탁기 빨래", P.motorSpin(false, 3)),
      S("microwave", "전자레인지", "Microwave", "전자레인지", P.beep({ freq: 1200, len: 0.2 })),
      S("kettle", "주전자", "Kettle", "주전자 전 kettle", P.whistle({ len: 1.1 })),
      S("sizzle", "볶음 지글거림", "Sizzle", "볶음 지글지글", P.sizzle(1)),
      S("dishwasher", "식기세척기", "Dishwasher", "식기세척기", P.flowingWater(3)),
    ],
  },

  // ═══════════════ 물 ═══════════════
  {
    slug: "water-drops", name: "물방울", nameEn: "Water Drops",
    description: "방울 하나하나가 버블처럼 올라갔다 내려가는 소리.",
    category: "water", license: "CC0", accent: ["#5bc8f5", "#2b7fd4"],
    sounds: [
      F("drop", "물방울", "Water Drop", "물 방울 물방울", "water-drop"),
      F("drop-2", "물방울 2", "Water Drop 2", "물 방울 다른 버전", "water-drop-2"),
      S("drop-big", "큰 물방울", "Big Drop", "물 방울 큰", P.waterDrop({ freq: 380, dur: 0.24 })),
      S("drop-high", "물방울 (높게)", "High Drop", "물 방울 높은", P.waterDrop({ freq: 1100 })),
      S("drip", "뚝뚝", "Drip", "물 방울 뚝뚝 drip", P.waterDrop({ freq: 820 })),
      S("faucet", "수도꼭지", "Faucet", "물 수도꼭지", P.waterDrop({ freq: 700 })),
      S("mist", "물안개", "Mist", "물 안개 뿌 mist", P.bubbles(9)),
      S("dew", "이슬", "Dew", "물 이슬", P.waterDrop({ freq: 1500 })),
      F("droplets", "물방울 여러 개", "Droplets", "물 방울 여러", "water-droplets"),
    ],
  },
  {
    slug: "water-splash", name: "튀김 & 흐름", nameEn: "Splashes & Flow",
    description: "물에 빠지는 순간과 계속 흐르는 소리.",
    category: "water", license: "CC0", accent: ["#48cae4", "#0096c7"],
    sounds: [
      S("splash-small", "작은 튀김", "Small Splash", "물 튀김 splash", P.splash({ size: "small" })),
      S("splash-large", "큰 튀김", "Large Splash", "물 튀김 큰", P.splash({ size: "large" })),
      S("water-pour", "물 부어", "Pour", "물 부어 따르다", P.pourLiquid()),
      S("pour-bottle", "병에 따르며", "Pour Bottle", "물 병 따르다", P.pourLiquid(1.6)),
      S("water-gun", "물총", "Water Gun", "물 물총", P.zap({ len: 0.18 })),
      S("swim", "수영", "Swimming", "물 수영 헤엄", P.swimmingStroke()),
      S("underwater", "수중", "Underwater", "물 수중 잠수", P.underwater()),
      S("stream", "시냇물", "Stream", "물 시냇물 흐르다", P.flowingWater(5)),
    ],
  },

  // ═══════════════ 불 ═══════════════
  {
    slug: "fire-sounds", name: "불소리", nameEn: "Fire Sounds",
    description: "백색 노이즈가 아니라, 불꽃마다 끊기는 개별 크래클로 구성했습니다.",
    category: "fire", license: "CC0", accent: ["#ffb347", "#f25c1f"],
    sounds: [
      S("fireplace", "벽난로", "Fireplace", "불 벽난로 장작", P.fire({ intensity: 1, dur: 5 })),
      S("campfire", "캠프파이어", "Campfire", "불 캠프파이어", P.fire({ intensity: 0.8, dur: 5 })),
      S("stove", "도마솥 불", "Stove", "불 도마솥", P.fire({ intensity: 0.7, dur: 4 })),
      S("candle", "촛불", "Candle", "불 촛불", P.fire({ intensity: 0.35, dur: 3 })),
      S("gas-flame", "가스 불꽃", "Gas Flame", "불 가스 불꽃", P.fire({ intensity: 0.6, dur: 3 })),
      S("heater", "전기 히터", "Heater", "불 히터 전열", P.fire({ intensity: 0.5, dur: 4 })),
      S("bonfire", "불타는 장작", "Bonfire", "불 장작 불태우는", P.fire({ intensity: 1.2, dur: 6 })),
      S("embers", "잔불", "Embers", "불 잔불", P.fire({ intensity: 0.45, dur: 4 })),
    ],
  },
  {
    slug: "fire-ignite", name: "점화", nameEn: "Ignition",
    description: "불이 붙는 순간. 성냥부터 도마솥 불까지.",
    category: "fire", license: "CC0", accent: ["#ffca6b", "#e07a1f"],
    sounds: [
      S("match-strike", "성냥 불붙이기", "Match Strike", "불 성냥", P.scrub(0.4)),
      S("lighter", "라이터", "Lighter", "불 라이터", P.switchFlip()),
      S("gas-ignite", "가스 점화", "Gas Ignite", "불 가스 점화", P.sparkle({ count: 8, dur: 0.9 })),
      S("powder-ignite", "화약 점화", "Powder Ignite", "불 화약", P.crunch({ duration: 0.3, tone: 3600 })),
      S("torch", "횃불", "Torch", "불 횃불", P.fire({ intensity: 0.9, dur: 4 })),
      S("burning-flame", "타는 화염", "Burning Flame", "불 타는 화염", P.fire({ intensity: 1.1, dur: 5 })),
      S("stove-ignite", "도마솥 불 붙이", "Stove Ignite", "불 불판 점화", P.click({ freq: 1200 })),
    ],
  },

  // ═══════════════ 날씨 ═══════════════
  {
    slug: "weather-rain", name: "비", nameEn: "Rain",
    description: "지붕에 떨어지는 물방울 틱을 섞어 실제 빗소리처럼 들리게 했습니다.",
    category: "weather", license: "CC0", accent: ["#8fa8bd", "#5a7186"],
    sounds: [
      S("rain-light", "잔비", "Light Rain", "날씨 비 잔비", P.rain({ heavy: false, dur: 6 })),
      S("rain", "비", "Rain", "날씨 비", P.rain({ heavy: true, dur: 6 })),
      S("downpour", "폭우", "Downpour", "날씨 폭우 소나기", P.rain({ heavy: true, dur: 5 })),
      S("rain-roof", "빗소리 지붕", "Rain on Roof", "날씨 지붕 비", P.rain({ heavy: true, dur: 6 })),
      S("drizzle", "이슬비", "Drizzle", "날씨 이슬비", P.rain({ heavy: false, dur: 5 })),
      F("thunder-distant", "천둥", "Thunder", "날씨 천둥", "thunder"),
      S("storm", "폭풍", "Storm", "날씨 폭풍", P.thunder({ size: "large" })),
    ],
  },
  {
    slug: "weather-wind", name: "바람", nameEn: "Wind",
    description: "브라운 노이즈에 움직임을 더해, 바람이 세졌다 약해지는 변화를 만듭니다.",
    category: "weather", license: "CC0", accent: ["#a8c0d0", "#6b8ba3"],
    sounds: [
      S("wind-light", "미풍", "Light Wind", "날씨 바람", P.wind({ gust: 0.5, dur: 6 })),
      S("wind", "바람", "Wind", "날씨 바람", P.wind({ gust: 0.8, dur: 6 })),
      S("wind-strong", "강한 바람", "Strong Wind", "날씨 바람 세게", P.wind({ gust: 1.2, dur: 6 })),
      S("gale", "돌풍", "Gale", "날씨 돌풍", P.wind({ gust: 1.5, dur: 7 })),
      S("leaves", "나뭇잎", "Leaves", "날씨 나뭇잎", P.wind({ gust: 0.9, dur: 5 })),
      S("wind-tunnel", "풍동 소리", "Wind Tunnel", "날씨 풍동", P.wind({ gust: 1.4, dur: 5 })),
      S("howling-wind", "으렁이는 바람", "Howling Wind", "날씨 바람 울부", P.wind({ gust: 1.6, dur: 7 })),
    ],
  },
  {
    slug: "weather-storm", name: "폭풍 · 천기", nameEn: "Storm",
    description: "번개와 천둥, 폭풍 전조.",
    category: "weather", license: "CC-BY-4.0", accent: ["#7a8ca3", "#3f5068"],
    sounds: [
      S("lightning", "번개", "Lightning", "날씨 번개", P.zap({ len: 0.35 })),
      S("thunder-rumble", "천둥 굉음", "Thunder Rumble", "날씨 천둥", P.thunder({ size: "large" })),
      S("thunder-crack", "천둥 쨍", "Thunder Crack", "날씨 천둥 쨍", P.impact({ body: 70, decay: 0.5, crack: 0.9, tone: 2800, drive: 0.25 })),
      S("storm-approach", "폭풍 전조", "Storm Approach", "날씨 폭풍 전조", P.riser(5)),
      S("thunderstorm", "폭풍우", "Thunderstorm", "날씨 폭풍우", P.thunder({ size: "large", dur: 6 })),
      S("hail", "우박", "Hail", "날씨 우박", P.crunch({ duration: 1.2, tone: 6200 })),
    ],
  },

  // ═══════════════ 자연 ═══════════════
  {
    slug: "nature-birds", name: "새소리", nameEn: "Bird Sounds",
    description: "주파수 변조로 만든 짧은 멜로디. 실제 새와 같은 음이 나지는 않습니다.",
    category: "nature", license: "CC0", accent: ["#8ef06a", "#3aa981"],
    sounds: [
      S("sparrow", "참새", "Sparrow", "새 참새", P.chirp({ base: 2600, count: 4 })),
      S("sparrow-flock", "참새 무리", "Sparrow Flock", "새 참새 무리", P.birdCall()),
      S("magpie", "까치", "Magpie", "새 까치", P.chirp({ base: 2100, count: 5 })),
      S("seagull", "갈매기", "Seagull", "새 갈매기", P.chirp({ base: 1400, count: 2, warble: true })),
      S("owl", "부엉이", "Owl", "새 부엉이 올빼미", P.meow({ long: true })),
      S("owl-hoot", "부엉이 부름", "Owl Hoot", "새 부엉이 부름", P.wolfHowl(3)),
      S("bird-tweet", "새 짖음", "Bird Tweet", "새 짖음", P.chirp({ base: 3400, count: 6 })),
      S("birds-flying", "새 떼 날아감", "Birds Flying Away", "새 떼 날아가는", P.swoosh({ dur: 1.6, from: 700, to: 300 })),
      S("morning-birds", "아침 새소리", "Morning Birds", "새 아침 숲 새소리", P.birdCall()),
    ],
  },
  {
    slug: "nature-forest", name: "숲 & 시냇물", nameEn: "Forest & Streams",
    description: "루프로 쓰기 좋은 배경 소리.",
    category: "nature", license: "CC0", accent: ["#6fcf7f", "#2e8b57"],
    sounds: [
      S("forest-wind", "숲 바람소리", "Forest Wind", "자연 숲 바람", P.wind({ gust: 0.6, dur: 8 })),
      S("leaves-rustle", "나뭇잎 밟기", "Leaves Rustle", "자연 나뭇잎", P.scrub(1.4)),
      S("creek", "시냇물", "Creek", "자연 시냇물", P.flowingWater(7)),
      S("forest-birds", "숲 새소리", "Forest Birds", "자연 숲 새", P.cicada(6)),
      S("meadow", "풀숲", "Meadow", "자연 풀숲 들판", P.wind({ gust: 0.7, dur: 7 })),
      S("bamboo", "대나무 숲", "Bamboo Forest", "자연 대나무 숲", P.scrub(1.8)),
      S("lake", "호수", "Lake", "자연 호수", P.flowingWater(8)),
      S("canyon-echo", "협곡 바람", "Canyon Echo", "자연 협곡", P.wind({ gust: 1.1, dur: 8 })),
    ],
  },

  // ═══════════════ 동물 ═══════════════
  {
    slug: "animal-dog", name: "개", nameEn: "Dog",
    description: "짖음, 울음, 헛깜질. 실제 개를 놀라게 하지는 않습니다.",
    category: "animal", license: "CC-BY-4.0", accent: ["#ffd166", "#c98a2b"],
    sounds: [
      S("bark", "짖기", "Bark", "동물 개 짖음", P.bark()),
      S("bark-sequence", "짖음 연속", "Bark Sequence", "동물 개 연달아", P.dogBark(4)),
      S("howl", "울음", "Howl", "동물 개 울음", P.wolfHowl(2.4)),
      S("panting", "헛깜질", "Panting", "동물 개 헛깜질", P.dogPanting()),
      S("scratching", "발 긁기", "Scratching", "동물 개 긁기", P.scrub(0.8)),
      S("sniff", "코 킁킁대기", "Sniff", "동물 개 킁킁", P.bubbles(5)),
      S("small-bark", "작게 짖기", "Small Bark", "동물 개 작게", P.bark({ rough: true })),
    ],
  },
  {
    slug: "animal-cat", name: "고양이", nameEn: "Cat",
    description: "야옹과 그르렁.",
    category: "animal", license: "CC-BY-4.0", accent: ["#f0a6ca", "#c9558f"],
    sounds: [
      S("meow", "야옹", "Meow", "동물 고양이 야옹", P.meow()),
      S("meow-long", "긴 야옹", "Long Meow", "동물 고양이 길게", P.meow({ long: true })),
      S("meow-short", "짧은 야옹", "Short Meow", "동물 고양이 짧게", P.meow({ long: false })),
      S("purr", "그르렁", "Purr", "동물 고양이 그르렁", P.motorSpin(false, 4)),
      S("claw-scratch", "발톱 긁기", "Claw Scratch", "동물 고양이 발톱", P.scrub(0.6)),
      S("cat-lick", "핥는 소리", "Cat Lick", "동물 고양이 핥기", P.swimmingStroke()),
    ],
  },
  {
    slug: "animal-wild", name: "야생동물", nameEn: "Wild Animals",
    description: "숲에서 나올 법한 소리들.",
    category: "animal", license: "CC-BY-4.0", accent: ["#a3b18a", "#588157"],
    sounds: [
      S("wolf", "늑대", "Wolf", "동물 늑대", P.wolfHowl()),
      S("lion", "사자", "Lion", "동물 사자", P.lionRoar()),
      S("horse", "말", "Horse", "동물 말 갈때", P.horseGallop(6)),
      S("cow", "소", "Cow", "동물 소 울음", P.cowMoo()),
      S("pig", "돼지", "Pig", "동물 돼지", P.pigGrunt()),
      S("frog", "개구리", "Frog", "동물 개구리", P.frogCroak()),
      S("duck", "오리", "Duck", "동물 오리", P.duckQuack()),
      S("bee", "벌", "Bee", "동물 벌", P.beeBuzz(4)),
    ],
  },

  // ═══════════════ 게임 ═══════════════
  {
    slug: "game-arcade", name: "아케이드", nameEn: "Arcade",
    description: "코인부터 게임 오버까지. 게임잼 프로토타입의 기본 세트.",
    category: "game", license: "CC0", accent: ["#ff8fab", "#c9184a"], featured: true,
    sounds: [
      S("coin", "코인", "Coin", "게임 코인 점수", P.coinPickup()),
      S("coin-2", "코인 (변형)", "Coin Alt", "게임 코인", P.coinPickup(1)),
      S("jump", "점프", "Jump", "게임 점프", P.jumpSfx()),
      S("land", "착지", "Land", "게임 착지", P.landSfx(false)),
      S("land-hard", "강하게 착지", "Hard Landing", "게임 착지", P.landSfx(true)),
      S("powerup", "파워업", "Power Up", "게임 파워업 강화", P.powerUp()),
      S("level-up", "레벨업", "Level Up", "게임 레벨업", P.levelUpJingle()),
      S("game-over", "게임 오버", "Game Over", "게임 오버 끝", P.gameOverJingle()),
      S("1up", "1UP", "One Up", "게임 1업 라이프", P.levelUpJingle()),
      S("credit", "크레딧", "Credit", "게임 크레딧 코인", P.coinPickup(2)),
    ],
  },
  {
    slug: "game-shooter", name: "슈터 · 무기", nameEn: "Shooter & Weapons",
    description: "총소리부터 무기 전환까지. FPS에 바로 넣을 수 있습니다.",
    category: "game", license: "CC-BY-4.0", accent: ["#ff6b6b", "#9d0208"],
    sounds: [
      S("pistol", "권총", "Pistol", "게임 총 권총", P.punch(true)),
      S("rifle-shot", "소총", "Rifle Shot", "게임 총 소총", P.punch(true)),
      S("shotgun", "숏건", "Shotgun", "게임 총 숏건", P.explosionSfx("small")),
      S("missile", "미사일", "Missile", "게임 미사일 미사일", P.firework()),
      S("reload", "재장전", "Reload", "게임 재장전", P.scrub(0.7)),
      S("weapon-switch", "무기 전환", "Weapon Switch", "게임 무기 변경", P.clack({ pitch: 2600, len: 0.1 })),
      S("empty-mag", "탄약 부족", "Empty Magazine", "게임 탄약", P.clack({ pitch: 420, len: 0.2 })),
      S("emp", "EMP", "EMP", "게임 emp", P.zap({ len: 0.6 })),
      S("turret-fire", "포탑 발사", "Turret Fire", "게임 포탑", P.laser({ len: 0.3 })),
    ],
  },
  {
    slug: "game-racing", name: "레이싱", nameEn: "Racing",
    description: "시작부터 승리까지. 레이싱 게임의 사운드 세트.",
    category: "game", license: "CC0", accent: ["#ffd166", "#ef8354"],
    sounds: [
      S("countdown-go", "출발 신호", "Countdown Go", "게임 출발", P.levelUpJingle()),
      S("car-accelerate", "가속", "Accelerate", "게임 가속 부스트", P.motorSpin(true, 2.4)),
      S("car-brake", "브레이크", "Brake", "게임 브레이크", P.scrub(0.9)),
      S("skid", "스키드", "Skid", "게임 미끄러", P.slide(1.4)),
      S("car-crash", "충돌", "Car Crash", "게임 충돌 사고", P.impact({ body: 88, decay: 0.4, crack: 0.72, tone: 4600, drive: 0.22 })),
      S("racing-loop", "주행 루프", "Racing Loop", "게임 주행 배경", P.motorSpin(true, 6)),
      S("race-win", "승리", "Race Win", "게임 승리 1등", P.levelUpJingle()),
      S("race-lose", "패배", "Race Lose", "게임 패배", P.gameOverJingle()),
    ],
  },
  {
    slug: "game-fx", name: "게임 이펙트", nameEn: "Game FX",
    description: "명중, 크리처, 보상. 전투 연출용.",
    category: "game", license: "CC0", accent: ["#c77dff", "#7209b7"],
    sounds: [
      S("hit", "명중", "Hit", "게임 명중 타격 적중", P.punch(false)),
      S("crit", "치명타", "Critical Hit", "게임 치명타", P.punch(true)),
      S("crit-flash", "치명타 플래시", "Crit Flash", "게임 치명타 반짝", P.sparkle({ count: 10, dur: 0.8 })),
      S("combo", "콤보", "Combo", "게임 콤보 연속", P.countdownTick(true)),
      S("heal", "회복", "Heal", "게임 회복 힐", P.chime({ notes: [659.25, 830.61, 1046.5], dur: 1.2 })),
      S("loot", "보상 획득", "Loot", "게임 보상 아이템", P.coinDrop(4)),
      S("quest-complete", "퀘스트 완료", "Quest Complete", "게임 퀘스트 완료", P.levelUpJingle()),
      S("inventory", "인벤토리", "Inventory", "게임 인벤토리 아이템", P.uiPop({ pitch: 640 })),
    ],
  },

  // ═══════════════ SF ═══════════════
  {
    slug: "scifi-lasers", name: "레이저 & 빔", nameEn: "Lasers & Beams",
    description: "빠른 주파수 스윕과 공진 필터로 만든 SF 사운드.",
    category: "sci-fi", license: "CC-BY-4.0", accent: ["#22d3ee", "#0e7490"],
    sounds: [
      S("laser-shot", "레이저 발사", "Laser Shot", "sf 레이저 레이저", P.laser({ len: 0.4 })),
      S("laser-high", "고출력 레이저", "High Energy Laser", "sf 레이저 강력", P.laser({ len: 0.6, high: true })),
      S("laser-charge", "레이저 충전", "Laser Charge", "sf 레이저 충전", P.riser(1.6)),
      S("beam", "빔", "Beam", "sf 빔 광선", P.motorSpin(true, 3)),
      S("radiation", "방사선", "Radiation", "sf 방사선 방사", P.beeBuzz(3)),
      S("plasma", "플라스마", "Plasma", "sf 플라스마", P.laser({ len: 0.8, high: true })),
      S("scanner", "스캐너", "Scanner", "sf 스캐너 탐지", P.barcodeScan()),
      S("weapon-charge", "무기 가동", "Weapon Charge", "sf 무기 가동", P.riser(1.2)),
    ],
  },
  {
    slug: "scifi-robots", name: "로봇 & 기계", nameEn: "Robots & Machinery",
    description: "기계가 사람처럼 움직일 때의 소리.",
    category: "sci-fi", license: "CC-BY-4.0", accent: ["#8ecae6", "#0466c8"],
    sounds: [
      S("robot-beep", "로봇 경고음", "Robot Beep", "sf 로봇 경고", P.robotBeep(false)),
      S("robot-beep-high", "로봇 경고음 (높게)", "Robot Beep High", "sf 로봇 경고", P.robotBeep(true)),
      S("robot-move", "로봇 이동", "Robot Move", "sf 로봇 이동", P.servo({ len: 0.7 })),
      S("servo", "서보 모터", "Servo", "sf 서보 모터", P.servo({ len: 0.5, up: true })),
      S("cybernetics", "사이버네틱 장치", "Cybernetics", "sf 사이버", P.robotBeep(true)),
      S("drone", "드론 비행", "Drone", "sf 드론 비행", P.motorSpin(false, 4)),
      S("machine-start", "기계 시동", "Machine Start", "sf 기계 시동", P.motorSpin(true, 2)),
      S("machine-stop", "기계 정지", "Machine Stop", "sf 기계 정지", P.motorSpin(false, 2)),
      S("powers-down", "전원 꺼짐", "Power Down", "sf 전원 꺼짐", P.servo({ len: 0.8, up: false })),
    ],
  },
  {
    slug: "scifi-spaceship", name: "우주선", nameEn: "Spaceships",
    description: "SF 영화와 게임에 그대로 들어가는 공간 사운드.",
    category: "sci-fi", license: "CC-BY-4.0", accent: ["#48cae4", "#0077b6"],
    sounds: [
      S("ship-drone", "우주선 드론", "Ship Drone", "sf 우주선", P.dreadDrone(6)),
      S("laser-cannon", "레이저 포탑", "Laser Cannon", "sf 레이저포탑", P.laser({ len: 0.7, high: true })),
      S("big-explosion-space", "대형 폭발", "Big Explosion", "sf 폭발 우주", P.explosionSfx("large")),
      S("shield", "쉴드", "Shield", "sf 쉴드 방어막", P.chime({ notes: [392, 587.33, 783.99], dur: 1.4 })),
      S("teleport", "텔레포트", "Teleport", "sf 텔레포트", P.teleport()),
      S("ai-beep", "인공지능 경고", "AI Warning", "sf 인공지능 ai", P.robotBeep(false)),
      S("target-lock", "표적 잠금", "Target Lock", "sf 표적 잠금 조준", P.countdownTick(true)),
      S("warp", "워프", "Warp", "sf 워프", P.portalOpen(3)),
    ],
  },

  // ═══════════════ 마법 ═══════════════
  {
    slug: "magic-spells", name: "주문", nameEn: "Spells",
    description: "상승하는 음높이 + 반짝이는 노이즈로 만든 판타지 효과.",
    category: "magic", license: "CC-BY-4.0", accent: ["#c77dff", "#7b2ff7"], featured: true,
    sounds: [
      S("cast", "주문 시전", "Cast Spell", "마법 주문 시전", P.spellCast()),
      S("fireball", "화염 주문", "Fireball", "마법 화염 불", P.firework()),
      S("ice-shard", "얼음 주문", "Ice Shard", "마법 얼음", P.glassBreak({ size: "small" })),
      S("lightning-bolt", "번개 주문", "Lightning Bolt", "마법 번개", P.zap({ len: 0.5 })),
      S("heal", "회복 주문", "Heal Spell", "마법 회복 힐", P.chime({ notes: [523.25, 659.25, 783.99, 1046.5], dur: 1.6 })),
      S("wand", "마법 지팡이", "Magic Wand", "마법 지팡이", P.magicWand()),
      S("magic-bubble", "마법실", "Magic Bubble", "마법 마법실", P.portalOpen(2)),
      S("rune", "룬 활성화", "Rune Activate", "마법 룬", P.chime({ notes: [349.23, 415.3, 493.88], dur: 2 })),
      S("spell-fail", "주문 실패", "Spell Fail", "마법 실패", P.computerError()),
    ],
  },
  {
    slug: "magic-fantasy", name: "판타지 장면", nameEn: "Fantasy Scenes",
    description: "장소 전환과 존재 등장용 사운드.",
    category: "magic", license: "CC-BY-4.0", accent: ["#9d4edd", "#5a189a"],
    sounds: [
      S("portal", "포털 열림", "Portal", "마법 포털", P.portalOpen()),
      S("teleport", "순간이동", "Teleport", "마법 순간이동", P.teleport()),
      S("magic-circle", "마법진", "Magic Circle", "마법 마법진", P.spellCast(2)),
      S("ghost", "유령", "Ghost", "마법 유령", P.dreadDrone(4)),
      S("ring", "마법 반지", "Magic Ring", "마법 반지", P.chime({ notes: [220, 440, 660], dur: 2.4 })),
      S("crystal", "보석 테두기", "Crystal Rim", "마법 보석", P.metal({ freq: 2200, decay: 1.8 })),
      S("shape-shift", "변신", "Shape Shift", "마법 변신", P.teleport()),
      S("ancient-awaken", "고대 봉인 해제", "Ancient Awaken", "마법 봉인 해제", P.thunder({ size: "large" })),
    ],
  },

  // ═══════════════ 공포 ═══════════════
  {
    slug: "horror-drones", name: "공포 앰비언스", nameEn: "Horror Ambience",
    description: "긴장감을 만드는 낮은 드론. 영상 배경으로 씁니다.",
    category: "horror", license: "CC-BY-4.0", accent: ["#6b6b7b", "#2d2d3a"],
    sounds: [
      S("dread", "긴장 드론", "Dread Drone", "공포 긴장 드론", P.dreadDrone(6)),
      S("eerie", "으스스함", "Eerie", "공포 으스스", P.dreadDrone(4)),
      S("low-rumble", "낮은 럼블", "Low Rumble", "공포 럼블", P.rumble(5)),
      S("heartbeat", "심장 박동", "Heartbeat", "공포 심장", P.heartbeat()),
      S("breathing", "숨소리", "Breathing", "공포 숨소리", P.breath({ inOut: true })),
      S("tension-rising", "공포 상승", "Rising Tension", "공포 상승", P.riser(5)),
      S("heartbeat-fast", "심장 박동 (빠른)", "Fast Heartbeat", "공포 심장 빠른", P.heartbeat()),
    ],
  },
  {
    slug: "horror-jumpscares", name: "점프스케어", nameEn: "Jumpscares",
    description: "놀라게 만드는 소리. 영상 편집에서 가장 자주 쓰입니다.",
    category: "horror", license: "CC-BY-4.0", accent: ["#9b1c1c", "#3b0a0a"],
    sounds: [
      S("jumpscare", "점프스케어", "Jumpscare", "공포 점프스케어 깜짝", P.jumpscare()),
      S("sudden-bang", "갑작스러운 쿵", "Sudden Bang", "공포 펑 소리", P.impact({ body: 50, decay: 0.7, crack: 0.95, tone: 3400, drive: 0.35, crackDecay: 0.04 })),
      S("behind-you", "뒤에서 들려오는", "From Behind", "공포 뒤에서", P.wolfHowl(1.4)),
      S("figure-appears", "형체 등장", "Figure Appears", "공포 형체 등장", P.monsterGrowl()),
      S("window-shatter", "창문 깨짐", "Window Shatter", "공포 창문 깨짐", P.glassBreak({ size: "large" })),
      S("approaching-steps", "발소리 접근", "Approaching Steps", "공포 다가오는 발소리", P.footsteps("wood", 6)),
      S("nightmare", "악몽", "Nightmare", "공포 악몽", P.dreadDrone(8)),
    ],
  },
  {
    slug: "horror-creatures", name: "괴물 · 요괴", nameEn: "Creatures",
    description: "괴물과 짐승의 소리.",
    category: "horror", license: "CC-BY-4.0", accent: ["#5f5f7a", "#26263a"],
    sounds: [
      S("growl", "으르렁", "Growl", "공포 으르렁", P.monsterGrowl()),
      S("deep-growl", "저음 으르렁", "Deep Growl", "공포 깊은", P.monsterGrowl({ low: true })),
      S("roar", "포효", "Roar", "공포 포효", P.lionRoar()),
      S("scream", "비명", "Scream", "공포 비명", P.jumpscare()),
      S("something-moving", "무언가 움직임", "Something Moving", "공포 움직이는 것", P.scrub(1.6)),
      S("giant-steps", "거대 발소리", "Giant Steps", "공포 거대 발소리", P.footsteps("metal", 5)),
      S("feeding", "먹이 뜯는 소리", "Feeding", "공포 먹이", P.crunch({ duration: 1.2, tone: 800 })),
    ],
  },

  // ═══════════════ 음악 ═══════════════
  {
    slug: "music-melodies", name: "멜로디", nameEn: "Melodies",
    description: "배경음으로 쓸 수 있는 짧은 멜로디. 루프에 적합합니다.",
    category: "music", license: "CC-BY-4.0", accent: ["#ff6fae", "#b05cff"],
    sounds: [
      S("calm-melody", "잔잔한 멜로디", "Calm Melody", "멜로디 잔잔", P.melodyCalm()),
      S("synthwave", "신스웨이브", "Synthwave", "멜로디 신스", P.melodySynth()),
      S("uplifting", "기쁨 상승", "Uplifting", "멜로디 밝게", P.melodyUplift()),
      S("sad-piano", "슬픈 피아노", "Sad Piano", "멜로디 슬픈", P.melodySad()),
      S("pop-hook", "신나는 팝", "Pop Hook", "멜로디 팝", P.melodyPop()),
      S("mysterious", "신비로운 종소리", "Mysterious Bells", "멜로디 신비", P.chime({ notes: [659.25, 783.99, 987.77], dur: 3 })),
      S("bright-strings", "밝은 현악", "Bright Strings", "멜로디 현악", P.melodyUplift()),
      S("electric-guitar", "일렉 기타", "Electric Guitar", "멜로디 기타", P.melodySynth()),
    ],
  },
  {
    slug: "music-ringtones", name: "벨소리", nameEn: "Ringtones",
    description: "알림음으로 바로 쓸 수 있는 멜로디.",
    category: "music", license: "CC0", accent: ["#f472b6", "#db2777"],
    sounds: [
      S("ringtone-basic", "기본 벨소리", "Basic Ringtone", "벨소리 기본", P.melodyUplift()),
      S("ringtone-gentle", "차분한 벨소리", "Gentle Ringtone", "벨소리 차분", P.melodyCalm()),
      S("ringtone-pop", "팝 벨소리", "Pop Ringtone", "벨소리 팝", P.melodyPop()),
      S("ringtone-quiet", "조용한 벨소리", "Quiet Ringtone", "벨소리 조용", P.chime({ notes: [523.25, 659.25], dur: 1.6 })),
      S("ringtone-classic", "클래식 벨소리", "Classic Ringtone", "벨소리 클래식", P.melodySad()),
      S("ringtone-racing", "레이싱 벨소리", "Racing Ringtone", "벨소리 레이싱", P.melodySynth()),
      S("ringtone-mario", "마리오풍", "Retro Ringtone", "벨소리 마리오", P.melodyChip()),
      S("ringtone-sample", "샘플 벨소리", "Sample Ringtone", "벨소리 샘플", P.melodyChip()),
      S("ringtone-classic2", "구형 벨소리", "Vintage Ringtone", "벨소리 옛날", P.melodySynth()),
    ],
  },
  {
    slug: "music-instruments", name: "연주 소리", nameEn: "Instruments",
    description: "악기 하나만 연주한 소리. Karplus-Strong로 만든 현악이 자연스럽습니다.",
    category: "music", license: "CC0", accent: ["#c084fc", "#7e22ce"],
    sounds: [
      S("guitar-pluck", "기타 플럭", "Guitar Pluck", "악기 기타", P.pluck({ freq: 330, decay: 1.1, damping: 0.42 })),
      S("guitar-strum", "기타 스트로크", "Guitar Strum", "악기 기타", P.guitarStrum()),
      S("piano-note", "피아노", "Piano Note", "악기 피아노", P.pluck({ freq: 261.63, decay: 1.4, damping: 0.3 })),
      S("harp", "현악", "Harp", "악기 harp", P.pluck({ freq: 440, decay: 1.6, damping: 0.22 })),
      S("marimba", "마림바", "Marimba", "악기 마림바", P.pluck({ freq: 523.25, decay: 0.8, damping: 0.4 })),
      S("triangle", "삼각기", "Triangle", "악기 삼각기", P.metal({ freq: 3000, decay: 1.8 })),
      S("organ", "오르간", "Organ", "악기 오르간", P.melodyUplift()),
      S("drum", "북", "Drum", "악기 북 드럼", P.impact({ body: 150, decay: 0.18, crack: 0.4, tone: 1400 })),
      S("clavinet", "클라비네", "Clavinet", "악기 클라비네", P.pluck({ freq: 196, decay: 0.6, damping: 0.55 })),
    ],
  },

  // ═══════════════ 차량 ═══════════════
  {
    slug: "vehicle-cars", name: "자동차", nameEn: "Cars",
    description: "시동부터 경적까지. 차량 영상에 필요한 기본 소리.",
    category: "vehicle", license: "CC0", accent: ["#8ecae6", "#3a86c8"],
    sounds: [
      S("car-start", "시동", "Car Start", "차량 시동", P.motorSpin(true, 1.6)),
      S("car-idle", "아이들", "Idle", "차량 아이들", P.engineIdle()),
      S("car-accelerate", "가속", "Accelerate", "차량 가속", P.motorSpin(true, 2.4)),
      S("car-brake", "브레이크", "Brake", "차량 브레이크", P.scrub(0.7)),
      S("car-skid", "스키드", "Skid", "차량 미끄러", P.slide(1.2)),
      S("horn", "경적", "Horn", "차량 경적", P.carHorn()),
      S("trunk", "트렁크", "Trunk", "차량 트렁크", P.doorMove({ close: true })),
      S("car-door", "차문", "Car Door", "차량 문", P.doorMove({ close: true })),
      S("siren", "사이렌", "Siren", "차량 사이렌", P.siren({ len: 2.6 })),
    ],
  },
  {
    slug: "vehicle-heavy", name: "대형 교통수단", nameEn: "Heavy Transport",
    description: "기차, 비행기 등 큰 교통수단.",
    category: "vehicle", license: "CC-BY-4.0", accent: ["#adb5bd", "#495057"],
    sounds: [
      S("truck", "트럭", "Truck", "차량 트럭", P.engineIdle()),
      S("bus", "버스", "Bus", "차량 버스", P.engineIdle()),
      S("train", "기차", "Train", "차량 기차", P.trainPass()),
      S("train-pass", "기차 지나감", "Train Passing", "차량 기차 지나감", P.trainPass(5)),
      S("train-horn", "기차 경적", "Train Horn", "차량 기차 경적", P.carHorn(0.9, false)),
      S("helicopter", "헬리콥터", "Helicopter", "차량 헬리콥터", P.motorSpin(false, 4)),
      S("airplane", "비행기", "Airplane", "차량 비행기", P.airplane()),
      S("motorcycle", "오토바이", "Motorcycle", "차량 오토바이", P.motorcycle()),
    ],
  },
  {
    slug: "vehicle-alerts", name: "차량 경고음", nameEn: "Vehicle Alerts",
    description: "차량에서 실제로 나는 경고음들.",
    category: "vehicle", license: "CC0", accent: ["#ffd60a", "#ff8500"],
    sounds: [
      S("turn-signal", "방향 제한기", "Turn Signal", "차량 방향제한기", P.countdownTick(true)),
      S("seatbelt", "안전벨트 경고", "Seatbelt Warning", "차량 안전벨트", P.countdownTick(false)),
      S("parking-sensor", "주차 센서", "Parking Sensor", "차량 주차센서", P.beep({ freq: 1600, len: 0.1 })),
      S("reverse-beep", "후방 경보", "Reverse Beep", "차량 후방 경보", P.beep({ freq: 1100, len: 0.22, urgent: true })),
      S("dashboard-warning", "계기판 경고", "Dashboard Warning", "차량 계기판", P.computerError()),
      S("lock-confirm", "시동 잠금", "Lock Confirm", "차량 잠금", P.clack({ pitch: 1200, len: 0.12 })),
      S("low-battery-car", "배터리 저전압", "Car Low Battery", "차량 배터리", P.beep({ freq: 660, len: 0.3 })),
      S("cruise-control", "크루즈 컨트롤", "Cruise Control", "차량 크루즈", P.robotBeep(false)),
    ],
  },

  // ═══════════════ 군중 ═══════════════
  {
    slug: "crowd-people", name: "사람들", nameEn: "People",
    description: "박수와 함성. 실제 말소리는 아니지만 분위기를 전달합니다.",
    category: "crowd", license: "CC-BY-4.0", accent: ["#f4a261", "#e76f51"],
    sounds: [
      S("cheering", "함성", "Cheering", "사람 함성", P.crowd({ cheer: true, dur: 4 })),
      F("applause", "박수", "Applause", "사람 박수", "clap-1"),
      F("applause-big", "박수 (큰)", "Applause Big", "사람 박수 환호", "clap-2"),
      F("laughter", "웃음", "Laughter", "사람 웃음", "laughter"),
      S("murmur", "웅얼거림", "Murmur", "사람 웅얼", P.crowd({ cheer: false, dur: 5 })),
      S("market", "시장 소음", "Market", "사람 시장", P.crowd({ cheer: false, dur: 5 })),
      S("cafe", "카페 소음", "Cafe", "사람 카페", P.crowd({ cheer: false, dur: 5 })),
      S("ovation", "기립 환호", "Ovation", "사람 기립환호", P.crowd({ cheer: true, dur: 5 })),
      S("stadium", "경기장", "Stadium", "사람 관중 경기장", P.crowd({ cheer: true, dur: 6 })),
    ],
  },
  {
    slug: "crowd-indoor", name: "실내 사람 소리", nameEn: "Indoor Human",
    description: "실내에서 나는 소리.",
    category: "crowd", license: "CC0", accent: ["#e9c46a", "#c98a2b"],
    sounds: [
      S("conversation", "대화", "Conversation", "사람 대화 얘기", P.voiceBlip({ pitch: 180, len: 0.14 })),
      S("chatter", "여러 명 대화", "Chatter", "사람 여러 대화", P.crowd({ cheer: false, dur: 4 })),
      S("babies-laugh", "아이 웃음", "Baby Laugh", "사람 아이 웃음", P.bubbles(6)),
      S("baby-cry", "아이 울음", "Baby Cry", "사람 아이 울음", P.meow({ long: true })),
      S("party", "잔치", "Party", "사람 잔치 파티", P.crowd({ cheer: true, dur: 5 })),
      S("quiet-room", "조용한 방", "Quiet Room", "사람 조용한 방", P.roomTone(4)),
      S("clapping", "박수 소리", "Clapping", "사람 박수", P.crowd({ cheer: false, dur: 2.5 })),
      S("steps-people", "사람 걸음소리", "People Walking", "사람 사람 발걸음", P.footsteps("concrete", 5)),
    ],
  },

  // ═══════════════ 소도구 ═══════════════
  {
    slug: "foley-body", name: "몸 & 움직임", nameEn: "Body & Movement",
    description: "몸에서 나는 소리. 영상 Foley 작업용.",
    category: "foley", license: "CC0", accent: ["#b8c0cc", "#7d8796"],
    sounds: [
      S("heartbeat-slow", "심장 (느리게)", "Slow Heartbeat", "소도구 심장", P.heartbeat()),
      S("breath-in", "숨 들이쉬기", "Breath In", "소도구 숨", P.breath({ inOut: false })),
      S("cloth-move", "옷 부딪히는 소리", "Cloth Movement", "소도구 옷", P.scrub(0.9)),
      S("stomach-growl", "배에서 소리", "Stomach Growl", "소도구 배", P.rumble(1.2)),
      S("nod", "고개 끄덕임", "Head Nod", "소도구 고개", P.softKnock({ body: 260, decay: 0.08 })),
      S("cough", "기침", "Cough", "소도구 기침", P.cough()),
      S("hand-clap", "손뼉", "Hand Clap", "소도구 손뼉", P.punch(false)),
      S("body-shift", "몸 움직임", "Body Shift", "소도구 몸", P.softKnock({ body: 180, decay: 0.1 })),
    ],
  },
  {
    slug: "foley-paper", name: "종이 · 직물", nameEn: "Paper & Fabric",
    description: "편집 현장에서 가장 자주 쓰이는 소리.",
    category: "foley", license: "CC0", accent: ["#e5e7eb", "#9ca3af"],
    sounds: [
      S("paper-rustle", "종이 넘기기", "Paper Rustle", "소도구 종이", P.scrub(0.5)),
      S("paper-tear", "종이 찢기", "Paper Tear", "소도구 종이 찢기", P.crunch({ duration: 0.35, tone: 5200 })),
      F("book-turn", "책 넘기기", "Book Turn", "소도구 책", "book-turn"),
      F("book-pages", "책 여러 장 넘기기", "Turn Pages", "소도구 책 여러 장", "book-pages"),
      S("book-close", "책 닫기", "Book Close", "소도구 책 닫기", P.impact({ body: 150, decay: 0.16, crack: 0.4, tone: 2000 })),
      S("book-drop", "책 떨어뜨리기", "Book Drop", "소도구 책 떨어", P.impact({ body: 110, decay: 0.2, crack: 0.35, tone: 3000 })),
      S("cloth-fold", "옷 개어 담기", "Cloth Fold", "소도구 옷 접기", P.scrub(0.7)),
      S("bag-zip", "가방 지퍼", "Bag Zip", "소도구 가방", P.zipper()),
      S("unwrap", "포장지 찢기", "Unwrap", "소도구 포장지", P.crunch({ duration: 0.6, tone: 4400 })),
    ],
  },
  {
    slug: "foley-office", name: "사무실", nameEn: "Office",
    description: "책상과 컴퓨터에서 나는 소리.",
    category: "foley", license: "CC0", accent: ["#94a3b8", "#475569"],
    sounds: [
      S("typing", "타이핑", "Typing", "소도구 타이핑", P.typeKeyStroke()),
      S("typing-fast", "빠른 타이핑", "Fast Typing", "소도구 타이핑", P.typeKeyStroke()),
      S("mouse-click", "마우스 클릭", "Mouse Click", "소도구 마우스", P.mouseClick()),
      S("scroll", "스크롤", "Scroll", "소도구 스크롤", P.scroll()),
      S("computer-boot", "컴퓨터 부팅", "Computer Boot", "소도구 부팅", P.computerBoot()),
      S("printer-office", "프린터", "Office Printer", "소도구 프린터", P.printer()),
      S("clock-tick", "시계 초침", "Clock Tick", "소도구 시계", P.clockTick()),
      S("hourglass", "모래시계", "Hourglass", "소도구 모래시계", P.hourglass()),
      S("knock-door", "문 두드리기", "Knock on Door", "소도구 노크 문", P.clack({ pitch: 900, len: 0.22 })),
    ],
  },

  // ═══════════════ 사람 ═══════════════
  {
    slug: "human-voice", name: "사람 목소리", nameEn: "Human Voice",
    description: "말소리를 흉내 낸 것은 아니며, 실제로 들리는 단어는 없습니다.",
    category: "human", license: "CC-BY-4.0", accent: ["#e9a8c9", "#c2557e"],
    sounds: [
      S("sigh", "한숨", "Sigh", "사람 한숨", P.breath({ inOut: false })),
      S("gasp", "헉", "Gasp", "사람 헉 가쁜숨", P.breath({ inOut: false })),
      S("cough-human", "기침", "Cough", "사람 기침", P.cough()),
      S("throat-clear", "헛기침", "Throat Clear", "사람 헛기침", P.cough()),
      S("sneeze", "재채기", "Sneeze", "사람 재채기", P.sneeze()),
      F("laugh", "웃음", "Laugh", "사람 웃음", "laugh"),
      S("laugh-soft", "작게 웃음", "Soft Laugh", "사람 웃음 작게", P.laugh({ pitch: 1.18, count: 4, gain: 0.7 })),
      S("laugh-short", "짧은 웃음", "Short Laugh", "사람 웃음 짧게", P.laugh({ pitch: 0.92, count: 3 })),
      S("yawn", "하품", "Yawn", "사람 하품", P.meow({ long: true })),
      S("hum", "음 올리기", "Hum", "사람 humming", P.melodyHumming()),
      S("sniffle", "코 훌쩍", "Sniffle", "사람 훌쩍", P.bubbles(4)),
    ],
  },
  {
    slug: "human-effort", name: "노력 · 호흡", nameEn: "Effort & Breathing",
    description: "힘줄 때 나는 소리. 액션 장면의 빡셈을 살립니다.",
    category: "human", license: "CC-BY-4.0", accent: ["#f4a261", "#c2410c"],
    sounds: [
      S("grunt", "힘줄", "Grunt", "사람 힘줄", P.grunt()),
      S("heavy-breath", "무거운 숨", "Heavy Breath", "사람 숨", P.breath({ inOut: true })),
      S("running-breath", "달리는 숨", "Running Breath", "사람 숨 헐떡", P.breath({ inOut: false })),
      S("jump-effort", "점프 헉", "Jump Effort", "사람 점프", P.voiceBlip({ pitch: 210, len: 0.2 })),
      S("pain", "고통", "Pain", "사람 고통 아프", P.voiceBlip({ pitch: 320, len: 0.28 })),
      S("relief", "한숨 돌리기", "Relief", "사람 후하", P.breath({ inOut: false })),
      S("surprise", "깜짝", "Surprise", "사람 깜짝 놀람", P.voiceBlip({ pitch: 260, len: 0.18 })),
      S("effort-pull", "당기기 힘", "Pulling Effort", "사람 힘", P.riser(1.2)),
    ],
  },

  // ═══════════════ 충전음 ═══════════════
  {
    slug: "charging-complete", name: "충전 완료", nameEn: "Charging Complete",
    description: "배터리 앱용. 콘센트에 꽂는 순간부터 100%까지 한 사이클입니다.",
    category: "charging", license: "CC0", accent: ["#8ef06a", "#2fd6a8"], featured: true,
    sounds: [
      S("plug-connected", "콘센트 연결", "Plug Connected", "충전 연결 꽂기", P.impact({ body: 180, decay: 0.18, crack: 0.5, tone: 3200 })),
      S("charging-start", "충전 시작", "Charging Start", "충전 시작", P.chime({ notes: [392, 523.25], dur: 0.9 })),
      S("charging-complete", "충전 완료", "Charging Complete", "충전 완료 100%", P.chime({ notes: [659.25, 880, 1318.5], dur: 1.6 })),
      S("unplug", "분리", "Unplug", "충전 분리 뽑기", P.impact({ body: 200, decay: 0.14, crack: 0.45, tone: 2600 })),
      S("fast-charging", "급속 충전", "Fast Charging", "충전 급속", P.riser(2)),
      S("battery-low", "배터리 부족", "Battery Low", "충전 배터리 부족", P.countdownTick(false)),
      S("fully-charged", "완충 알림", "Fully Charged", "충전 완충", P.chime({ notes: [523.25, 659.25, 783.99, 1046.5], dur: 2.2 })),
      S("charge-vibration", "충전 진동", "Charge Vibration", "충전 진동", P.robotBeep(true)),
      S("power-off", "전원 꺼짐", "Power Off", "충전 전원 꺼짐", P.servo({ len: 0.7, up: false })),
    ],
  },
  {
    slug: "charging-device", name: "기기 상태", nameEn: "Device Status",
    description: "기기 상태 앱에 붙일 수 있는 상태음.",
    category: "charging", license: "CC0", accent: ["#7ef0c0", "#20c997"],
    sounds: [
      S("boot-up", "부팅", "Boot Up", "기기 부팅 시작", P.computerBoot()),
      S("reboot", "재부팅", "Reboot", "기기 재시작", P.computerBoot()),
      S("overheat", "과열 경고", "Overheat", "기기 과열 경고", P.computerError()),
      S("low-power", "저전력 모드", "Low Power Mode", "기기 저전력", P.beep({ freq: 880, len: 0.3 })),
      S("battery-full-notify", "충전 완료 알림", "Battery Full", "기기 충전 알림", P.messageBlip("send")),
      S("charge-buzz", "충전 중 버즈", "Charging Buzz", "기기 충전 중", P.beeBuzz(2)),
      S("update-done", "업데이트 완료", "Update Done", "기기 업데이트", P.uiSuccess()),
    ],
  },
];

// ─────────────────────────── 조회 헬퍼 ───────────────────────────

export function getPack(slug: string): Pack | undefined {
  return PACKS.find((p) => p.slug === slug);
}

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function packsByCategory(categorySlug: string): Pack[] {
  return PACKS.filter((p) => p.category === categorySlug);
}

export const TOTAL_SOUNDS = PACKS.reduce((sum, p) => sum + p.sounds.length, 0);

export const ALL_TAGS = Array.from(
  new Set(PACKS.flatMap((p) => p.sounds.flatMap((s) => s.tags))),
).sort((a, b) => a.localeCompare(b, "ko"));