/**
 * SFX 프리셋 — 실제로 쓰이는 효과음을 재현하는 생성기
 * ─────────────────────────────────────────────────────────────
 * 300개 이상의 사운드를 일관된 품질로 만들기 위해 데이터를 분산시키지 않고
 * 이 모듈에 "어떻게 그 소리가 나는가"를 모아둡니다.
 *
 * 실감의 핵심은 파형이 아니라 다음 세 가지입니다:
 *   1. 트랜지언트 (앞부분) — 노이즈가 아주 짧게 치고 빠지는 부분
 *   2. 바디 (몸통)     — 실제 공명이 나는 음높이
 *   3. 테일 (꼬리)     — 잔향·확산
 *
 * 타격음 하나를 "저역 쓰리 + 고역 노이즈"로만 만들면 바로 plastic 않습니다.
 * 아래 프리셋들은 대부분 이 세 층을 분리해서 만듭니다.
 */
import {
  env,
  n,
  type Envelope,
  type Filter,
  type Layer,
  type Note,
  type SynthSpec,
  type Waveform,
} from "./audio";

/** 결정론적 난수 — 프리셋 안에서 "무작위처럼" 보이는 값 생성용 */
function rng(seed: number) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const R = rng(7);

// ───────────────────── 1. 타격 · 임팩트 ─────────────────────

export interface ImpactOpts {
  /** 저역 몸통 주파수 */
  body?: number;
  /** 몸통 길이 */
  decay?: number;
  /** 트랜지언트 노이즈 양 */
  crack?: number;
  /** 트랜지언트 밝기 */
  tone?: number;
  /** 트랜지언트 길이 */
  crackDecay?: number;
  duration?: number;
  drive?: number;
  reverb?: number;
}

/** 타격 · 쿵 · 쿵 thud. 마음 · 쿵 · 쿵 thud. 저역 몸통 + 고역 트랜지언트 */
export function impact(o: ImpactOpts = {}): SynthSpec {
  const body = o.body ?? 90;
  const decay = o.decay ?? 0.22;
  const crack = o.crack ?? 0.55;
  const tone = o.tone ?? 4200;
  const crackDecay = o.crackDecay ?? 0.028;
  const duration = o.duration ?? decay * 2.2;

  return {
    duration,
    layers: [
      {
        source: "osc",
        notes: [
          n(0, decay * 1.6, body, {
            waveform: "sine",
            glide: 0.55,
            glideExp: true,
          }),
        ],
        gain: 0.95,
      },
      {
        source: "osc",
        notes: [n(0, decay * 0.7, body * 2.02, { waveform: "triangle", glide: 0.6 })],
        gain: 0.35,
      },
      {
        source: "noise",
        color: "white",
        burst: crackDecay,
        amp: env.perc(crackDecay, 0.0004),
        filter: {
          type: "bandpass",
          freq: tone,
          freqEnd: Math.max(180, tone * 0.16),
          q: 0.8,
          attack: 0.0004,
          decay: crackDecay * 1.1,
        },
        gain: crack,
      },
    ],
    bus: {
      highpass: crack > 0 ? 45 : 30,
      drive: o.drive ?? 0.12,
      reverb: o.reverb ? { mix: o.reverb, size: 0.6, decay: 1.0 } : undefined,
    },
  };
}

/** 찌그러짐 / 질척. 필터 스윕이 길게 끌리는 노이즈 */
export function crunch(o: { duration?: number; tone?: number } = {}): SynthSpec {
  const dur = o.duration ?? 0.5;
  return {
    duration: dur,
    layers: [
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.85,
        amp: { attack: 0.004, decay: dur * 0.5, sustain: 0.2, release: dur * 0.4 },
        filter: {
          type: "bandpass",
          freq: o.tone ?? 1600,
          freqEnd: (o.tone ?? 1600) * 0.22,
          q: 1.1,
          attack: 0.006,
          decay: dur * 0.7,
        },
        gain: 0.9,
      },
      {
        source: "noise",
        color: "white",
        burst: 0.06,
        amp: env.perc(0.05, 0.0008),
        filter: { type: "highpass", freq: 3500, q: 0.7 },
        gain: 0.4,
      },
    ],
    bus: { drive: 0.18, highpass: 60 },
  };
}

/** 부드러운 툭 — 물건이 부딪히되 가볍게 */
export function softKnock(o: { body?: number; decay?: number } = {}): SynthSpec {
  const body = o.body ?? 210;
  const decay = o.decay ?? 0.16;
  return {
    duration: decay * 2.4,
    layers: [
      {
        source: "osc",
        notes: [n(0, decay * 1.5, body, { waveform: "sine", glide: 0.7, glideExp: true })],
        gain: 0.8,
      },
      {
        source: "noise",
        color: "pink",
        burst: 0.05,
        amp: env.perc(0.045, 0.001),
        filter: { type: "lowpass", freq: 1800, q: 0.7 },
        gain: 0.28,
      },
    ],
    bus: { drive: 0.06 },
  };
}

// ───────────────────── 2. 금속 · 공명 ─────────────────────

/** 금속 타격 — 비조화 부분음 뱅크. 심벌 · 쟁 · 공구 · 기계 */
export function metal(o: {
  freq?: number;
  decay?: number;
  partials?: number[];
  bright?: number;
  duration?: number;
}): SynthSpec {
  const freq = o.freq ?? 520;
  const decay = o.decay ?? 1.4;
  const bright = o.bright ?? 1;
  return {
    duration: o.duration ?? decay * 1.1,
    layers: [
      {
        source: "metal",
        partials: o.partials ?? [1, 1.73, 2.41, 3.17, 4.31, 5.62],
        partialDecay: [1, 1.5, 2.1, 2.9, 3.8, 5],
        notes: [n(0, decay, freq)],
        gain: 0.9,
        filter: { type: "highpass", freq: 120 },
      },
      {
        source: "noise",
        color: "white",
        burst: 0.02,
        amp: env.perc(0.018, 0.0003),
        filter: {
          type: "bandpass",
          freq: 6000 * bright,
          freqEnd: 1200,
          q: 0.7,
          attack: 0.0003,
          decay: 0.02,
        },
        gain: 0.45,
      },
    ],
    bus: { reverb: { mix: 0.2, size: 0.7, decay: 1.2 }, highpass: 90 },
  };
}

/** 현악기 플럭 — Karplus-Strong. 기타 · 현 · harp */
export function pluck(o: {
  freq?: number;
  decay?: number;
  damping?: number;
  duration?: number;
}): SynthSpec {
  const decay = o.decay ?? 0.9;
  return {
    duration: o.duration ?? decay * 1.4,
    layers: [
      {
        source: "pluck",
        notes: [n(0, decay, o.freq ?? 330)],
        damping: o.damping ?? 0.5,
        gain: 0.85,
      },
      {
        source: "noise",
        color: "white",
        burst: 0.008,
        amp: env.perc(0.007, 0.0003),
        filter: { type: "bandpass", freq: 3200, q: 0.9 },
        gain: 0.12,
      },
    ],
    bus: { highpass: 80, reverb: { mix: 0.16, size: 0.6, decay: 0.9 } },
  };
}

/** 유리 깨짐 — 높은 비조화음 + 파편 노이즈 */
export function glassBreak(o: { size?: "small" | "large" } = {}): SynthSpec {
  const small = o.size !== "large";
  const base = small ? 2400 : 1300;
  const pieces = small ? 7 : 11;
  const dur = small ? 1.3 : 2.2;

  const scatter: Note[] = [];
  for (let i = 0; i < pieces; i++) {
    const at = i * 0.055 + R() * 0.04;
    scatter.push(
      n(at, 0.22 + R() * 0.5, base * (0.7 + R() * 1.6), {
        waveform: "sine",
        gain: 0.35 + R() * 0.4,
      }),
    );
  }

  return {
    duration: dur,
    layers: [
      { source: "metal", notes: [n(0, 0.5, base)], partials: [1, 2.31, 3.77], gain: 0.55 },
      {
        source: "osc",
        notes: scatter,
        gain: 0.5,
        filter: { type: "highpass", freq: 900 },
      },
      {
        source: "noise",
        color: "white",
        burst: 0.35,
        amp: env.perc(0.3, 0.0008),
        filter: { type: "highpass", freq: 2600, q: 0.6 },
        gain: 0.35,
      },
    ],
    bus: { reverb: { mix: 0.26, size: 0.75, decay: 1.4 }, highpass: 400 },
  };
}

// ───────────────────── 3. 공기 · 바람 ─────────────────────

/** 휘이 소리 — 밴드패스가 위아래로 훑는 노이즈 */
export function swoosh(o: { dur?: number; from?: number; to?: number } = {}): SynthSpec {
  const dur = o.dur ?? 0.42;
  const from = o.from ?? 500;
  const to = o.to ?? 3200;
  return {
    duration: dur,
    layers: [
      {
        source: "noise",
        color: "pink",
        burst: dur,
        amp: { attack: dur * 0.3, decay: dur * 0.22, sustain: 0.55, release: dur * 0.4 },
        filter: {
          type: "bandpass",
          freq: from,
          freqEnd: to,
          q: 1.6,
          attack: dur * 0.3,
          decay: dur * 0.5,
        },
        gain: 0.85,
      },
      {
        source: "noise",
        color: "white",
        burst: dur * 0.7,
        amp: { attack: dur * 0.25, decay: dur * 0.2, sustain: 0.4, release: dur * 0.35 },
        filter: { type: "bandpass", freq: to * 1.6, freqEnd: from * 2, q: 2.2 },
        gain: 0.3,
      },
    ],
    bus: { highpass: 260 },
  };
}

/** 바람 — 느리게 흔들리는 브라운 노이즈 */
export function wind(o: { gust?: number; dur?: number } = {}): SynthSpec {
  const dur = o.dur ?? 4;
  const gust = o.gust ?? 0.6;
  return {
    duration: dur,
    layers: [
      {
        source: "noise",
        color: "brown",
        burst: dur,
        amp: {
          attack: dur * 0.25,
          decay: dur * 0.2,
          sustain: 0.7,
          release: dur * 0.3,
        },
        filter: {
          type: "lowpass",
          freq: 320 * gust,
          freqEnd: 1100 * gust,
          q: 0.9,
          attack: dur * 0.3,
          decay: dur * 0.55,
        },
        gain: 0.9,
      },
      {
        source: "noise",
        color: "pink",
        burst: dur,
        amp: {
          attack: dur * 0.3,
          decay: dur * 0.25,
          sustain: 0.5,
          release: dur * 0.3,
        },
        filter: { type: "bandpass", freq: 900, freqEnd: 1800, q: 1.2 },
        gain: 0.3,
      },
    ],
    bus: { highpass: 55, lowpass: 7000 },
  };
}

// ───────────────────── 4. 물 ─────────────────────

/** 물방울 / 방울 — 버블처럼 빠르게 상승하는 음 */
export function waterDrop(o: { freq?: number; dur?: number } = {}): SynthSpec {
  const dur = o.dur ?? 0.16;
  return {
    duration: dur * 2.6,
    layers: [
      {
        source: "osc",
        notes: [
          n(0, dur, o.freq ?? 620, {
            waveform: "sine",
            glide: 3.2,
            glideExp: true,
          }),
        ],
        gain: 0.7,
        filter: { type: "bandpass", freq: 2600, freqEnd: 5200, q: 2.4, attack: 0.002, decay: dur },
      },
      {
        source: "noise",
        color: "white",
        burst: 0.012,
        amp: env.perc(0.011, 0.0003),
        filter: { type: "highpass", freq: 4200 },
        gain: 0.18,
      },
    ],
    bus: { reverb: { mix: 0.18, size: 0.7, decay: 0.8 } },
  };
}

/** 물튀김 / 물을 부어 넣는 소리 */
export function splash(o: { size?: "small" | "large" } = {}): SynthSpec {
  const large = o.size === "large";
  const dur = large ? 1.5 : 0.8;
  return {
    duration: dur,
    layers: [
      {
        source: "noise",
        color: "white",
        burst: dur * 0.8,
        amp: { attack: 0.004, decay: dur * 0.3, sustain: 0.4, release: dur * 0.4 },
        filter: {
          type: "bandpass",
          freq: large ? 2200 : 3400,
          freqEnd: 600,
          q: 0.9,
          attack: 0.005,
          decay: dur * 0.45,
        },
        gain: 0.8,
      },
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.7,
        amp: { attack: 0.01, decay: dur * 0.4, sustain: 0.35, release: dur * 0.35 },
        filter: { type: "lowpass", freq: 900, freqEnd: 350, q: 0.7 },
        gain: 0.45,
      },
      {
        source: "osc",
        notes: [n(0, dur * 0.4, large ? 90 : 150, { waveform: "sine", glide: 0.6, glideExp: true })],
        gain: 0.35,
      },
    ],
    bus: { reverb: { mix: 0.22, size: 0.7, decay: 1.2 } },
  };
}

/** 물 flowing · 흘러가는 물 (루프) */
export function flowingWater(dur = 5): SynthSpec {
  return {
    duration: dur,
    layers: [
      {
        source: "noise",
        color: "white",
        burst: dur,
        amp: {
          attack: dur * 0.2,
          decay: dur * 0.15,
          sustain: 0.8,
          release: dur * 0.25,
        },
        filter: {
          type: "bandpass",
          freq: 1400,
          freqEnd: 2600,
          q: 0.7,
          attack: dur * 0.3,
          decay: dur * 0.6,
        },
        gain: 0.55,
      },
      {
        source: "noise",
        color: "pink",
        burst: dur,
        amp: {
          attack: dur * 0.25,
          decay: dur * 0.2,
          sustain: 0.7,
          release: dur * 0.2,
        },
        filter: { type: "bandpass", freq: 3200, freqEnd: 5200, q: 1.6 },
        gain: 0.3,
      },
      {
        source: "noise",
        color: "brown",
        burst: dur,
        amp: { attack: dur * 0.2, decay: dur * 0.2, sustain: 0.7, release: dur * 0.2 },
        filter: { type: "lowpass", freq: 500 },
        gain: 0.3,
      },
    ],
    bus: { highpass: 180 },
  };
}

// ───────────────────── 5. 불 · 자연 ─────────────────────

/** 불꽃 — 아주 잦은 랜덤 크래클 */
export function fire(o: { intensity?: number; dur?: number } = {}): SynthSpec {
  const dur = o.dur ?? 4;
  const intensity = o.intensity ?? 1;
  const count = Math.round(50 * intensity);

  const layers: Layer[] = [
    {
      source: "noise",
      color: "brown",
      burst: dur,
      amp: { attack: dur * 0.2, decay: dur * 0.2, sustain: 0.65, release: dur * 0.25 },
      filter: { type: "lowpass", freq: 700, freqEnd: 1100, q: 0.8 },
      gain: 0.12 + intensity * 0.4,
    },
  ];

  // 개별 크래클 — Layer.at 으로 시간축에 흩뿌린다
  for (let i = 0; i < count; i++) {
    const life = 0.004 + R() * 0.02;
    layers.push({
      source: "noise",
      at: (i / count) * dur * 0.92 + R() * (dur / count),
      burst: life,
      amp: env.perc(life, 0.0002),
      filter: { type: "bandpass", freq: 1200 + R() * 4200, q: 1.8 },
      gain: 0.05 + R() * 0.1,
    });
  }

  return { duration: dur, layers, bus: { highpass: 120, lowpass: 11000 } };
}

/** 천둥 — 저역 럼블 + 산란 */
export function thunder(o: { size?: "small" | "large"; dur?: number } = {}): SynthSpec {
  const large = o.size === "large";
  const dur = o.dur ?? (large ? 4.5 : 2.4);
  return {
    duration: dur,
    layers: [
      {
        source: "noise",
        color: "brown",
        burst: dur * 0.9,
        amp: { attack: 0.008, decay: dur * 0.35, sustain: 0.45, release: dur * 0.4 },
        filter: { type: "lowpass", freq: 260, freqEnd: 90, q: 0.8 },
        gain: 1,
      },
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.8,
        amp: { attack: 0.004, decay: dur * 0.3, sustain: 0.35, release: dur * 0.35 },
        filter: { type: "bandpass", freq: 900, freqEnd: 300, q: 0.7 },
        gain: 0.55,
      },
      {
        source: "osc",
        notes: [
          n(0, dur * 0.6, large ? 42 : 62, { waveform: "sine", glide: 0.5, glideExp: true }),
        ],
        gain: 0.7,
      },
    ],
    bus: { reverb: { mix: 0.3, size: 0.9, decay: 2.6 }, highpass: 28 },
  };
}

/** 빗소리 — 넓은 스펙트럼의 고른 노이즈 + 간헐적 방울 */
export function rain(o: { heavy?: boolean; dur?: number } = {}): SynthSpec {
  const dur = o.dur ?? 5;
  const drops = o.heavy ? 40 : 22;
  const heavy = o.heavy ?? false;

  const layers: Layer[] = [
    {
      source: "noise",
      color: "pink",
      burst: dur,
      amp: { attack: dur * 0.15, decay: dur * 0.15, sustain: 0.85, release: dur * 0.2 },
      filter: { type: "bandpass", freq: 1100, freqEnd: 2400, q: 0.5 },
      gain: heavy ? 0.7 : 0.45,
    },
    {
      source: "noise",
      color: "white",
      burst: dur,
      amp: { attack: dur * 0.12, decay: dur * 0.15, sustain: 0.8, release: dur * 0.2 },
      filter: { type: "highpass", freq: 2600 },
      gain: 0.28,
    },
    {
      source: "noise",
      color: "brown",
      burst: dur,
      amp: { attack: dur * 0.2, decay: dur * 0.2, sustain: 0.6, release: dur * 0.2 },
      filter: { type: "lowpass", freq: 380 },
      gain: 0.22,
    },
  ];

  // 물방울이 지붕에 떨어지는 간헐적 틱
  for (let i = 0; i < drops; i++) {
    const life = 0.004 + R() * 0.012;
    layers.push({
      source: "noise",
      at: R() * dur * 0.94,
      burst: life,
      amp: env.perc(life, 0.0002),
      filter: { type: "bandpass", freq: 2200 + R() * 4200, q: 2.2 },
      gain: 0.04 + R() * 0.07,
    });
  }

  return { duration: dur, layers, bus: { highpass: 140 } };
}

// ───────────────────── 6. 생물 · 동물 ─────────────────────

/** 새 울음소리 — 주파수 변조로 만든 짧은 멜로디 */
export function chirp(o: {
  base?: number;
  count?: number;
  dur?: number;
  warble?: boolean;
}): SynthSpec {
  const base = o.base ?? 2600;
  const count = o.count ?? 3;
  const gap = o.dur ?? 0.09;
  const notes: Note[] = [];

  for (let i = 0; i < count; i++) {
    const at = i * (gap + 0.035);
    const up = i % 2 === 0;
    notes.push(
      n(at, gap * 0.9, base * (0.85 + R() * 0.3), {
        waveform: "sine",
        glide: up ? 1.5 : 0.68,
        glideExp: true,
        gain: 0.55 + R() * 0.3,
      }),
    );
  }

  const dur = count * (gap + 0.05) + 0.25;
  return {
    duration: dur,
    layers: [
      {
        source: "osc",
        notes,
        gain: 0.85,
        filter: { type: "bandpass", freq: base * 1.4, q: 1.4 },
        vibrato: o.warble ? { rate: 42, depth: base * 0.12 } : undefined,
      },
      {
        source: "noise",
        color: "white",
        burst: 0.006,
        amp: env.perc(0.005, 0.0003),
        filter: { type: "highpass", freq: 3400 },
        gain: 0.08,
      },
    ],
    bus: { reverb: { mix: 0.2, size: 0.75, decay: 1.1 }, highpass: 400 },
  };
}

/** 짖는 소리 — 거친 하울링 */
export function bark(o: { rough?: boolean } = {}): SynthSpec {
  const rough = o.rough ?? false;
  return {
    duration: 0.55,
    layers: [
      {
        source: "osc",
        notes: [
          n(0, 0.26, rough ? 300 : 230, {
            waveform: "sawtooth",
            glide: 0.62,
            glideExp: true,
          }),
        ],
        gain: 0.8,
        filter: {
          type: "bandpass",
          freq: 1100,
          freqEnd: 620,
          q: 1.1,
          attack: 0.008,
          decay: 0.2,
        },
        vibrato: { rate: 32, depth: 34 },
      },
      {
        source: "noise",
        color: "pink",
        burst: 0.22,
        amp: env.perc(0.18, 0.006),
        filter: { type: "bandpass", freq: 1800, freqEnd: 900, q: 1.4 },
        gain: 0.45,
      },
      {
        source: "noise",
        color: "white",
        burst: 0.03,
        amp: env.perc(0.028, 0.001),
        filter: { type: "highpass", freq: 3000 },
        gain: 0.25,
      },
    ],
    bus: { drive: 0.2, highpass: 90 },
  };
}

/** 고양이 야옹 */
export function meow(o: { long?: boolean } = {}): SynthSpec {
  const dur = o.long ? 0.95 : 0.6;
  return {
    duration: dur,
    layers: [
      {
        source: "osc",
        notes: [
          n(0, dur * 0.8, 520, { waveform: "sawtooth", glide: 1.7, glideExp: true }),
        ],
        gain: 0.75,
        filter: {
          type: "bandpass",
          freq: 1500,
          freqEnd: 2400,
          q: 1.6,
          attack: dur * 0.25,
          decay: dur * 0.5,
        },
        vibrato: { rate: 8, depth: 40 },
      },
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.7,
        amp: { attack: dur * 0.2, decay: dur * 0.3, sustain: 0.3, release: dur * 0.3 },
        filter: { type: "bandpass", freq: 2000, q: 1.8 },
        gain: 0.2,
      },
    ],
    bus: { drive: 0.14, reverb: { mix: 0.16, size: 0.6, decay: 0.7 } },
  };
}

/** 개 짖음 — 짧게 여러 번 */
export function dogBark(count = 3): SynthSpec {
  const layers: Layer[] = [];
  for (let i = 0; i < count; i++) {
    const at = i * 0.34;
    layers.push({
      source: "osc",
      notes: [n(at, 0.2, 260 + R() * 90, { waveform: "sawtooth", glide: 0.6, glideExp: true })],
      gain: 0.8,
      filter: {
        type: "bandpass",
        freq: 1200,
        freqEnd: 600,
        q: 1.2,
        attack: 0.006,
        decay: 0.16,
      },
      vibrato: { rate: 30, depth: 40 },
    });
    layers.push({
      source: "noise",
      color: "pink",
      burst: 0.18,
      amp: env.perc(0.15, 0.004),
      filter: { type: "bandpass", freq: 1700, freqEnd: 800, q: 1.4 },
      gain: 0.42,
    });
  }
  return { duration: count * 0.34 + 0.3, layers, bus: { drive: 0.16 } };
}

// ───────────────────── 7. 걸음 · 이동 ─────────────────────

export type Surface = "concrete" | "wood" | "grass" | "snow" | "metal" | "water";

/** 발걸음 — 표면마다 노이즈 대역과 공명이 다릅니다 */
export function footstep(surface: Surface = "concrete"): SynthSpec {
  const cfg: Record<Surface, { tone: number; body: number; crack: number; dur: number; res?: number }> = {
    concrete: { tone: 2600, body: 120, crack: 0.5, dur: 0.3, res: 0.8 },
    wood: { tone: 1300, body: 150, crack: 0.45, dur: 0.36, res: 2.2 },
    grass: { tone: 3600, body: 105, crack: 0.3, dur: 0.26 },
    snow: { tone: 4600, body: 95, crack: 0.38, dur: 0.32 },
    metal: { tone: 2400, body: 320, crack: 0.5, dur: 0.45, res: 3.4 },
    water: { tone: 1900, body: 110, crack: 0.5, dur: 0.4 },
  };
  const c = cfg[surface];

  const layers: Layer[] = [
    {
      source: "osc",
      notes: [n(0, c.dur * 0.7, c.body, { waveform: "sine", glide: 0.6, glideExp: true })],
      gain: 0.7,
    },
    {
      source: "noise",
      color: "white",
      burst: c.dur * 0.45,
      amp: env.perc(c.dur * 0.35, 0.0008),
      filter: {
        type: "bandpass",
        freq: c.tone,
        freqEnd: c.tone * 0.4,
        q: c.res ?? 0.8,
        attack: 0.001,
        decay: c.dur * 0.4,
      },
      gain: c.crack,
    },
  ];

  if (surface === "metal" || surface === "wood") {
    layers.push({
      source: "metal",
      notes: [n(0, c.dur, c.body * 4)],
      partials: [1, 2.4, 3.9],
      gain: 0.2,
    });
  }

  return { duration: c.dur * 2.2, layers, bus: { highpass: 70 } };
}

/** 걷기 한 세트 (4보) */
export function footsteps(surface: Surface = "concrete", steps = 4): SynthSpec {
  const gap = surface === "metal" ? 0.34 : 0.46;
  const layers: Layer[] = [];

  for (let i = 0; i < steps; i++) {
    const at = i * gap;
    const jitter = 0.82 + R() * 0.36;
    const step = footstep(surface);

    // 발밑 쿵
    layers.push({
      source: "osc",
      at,
      notes: [
        n(0, step.duration * 0.5, (surface === "metal" ? 320 : 120) * jitter, {
          waveform: "sine",
          glide: 0.6,
          glideExp: true,
        }),
      ],
      gain: 0.5 * jitter,
    });

    // 표면 마찰 노이즈
    const life = 0.09 + R() * 0.05;
    layers.push({
      source: "noise",
      at,
      burst: life,
      amp: env.perc(life * 0.85, 0.0008),
      filter: {
        type: "bandpass",
        freq: (surface === "concrete" ? 2600 : surface === "wood" ? 1300 : 3400) * jitter,
        freqEnd: 900,
        q: surface === "wood" ? 2.2 : 0.8,
        attack: 0.001,
        decay: life * 0.8,
      },
      gain: 0.4 * jitter,
    });
  }

  return { duration: steps * gap + 0.6, layers, bus: { highpass: 70 } };
}

// ───────────────────── 8. 기계 · Sci-Fi ─────────────────────

/** 레이저 / 빔 */
export function laser(o: { len?: number; high?: boolean } = {}): SynthSpec {
  const dur = o.len ?? 0.42;
  const f = o.high ? 1700 : 900;
  return {
    duration: dur,
    layers: [
      {
        source: "osc",
        notes: [n(0, dur * 0.85, f * 2.4, { waveform: "sawtooth", glide: 0.18, glideExp: true })],
        gain: 0.7,
        filter: {
          type: "bandpass",
          freq: f * 6,
          freqEnd: f * 1.6,
          q: 4,
          attack: 0.002,
          decay: dur * 0.6,
        },
      },
      {
        source: "osc",
        notes: [n(0, dur * 0.8, f * 1.2, { waveform: "square", glide: 0.25, glideExp: true })],
        gain: 0.35,
      },
      {
        source: "noise",
        color: "white",
        burst: dur * 0.5,
        amp: env.perc(dur * 0.35, 0.001),
        filter: { type: "bandpass", freq: 5200, freqEnd: 1600, q: 2.4 },
        gain: 0.22,
      },
    ],
    bus: { drive: 0.2, reverb: { mix: 0.14, size: 0.6, decay: 0.6 } },
  };
}

/** 전기 방전 / 스파크 */
export function zap(o: { len?: number } = {}): SynthSpec {
  const dur = o.len ?? 0.2;
  const ticks = 11;
  const layers: Layer[] = [
    {
      source: "noise",
      color: "white",
      burst: dur * 0.8,
      amp: env.perc(dur * 0.6, 0.0003),
      filter: {
        type: "highpass",
        freq: 3000,
        freqEnd: 7000,
        q: 1.2,
        attack: 0.0004,
        decay: dur * 0.6,
      },
      gain: 0.6,
    },
    {
      source: "osc",
      notes: [n(0, dur * 0.4, 3200, { waveform: "square", glide: 0.25, glideExp: true })],
      gain: 0.28,
    },
  ];

  // 불꽃이 튀는 개별 틱
  for (let i = 0; i < ticks; i++) {
    layers.push({
      source: "noise",
      color: "white",
      at: R() * dur * 0.8,
      burst: 0.002 + R() * 0.004,
      amp: env.perc(0.004, 0.0002),
      filter: { type: "highpass", freq: 4000 + R() * 5000 },
      gain: 0.08 + R() * 0.14,
    });
  }

  return { duration: dur, layers, bus: { drive: 0.25 } };
}

/** 서보 모터 / 기계 이동 */
export function servo(o: { len?: number; up?: boolean } = {}): SynthSpec {
  const dur = o.len ?? 0.6;
  return {
    duration: dur,
    layers: [
      {
        source: "noise",
        color: "white",
        burst: dur * 0.9,
        amp: { attack: 0.02, decay: dur * 0.4, sustain: 0.6, release: dur * 0.2 },
        filter: {
          type: "bandpass",
          freq: o.up ? 700 : 2400,
          freqEnd: o.up ? 2400 : 700,
          q: 6,
          attack: dur * 0.35,
          decay: dur * 0.55,
        },
        gain: 0.7,
      },
      {
        source: "osc",
        notes: [
          n(0.02, dur * 0.85, o.up ? 180 : 520, {
            waveform: "sawtooth",
            glide: o.up ? 2.4 : 0.42,
            glideExp: true,
          }),
        ],
        gain: 0.3,
        filter: { type: "lowpass", freq: 1600, freqEnd: 800, q: 2 },
      },
    ],
    bus: { drive: 0.1 },
  };
}

/** 기계 클릭 / 릴레이 */
export function clack(o: { pitch?: number; len?: number } = {}): SynthSpec {
  const dur = o.len ?? 0.14;
  return {
    duration: dur * 2.6,
    layers: [
      {
        source: "noise",
        color: "white",
        burst: 0.014,
        amp: env.perc(0.013, 0.0003),
        filter: {
          type: "bandpass",
          freq: (o.pitch ?? 2400) * 1.6,
          freqEnd: (o.pitch ?? 2400) * 0.5,
          q: 1.2,
          attack: 0.0003,
          decay: 0.014,
        },
        gain: 0.65,
      },
      {
        source: "metal",
        notes: [n(0, 0.1, o.pitch ?? 2400)],
        partials: [1, 2.7, 4.1],
        gain: 0.3,
      },
      {
        source: "osc",
        notes: [n(0, 0.06, (o.pitch ?? 2400) * 0.4, { waveform: "square", glide: 0.5 })],
        gain: 0.25,
      },
    ],
    bus: { highpass: 150 },
  };
}

/** 비콘 / 알림 부저 */
export function beep(o: { freq?: number; len?: number; urgent?: boolean } = {}): SynthSpec {
  const dur = o.len ?? 0.14;
  const freq = o.freq ?? 880;
  return {
    duration: dur * 1.9,
    layers: [
      {
        source: "osc",
        notes: [n(0, dur * 0.78, freq, { waveform: o.urgent ? "square" : "sine" })],
        gain: 0.65,
        filter: { type: "lowpass", freq: freq * 5, q: 1 },
      },
      {
        source: "osc",
        notes: [n(0, dur * 0.78, freq * 2, { waveform: "sine", gain: 0.22 })],
        gain: 0.4,
      },
      {
        source: "noise",
        color: "white",
        burst: 0.003,
        amp: env.perc(0.0025, 0.0002),
        filter: { type: "highpass", freq: 3000 },
        gain: 0.1,
      },
    ],
    bus: { highpass: 200 },
  };
}

/** 사이렌 */
export function siren(o: { len?: number; rise?: boolean } = {}): SynthSpec {
  const dur = o.len ?? 3;
  return {
    duration: dur,
    layers: [
      {
        source: "osc",
        notes: [n(0, dur * 0.95, o.rise ? 420 : 760, { waveform: "sawtooth", glide: o.rise ? 2.1 : 0.48, glideExp: true })],
        gain: 0.7,
        filter: {
          type: "lowpass",
          freq: 2600,
          freqEnd: 900,
          q: 2.2,
          attack: dur * 0.2,
          decay: dur * 0.7,
        },
        vibrato: { rate: 0.55, depth: 34 },
      },
      {
        source: "osc",
        notes: [n(0, dur * 0.95, (o.rise ? 420 : 760) * 1.5, { waveform: "sine", glide: o.rise ? 2.1 : 0.48, glideExp: true })],
        gain: 0.3,
      },
    ],
    bus: { reverb: { mix: 0.22, size: 0.85, decay: 1.8 }, highpass: 160 },
  };
}

// ───────────────────── 9. 게임 ─────────────────────

export function coinPickup(variation = 0): SynthSpec {
  const base = 1046.5 * (1 + variation * 0.12);
  return {
    duration: 0.42,
    layers: [
      {
        source: "metal",
        notes: [
          n(0, 0.1, base),
          n(0.055, 0.34, base * 1.335),
        ],
        partials: [1, 2.41, 3.82, 5.1],
        partialDecay: [1, 1.3, 2, 3],
        gain: 0.8,
      },
      {
        source: "noise",
        color: "white",
        burst: 0.006,
        amp: env.perc(0.005, 0.0003),
        filter: { type: "highpass", freq: 5200 },
        gain: 0.1,
      },
    ],
    bus: { reverb: { mix: 0.12, size: 0.55, decay: 0.5 } },
  };
}

export function jumpSfx(o: { high?: boolean } = {}): SynthSpec {
  const base = o.high ? 330 : 240;
  return {
    duration: 0.36,
    layers: [
      {
        source: "osc",
        notes: [n(0, 0.3, base, { waveform: "square", glide: 3.4, glideExp: true })],
        gain: 0.6,
        filter: { type: "lowpass", freq: 2600, freqEnd: 4200, q: 1.4 },
      },
      {
        source: "noise",
        color: "white",
        burst: 0.05,
        amp: env.perc(0.04, 0.002),
        filter: { type: "bandpass", freq: 900, freqEnd: 2400, q: 1 },
        gain: 0.14,
      },
    ],
  };
}

export function landSfx(hard = false): SynthSpec {
  const d = hard ? 0.34 : 0.16;
  return {
    duration: d * 2.4,
    layers: [
      {
        source: "osc",
        notes: [n(0, d * 1.5, hard ? 72 : 110, { waveform: "sine", glide: 0.55, glideExp: true })],
        gain: 0.9,
      },
      {
        source: "noise",
        color: hard ? "white" : "pink",
        burst: d * 0.7,
        amp: env.perc(d * 0.55, 0.0006),
        filter: {
          type: "bandpass",
          freq: hard ? 2400 : 1200,
          freqEnd: hard ? 500 : 300,
          q: 0.9,
          attack: 0.0006,
          decay: d * 0.5,
        },
        gain: hard ? 0.45 : 0.22,
      },
    ],
    bus: { drive: 0.1 },
  };
}

export function powerUp(o: { len?: number } = {}): SynthSpec {
  const dur = o.len ?? 0.8;
  const steps = [1, 1.26, 1.5, 2];
  return {
    duration: dur,
    layers: [
      {
        source: "osc",
        notes: steps.map((ratio, i) =>
          n(i * (dur * 0.16), dur * 0.5, 440 * ratio, {
            waveform: "square",
            gain: 0.5,
          }),
        ),
        gain: 0.6,
        filter: { type: "lowpass", freq: 1200, freqEnd: 6000, q: 1.4 },
      },
      {
        source: "osc",
        notes: [n(0, dur * 0.85, 220, { waveform: "sawtooth", glide: 4, glideExp: true })],
        gain: 0.3,
      },
    ],
    bus: { reverb: { mix: 0.16, size: 0.6, decay: 0.8 } },
  };
}

export function explosionSfx(size: "small" | "medium" | "large" = "medium"): SynthSpec {
  const cfg = {
    small: { body: 110, decay: 0.5, tone: 2600, crack: 0.6, dur: 0.9 },
    medium: { body: 78, decay: 1.1, tone: 1900, crack: 0.8, dur: 1.9 },
    large: { body: 52, decay: 2.2, tone: 1300, crack: 0.95, dur: 3.6 },
  }[size];
  const c = cfg;

  return {
    duration: c.dur,
    layers: [
      {
        source: "osc",
        notes: [n(0, c.decay * 1.4, c.body, { waveform: "sine", glide: 0.38, glideExp: true })],
        gain: 1,
      },
      {
        source: "noise",
        color: "brown",
        burst: c.dur * 0.85,
        amp: { attack: 0.002, decay: c.decay * 0.5, sustain: 0.4, release: c.decay * 0.7 },
        filter: {
          type: "lowpass",
          freq: c.tone,
          freqEnd: 120,
          q: 0.9,
          attack: 0.002,
          decay: c.decay * 0.8,
        },
        gain: 0.95,
      },
      {
        source: "noise",
        color: "white",
        burst: 0.09,
        amp: env.perc(0.08, 0.0004),
        filter: { type: "bandpass", freq: 5200, freqEnd: 900, q: 0.7 },
        gain: c.crack,
      },
      {
        source: "noise",
        color: "white",
        burst: c.dur * 0.7,
        amp: { attack: 0.02, decay: c.decay * 0.6, sustain: 0.2, release: c.decay * 0.5 },
        filter: { type: "lowpass", freq: 900, freqEnd: 250 },
        gain: 0.35,
      },
    ],
    bus: { drive: 0.3, reverb: { mix: 0.26, size: 0.9, decay: 2.2 }, highpass: 30 },
  };
}

export function hurtSfx(pitch = 1): SynthSpec {
  return {
    duration: 0.4,
    layers: [
      {
        source: "osc",
        notes: [n(0, 0.32, 420 * pitch, { waveform: "sawtooth", glide: 0.55, glideExp: true })],
        gain: 0.7,
        filter: {
          type: "lowpass",
          freq: 3200,
          freqEnd: 800,
          q: 2.4,
          attack: 0.004,
          decay: 0.26,
        },
        vibrato: { rate: 22, depth: 30 },
      },
      {
        source: "noise",
        color: "pink",
        burst: 0.2,
        amp: env.perc(0.17, 0.003),
        filter: { type: "bandpass", freq: 1500, freqEnd: 700, q: 1.2 },
        gain: 0.3,
      },
    ],
    bus: { drive: 0.22 },
  };
}

export function levelUpJingle(): SynthSpec {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  return {
    duration: 1.3,
    layers: [
      {
        source: "metal",
        notes: notes.map((f, i) => n(i * 0.13, 0.5 + (3 - i) * 0.2, f, { gain: 0.7 })),
        partials: [1, 2.01, 3.03],
        gain: 0.7,
      },
      {
        source: "osc",
        notes: notes.map((f, i) => n(i * 0.13, 0.45, f * 2, { waveform: "square", gain: 0.22 })),
        gain: 0.4,
      },
    ],
    bus: { reverb: { mix: 0.22, size: 0.75, decay: 1.3 } },
  };
}

export function gameOverJingle(): SynthSpec {
  const notes = [392, 349.23, 293.66, 233.08];
  return {
    duration: 1.9,
    layers: [
      {
        source: "osc",
        notes: notes.map((f, i) => n(i * 0.34, 0.6, f, { waveform: "triangle" })),
        gain: 0.6,
        filter: { type: "lowpass", freq: 2600, freqEnd: 700, q: 1 },
      },
      {
        source: "osc",
        notes: [n(1.02, 1.1, 116.54, { waveform: "sine" })],
        gain: 0.5,
      },
    ],
    bus: { reverb: { mix: 0.2, size: 0.8, decay: 1.6 } },
  };
}

// ───────────────────── 10. UI ─────────────────────

export function uiClick(o: { pitch?: number; soft?: boolean } = {}): SynthSpec {
  const f = o.pitch ?? 1400;
  return {
    duration: 0.1,
    layers: [
      {
        source: "noise",
        color: "white",
        burst: 0.008,
        amp: env.perc(0.007, 0.0002),
        filter: { type: "bandpass", freq: f * 2, freqEnd: f, q: 1.6 },
        gain: o.soft ? 0.3 : 0.5,
      },
      {
        source: "osc",
        notes: [n(0, 0.03, f, { waveform: "triangle", glide: 0.6 })],
        gain: 0.3,
      },
    ],
    bus: { highpass: 300 },
  };
}

export function uiPop(o: { pitch?: number } = {}): SynthSpec {
  return {
    duration: 0.14,
    layers: [
      {
        source: "osc",
        notes: [
          n(0, 0.12, o.pitch ?? 420, { waveform: "sine", glide: 3.6, glideExp: true }),
        ],
        gain: 0.7,
      },
      {
        source: "noise",
        color: "white",
        burst: 0.006,
        amp: env.perc(0.005, 0.0002),
        filter: { type: "bandpass", freq: 1800, q: 1.2 },
        gain: 0.14,
      },
    ],
  };
}

export function uiToggle(on = true): SynthSpec {
  return {
    duration: 0.2,
    layers: [
      {
        source: "osc",
        notes: [
          n(0, 0.07, on ? 587.33 : 880, { waveform: "triangle" }),
          n(0.06, 0.13, on ? 880 : 587.33, { waveform: "triangle" }),
        ],
        gain: 0.65,
      },
      {
        source: "noise",
        color: "white",
        burst: 0.004,
        amp: env.perc(0.003, 0.0002),
        filter: { type: "highpass", freq: 3600 },
        gain: 0.1,
      },
    ],
  };
}

export function uiError(): SynthSpec {
  return {
    duration: 0.42,
    layers: [
      {
        source: "osc",
        notes: [
          n(0, 0.16, 233.08, { waveform: "square" }),
          n(0.17, 0.24, 196, { waveform: "square" }),
        ],
        gain: 0.5,
        filter: { type: "lowpass", freq: 1400, q: 1.2 },
      },
      {
        source: "osc",
        notes: [
          n(0, 0.16, 349.23, { waveform: "sine", gain: 0.35 }),
          n(0.17, 0.24, 293.66, { waveform: "sine", gain: 0.3 }),
        ],
        gain: 0.4,
      },
    ],
  };
}

export function uiSuccess(): SynthSpec {
  const notes = [659.25, 830.61, 987.77];
  return {
    duration: 0.7,
    layers: [
      {
        source: "metal",
        notes: notes.map((f, i) => n(i * 0.085, 0.4, f, { gain: 0.65 })),
        partials: [1, 2.02, 3.01],
        gain: 0.6,
      },
      {
        source: "osc",
        notes: notes.map((f, i) => n(i * 0.085, 0.35, f * 2, { waveform: "sine", gain: 0.2 })),
        gain: 0.4,
      },
    ],
    bus: { reverb: { mix: 0.14, size: 0.6, decay: 0.7 } },
  };
}

export function uiNotification(o: { pitch?: number; soft?: boolean } = {}): SynthSpec {
  const base = o.pitch ?? 784;
  return {
    duration: o.soft ? 1.2 : 0.75,
    layers: [
      {
        source: "osc",
        notes: [
          n(0, 0.3, base, { waveform: "sine" }),
          n(0.12, o.soft ? 1.0 : 0.5, base * 1.5, { waveform: "sine", gain: 0.5 }),
        ],
        gain: 0.7,
      },
      {
        source: "osc",
        notes: [n(0, 0.2, base * 2, { waveform: "sine", gain: 0.16 })],
        gain: 0.4,
      },
      {
        source: "noise",
        color: "white",
        burst: 0.006,
        amp: env.perc(0.005, 0.0002),
        filter: { type: "highpass", freq: 4200 },
        gain: 0.09,
      },
    ],
    bus: { reverb: { mix: 0.12, size: 0.65, decay: 0.7 } },
  };
}

export function uiWhooshSmall(): SynthSpec {
  return swoosh({ dur: 0.3, from: 900, to: 4200 });
}

// ───────────────────── 11. 마법 · 환경 ─────────────────────

/** 반짝임 / 마법 스파클 */
export function sparkle(o: { count?: number; dur?: number } = {}): SynthSpec {
  const count = o.count ?? 9;
  const dur = o.dur ?? 1.2;
  const notes: Note[] = [];
  for (let i = 0; i < count; i++) {
    const f = 2200 + R() * 3400;
    notes.push(
      n(i * (dur * 0.7) / count + R() * 0.04, 0.12 + R() * 0.14, f, {
        waveform: "sine",
        glide: 1.4,
        glideExp: true,
        gain: 0.3 + R() * 0.35,
      }),
    );
  }
  return {
    duration: dur,
    layers: [
      {
        source: "osc",
        notes,
        gain: 0.55,
        filter: { type: "highpass", freq: 1600 },
      },
      {
        source: "noise",
        color: "white",
        burst: dur * 0.8,
        amp: { attack: 0.1, decay: dur * 0.3, sustain: 0.2, release: dur * 0.3 },
        filter: { type: "highpass", freq: 6000 },
        gain: 0.1,
      },
    ],
    bus: { reverb: { mix: 0.3, size: 0.8, decay: 1.6 } },
  };
}

/** 군중 함성 / 박수 */
export function crowd(o: { cheer?: boolean; dur?: number } = {}): SynthSpec {
  const dur = o.dur ?? 3;
  const claps = o.cheer ? 54 : 26;
  const layers: Layer[] = [
    {
      source: "noise",
      color: "pink",
      burst: dur * 0.9,
      amp: { attack: dur * 0.2, decay: dur * 0.15, sustain: 0.8, release: dur * 0.25 },
      filter: { type: "bandpass", freq: 1200, freqEnd: 2000, q: 0.4 },
      gain: 0.55,
    },
    {
      source: "noise",
      color: "brown",
      burst: dur * 0.9,
      amp: { attack: dur * 0.25, decay: dur * 0.2, sustain: 0.7, release: dur * 0.25 },
      filter: { type: "lowpass", freq: 500 },
      gain: 0.3,
    },
  ];
  // 박수
  for (let i = 0; i < claps; i++) {
    layers.push({
      source: "noise",
      color: "white",
      at: R() * dur * 0.9,
      burst: 0.012,
      amp: env.perc(0.011, 0.0004),
      filter: { type: "bandpass", freq: 1400 + R() * 2400, q: 1.1 },
      gain: 0.08 + R() * 0.14,
    });
  }
  return {
    duration: dur,
    layers,
    bus: { reverb: { mix: 0.3, size: 0.95, decay: 2.4 }, highpass: 90 },
  };
}

/** 차량 엔진 (아이들) */
export function engineIdle(): SynthSpec {
  return {
    duration: 3,
    layers: [
      {
        source: "osc",
        notes: [n(0, 3, 52, { waveform: "sawtooth" })],
        gain: 0.6,
        filter: {
          type: "lowpass",
          freq: 320,
          freqEnd: 520,
          q: 2.6,
          attack: 0.4,
          decay: 2.4,
        },
        vibrato: { rate: 7.5, depth: 3 },
      },
      {
        source: "osc",
        notes: [n(0, 3, 104, { waveform: "square", gain: 0.25 })],
        gain: 0.3,
      },
      {
        source: "noise",
        color: "brown",
        burst: 3,
        amp: { attack: 0.4, decay: 0.5, sustain: 0.6, release: 0.6 },
        filter: { type: "bandpass", freq: 600, freqEnd: 1100, q: 1 },
        gain: 0.22,
      },
    ],
    bus: { drive: 0.15, lowpass: 3200 },
  };
}

/** 자동차 경보 */
export function carHorn(len = 0.55, high = true): SynthSpec {
  const f = high ? 420 : 340;
  return {
    duration: len * 1.3,
    layers: [
      {
        source: "osc",
        notes: [n(0, len, f, { waveform: "sawtooth" })],
        gain: 0.6,
        filter: { type: "lowpass", freq: 2200, q: 1.6 },
      },
      {
        source: "osc",
        notes: [n(0, len, f * 1.5, { waveform: "sawtooth", gain: 0.4 })],
        gain: 0.5,
      },
      {
        source: "osc",
        notes: [n(0, len, f * 0.5, { waveform: "sine", gain: 0.3 })],
        gain: 0.4,
      },
    ],
    bus: { drive: 0.22, reverb: { mix: 0.16, size: 0.7, decay: 0.9 } },
  };
}

/** 카메라 셔터 */
export function cameraShutter(): SynthSpec {
  return {
    duration: 0.36,
    layers: [
      {
        source: "noise",
        color: "white",
        burst: 0.02,
        amp: env.perc(0.018, 0.0004),
        filter: { type: "bandpass", freq: 3200, freqEnd: 1200, q: 1.4 },
        gain: 0.6,
      },
      {
        source: "osc",
        notes: [
          n(0, 0.04, 1600, { waveform: "square", glide: 0.5 }),
          n(0.13, 0.05, 1100, { waveform: "square", glide: 0.5 }),
        ],
        gain: 0.3,
      },
      {
        source: "noise",
        color: "pink",
        burst: 0.1,
        amp: env.perc(0.09, 0.004),
        filter: { type: "bandpass", freq: 5200, q: 2 },
        gain: 0.2,
      },
    ],
    bus: { highpass: 400 },
  };
}

/** 문 열기 / 닫기 */
export function doorMove(o: { close?: boolean } = {}): SynthSpec {
  const close = o.close ?? false;
  return {
    duration: close ? 0.8 : 1.0,
    layers: [
      {
        source: "noise",
        color: "brown",
        burst: close ? 0.5 : 0.9,
        amp: {
          attack: close ? 0.04 : 0.25,
          decay: close ? 0.2 : 0.4,
          sustain: close ? 0.3 : 0.5,
          release: close ? 0.3 : 0.3,
        },
        filter: {
          type: "bandpass",
          freq: close ? 900 : 400,
          freqEnd: close ? 1800 : 700,
          q: 1.6,
          attack: close ? 0.05 : 0.3,
          decay: close ? 0.4 : 0.55,
        },
        gain: 0.5,
      },
      {
        source: "osc",
        notes: [
          n(0, close ? 0.35 : 0.8, close ? 160 : 90, {
            waveform: "triangle",
            glide: close ? 0.5 : 1.8,
            glideExp: true,
          }),
        ],
        gain: 0.25,
      },
    ],
    bus: { drive: 0.1, reverb: { mix: 0.14, size: 0.7, decay: 0.9 } },
  };
}

/** 현금 · 동전 세기 */
export function cashRegister(): SynthSpec {
  const layers: Layer[] = [];
  for (let i = 0; i < 8; i++) {
    layers.push({
      source: "metal",
      notes: [n(i * 0.045 + R() * 0.02, 0.2 + R() * 0.25, 1800 + R() * 2200, { gain: 0.4 })],
      partials: [1, 2.3, 3.7],
      gain: 0.4,
    });
  }
  layers.push({
    source: "noise",
    color: "white",
    burst: 0.05,
    amp: env.perc(0.045, 0.0006),
    filter: { type: "highpass", freq: 4000 },
    gain: 0.25,
  });
  layers.push({
    source: "osc",
    notes: [n(0.55, 0.3, 880, { waveform: "square" })],
    gain: 0.3,
  });
  return {
    duration: 1.1,
    layers,
    bus: { reverb: { mix: 0.18, size: 0.7, decay: 1.0 } },
  };
}

/** 울림 — 토스트/알림용 화려한 종 */
export function chime(o: { notes?: number[]; dur?: number } = {}): SynthSpec {
  const freqs = o.notes ?? [880, 1174.66, 1567.98];
  const dur = o.dur ?? 1.8;
  return {
    duration: dur,
    layers: [
      {
        source: "metal",
        notes: freqs.map((f, i) => n(i * 0.02, dur, f, { gain: 0.55 })),
        partials: [1, 2.01, 3.02, 4.6],
        partialDecay: [1, 1.4, 2, 3],
        gain: 0.75,
      },
      {
        source: "osc",
        notes: freqs.map((f, i) => n(i * 0.02, dur * 0.8, f * 2, { waveform: "sine", gain: 0.18 })),
        gain: 0.4,
      },
    ],
    bus: { reverb: { mix: 0.26, size: 0.85, decay: 2.0 }, highpass: 250 },
  };
}

/** 공포 · 몬스터 */
export function monsterGrowl(o: { low?: boolean } = {}): SynthSpec {
  const f = o.low ? 62 : 110;
  return {
    duration: 1.6,
    layers: [
      {
        source: "osc",
        notes: [n(0, 1.4, f, { waveform: "sawtooth", glide: 0.7, glideExp: true })],
        gain: 0.7,
        filter: {
          type: "lowpass",
          freq: 900,
          freqEnd: 320,
          q: 3.4,
          attack: 0.3,
          decay: 1.1,
        },
        vibrato: { rate: 11, depth: 9 },
      },
      {
        source: "noise",
        color: "brown",
        burst: 1.4,
        amp: { attack: 0.25, decay: 0.5, sustain: 0.4, release: 0.5 },
        filter: { type: "bandpass", freq: 700, freqEnd: 250, q: 1.4 },
        gain: 0.5,
      },
      {
        source: "noise",
        color: "white",
        burst: 0.3,
        amp: { attack: 0.2, decay: 0.6, sustain: 0.3, release: 0.4 },
        filter: { type: "bandpass", freq: 2200, freqEnd: 800, q: 1 },
        gain: 0.18,
      },
    ],
    bus: { drive: 0.28, reverb: { mix: 0.28, size: 0.9, decay: 2.2 } },
  };
}

/** 공포 점프스케어 */
export function jumpscare(): SynthSpec {
  return {
    duration: 1.3,
    layers: [
      {
        source: "noise",
        color: "white",
        burst: 0.28,
        amp: env.perc(0.24, 0.001),
        filter: { type: "highpass", freq: 1400, freqEnd: 6000, q: 0.8 },
        gain: 0.85,
      },
      {
        source: "osc",
        notes: [n(0, 1.0, 180, { waveform: "sawtooth", glide: 0.35, glideExp: true })],
        gain: 0.6,
        filter: { type: "lowpass", freq: 2600, freqEnd: 300, q: 2 },
        vibrato: { rate: 26, depth: 70 },
      },
      {
        source: "metal",
        notes: [n(0.05, 0.8, 1400)],
        partials: [1, 1.73, 2.9],
        gain: 0.3,
      },
    ],
    bus: { drive: 0.4, reverb: { mix: 0.3, size: 0.9, decay: 1.8 } },
  };
}

/** 저주 / 공포 앰비언스 */
export function dreadDrone(dur = 6): SynthSpec {
  return {
    duration: dur,
    layers: [
      {
        source: "osc",
        notes: [
          n(0, dur, 58, { waveform: "sawtooth" }),
          n(0, dur, 58.6, { waveform: "sawtooth", gain: 0.7 }),
        ],
        gain: 0.6,
        filter: { type: "lowpass", freq: 420, freqEnd: 260, q: 2 },
        vibrato: { rate: 0.3, depth: 5 },
      },
      {
        source: "noise",
        color: "brown",
        burst: dur,
        amp: { attack: dur * 0.25, decay: dur * 0.2, sustain: 0.7, release: dur * 0.3 },
        filter: { type: "bandpass", freq: 220, q: 1.2 },
        gain: 0.3,
      },
    ],
    bus: { reverb: { mix: 0.3, size: 0.95, decay: 3.0 }, highpass: 30 },
  };
}

/** 낮게 울리는 럼블 */
export function rumble(dur = 3): SynthSpec {
  return {
    duration: dur,
    layers: [
      {
        source: "noise",
        color: "brown",
        burst: dur * 0.9,
        amp: { attack: dur * 0.2, decay: dur * 0.2, sustain: 0.75, release: dur * 0.3 },
        filter: { type: "lowpass", freq: 220, freqEnd: 90, q: 0.9 },
        gain: 0.95,
      },
      {
        source: "osc",
        notes: [n(0, dur * 0.95, 38, { waveform: "sine" })],
        gain: 0.7,
      },
    ],
    bus: { highpass: 24, drive: 0.2, reverb: { mix: 0.2, size: 0.9, decay: 2.2 } },
  };
}

/** 심장 박동 */
export function heartbeat(): SynthSpec {
  const beat = (at: number, gain: number): Layer[] => [
    {
      source: "osc",
      notes: [n(at, 0.2, 62, { waveform: "sine", glide: 0.6, glideExp: true })],
      gain,
    },
    {
      source: "noise",
      color: "brown",
      burst: 0.06,
      amp: env.perc(0.05, 0.002),
      filter: { type: "lowpass", freq: 260, freqEnd: 90 },
      gain: gain * 0.5,
    },
  ];
  return {
    duration: 1.3,
    layers: [...beat(0, 1), ...beat(0.32, 0.7)],
    bus: { drive: 0.12 },
  };
}

/** 보이스 / 화자 — 사람 말하는 느낌 (읽을 수는 없음) */
export function voiceBlip(o: { pitch?: number; len?: number } = {}): SynthSpec {
  const dur = o.len ?? 0.13;
  const f = o.pitch ?? 180;
  return {
    duration: dur,
    layers: [
      {
        source: "osc",
        notes: [n(0, dur * 0.85, f, { waveform: "sawtooth", glide: 1.18, glideExp: true })],
        gain: 0.6,
        filter: {
          type: "bandpass",
          freq: 900,
          freqEnd: 1800,
          q: 3.2,
          attack: 0.012,
          decay: dur * 0.7,
        },
        vibrato: { rate: 14, depth: 12 },
      },
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.85,
        amp: { attack: 0.012, decay: dur * 0.4, sustain: 0.3, release: dur * 0.3 },
        filter: { type: "bandpass", freq: 1600, freqEnd: 2600, q: 1.6 },
        gain: 0.25,
      },
    ],
    bus: { drive: 0.08, highpass: 110 },
  };
}

/** 휘파람 */
export function whistle(o: { len?: number; high?: boolean } = {}): SynthSpec {
  const dur = o.len ?? 0.9;
  const f = o.high ? 1900 : 1250;
  return {
    duration: dur * 1.1,
    layers: [
      {
        source: "osc",
        notes: [n(0, dur, f, { waveform: "sine", glide: 1.22, glideExp: true })],
        gain: 0.6,
        vibrato: { rate: 5.5, depth: 55 },
        filter: { type: "bandpass", freq: f * 1.6, q: 2.2 },
      },
      {
        source: "noise",
        color: "white",
        burst: dur * 0.9,
        amp: { attack: dur * 0.15, decay: dur * 0.3, sustain: 0.4, release: dur * 0.3 },
        filter: { type: "bandpass", freq: f * 3, q: 3 },
        gain: 0.22,
      },
    ],
    bus: { reverb: { mix: 0.16, size: 0.7, decay: 0.9 } },
  };
}

/** 종 — 거대한 템플 / 알람 종 */
export function bell(o: { freq?: number; dur?: number } = {}): SynthSpec {
  const f = o.freq ?? 180;
  const dur = o.dur ?? 4;
  return {
    duration: dur,
    layers: [
      {
        source: "metal",
        notes: [n(0, dur, f)],
        partials: [1, 2.0, 2.98, 4.07, 5.41, 6.79, 8.21],
        partialDecay: [1, 1.25, 1.6, 2.1, 2.7, 3.4, 4.2],
        gain: 0.85,
      },
      {
        source: "noise",
        color: "white",
        burst: 0.03,
        amp: env.perc(0.028, 0.0006),
        filter: { type: "bandpass", freq: 3200, freqEnd: 900, q: 1.2 },
        gain: 0.2,
      },
    ],
    bus: { reverb: { mix: 0.38, size: 0.95, decay: 3.2 }, highpass: 60 },
  };
}

/** 타이핑 */
export function typeKey(o: { soft?: boolean } = {}): SynthSpec {
  const f = 2600 + R() * 900;
  return {
    duration: 0.07,
    layers: [
      {
        source: "noise",
        color: "white",
        burst: 0.012,
        amp: env.perc(0.011, 0.0003),
        filter: { type: "bandpass", freq: f, freqEnd: f * 0.55, q: 1.3 },
        gain: o.soft ? 0.22 : 0.4,
      },
      {
        source: "osc",
        notes: [n(0, 0.02, f * 0.35, { waveform: "triangle", glide: 0.5 })],
        gain: 0.12,
      },
    ],
    bus: { highpass: 400 },
  };
}

/** 깊게 숨 들이쉬기 */
export function breath(o: { inOut?: boolean } = {}): SynthSpec {
  const inOut = o.inOut ?? true;
  return {
    duration: inOut ? 2.4 : 1.2,
    layers: [
      {
        source: "noise",
        color: "pink",
        burst: inOut ? 2.2 : 1.1,
        amp: {
          attack: inOut ? 0.5 : 0.4,
          decay: 0.4,
          sustain: inOut ? 0.4 : 0.5,
          release: inOut ? 0.6 : 0.3,
        },
        filter: {
          type: "bandpass",
          freq: 700,
          freqEnd: 1500,
          q: 1.1,
          attack: inOut ? 0.5 : 0.4,
          decay: 1.4,
        },
        gain: 0.6,
      },
      {
        source: "noise",
        color: "brown",
        burst: inOut ? 2.2 : 1.1,
        amp: {
          attack: inOut ? 0.45 : 0.35,
          decay: 0.4,
          sustain: 0.4,
          release: 0.6,
        },
        filter: { type: "lowpass", freq: 400 },
        gain: 0.3,
      },
    ],
    bus: { highpass: 120 },
  };
}

// ═══════════════════════ 추가 프리셋 ═══════════════════════

/** 전화 벨소리 */
export function phoneRing(): SynthSpec {
  const ring = (at: number): Layer[] => [
    {
      source: "osc",
      at,
      notes: [n(0, 0.028, 1046, { waveform: "sine" }), n(0.028, 0.028, 1318, { waveform: "sine" })],
      gain: 0.7,
    },
    {
      source: "osc",
      at,
      notes: [n(0, 0.056, 2093, { waveform: "sine", gain: 0.12 })],
      gain: 0.35,
    },
  ];
  const dur = 1.6;
  return {
    duration: dur,
    layers: [...ring(0), ...ring(0.09), ...ring(0.42), ...ring(0.51), ...ring(0.84), ...ring(0.93)],
    bus: { reverb: { mix: 0.12, size: 0.65, decay: 0.6 }, highpass: 300 },
  };
}

/** 메시지 발송 / 수신 */
export function messageBlip(kind: "send" | "receive" = "send"): SynthSpec {
  const notes =
    kind === "send"
      ? [n(0, 0.09, 880, { waveform: "sine" }), n(0.09, 0.16, 1318, { waveform: "sine" })]
      : [n(0, 0.1, 1568, { waveform: "sine", glide: 1.18, glideExp: true })];
  return {
    duration: 0.5,
    layers: [
      {
        source: "osc",
        notes,
        gain: 0.65,
        filter: { type: "lowpass", freq: 5200, q: 0.8 },
      },
      {
        source: "noise",
        color: "white",
        burst: 0.004,
        amp: env.perc(0.003, 0.0002),
        filter: { type: "highpass", freq: 4000 },
        gain: 0.08,
      },
    ],
    bus: { reverb: { mix: 0.1, size: 0.6, decay: 0.5 } },
  };
}

/** 불꽃놀이 */
export function firework(): SynthSpec {
  const layers: Layer[] = [
    {
      source: "noise",
      color: "pink",
      burst: 0.5,
      amp: { attack: 0.05, decay: 0.15, sustain: 0.4, release: 0.3 },
      filter: { type: "highpass", freq: 900, freqEnd: 2600, q: 0.6 },
      gain: 0.3,
    },
    {
      source: "osc",
      notes: [n(0, 0.45, 240, { waveform: "sawtooth", glide: 2.2, glideExp: true })],
      gain: 0.22,
      filter: { type: "bandpass", freq: 800, freqEnd: 2200, q: 2 },
    },
  ];
  // 팽 터지는 크래클
  for (let i = 0; i < 40; i++) {
    const life = 0.006 + R() * 0.03;
    layers.push({
      source: "noise",
      color: "white",
      at: 0.42 + R() * 0.9,
      burst: life,
      amp: env.perc(life, 0.0002),
      filter: { type: "bandpass", freq: 1800 + R() * 5000, q: 1.6 },
      gain: 0.05 + R() * 0.1,
    });
  }
  return {
    duration: 1.9,
    layers,
    bus: { reverb: { mix: 0.24, size: 0.9, decay: 1.8 }, highpass: 120 },
  };
}

/** 알람 시계 */
export function alarmClock(): SynthSpec {
  const ring = (at: number): Layer => ({
    source: "metal",
    at,
    notes: [n(0, 0.09, 2100), n(0.09, 0.09, 1600)],
    partials: [1, 2.4, 3.9],
    gain: 0.6,
  });
  return {
    duration: 1.8,
    layers: [ring(0), ring(0.3), ring(0.6), ring(0.9)],
    bus: { reverb: { mix: 0.18, size: 0.7, decay: 0.9 }, highpass: 400 },
  };
}

/** 카운트다운 틱 */
export function countdownTick(high = false): SynthSpec {
  return {
    duration: 0.18,
    layers: [
      {
        source: "osc",
        notes: [n(0, 0.07, high ? 1600 : 900, { waveform: "square" })],
        gain: 0.5,
        filter: { type: "lowpass", freq: 5000, q: 1 },
      },
      {
        source: "noise",
        color: "white",
        burst: 0.005,
        amp: env.perc(0.004, 0.0002),
        filter: { type: "bandpass", freq: 3000, q: 1.4 },
        gain: 0.15,
      },
    ],
    bus: { highpass: 400 },
  };
}

/** 공간이 점점 커지는 라이저 */
export function riser(dur = 3): SynthSpec {
  return {
    duration: dur,
    layers: [
      {
        source: "noise",
        color: "pink",
        burst: dur,
        amp: { attack: dur * 0.75, decay: 0.2, sustain: 0.95, release: dur * 0.15 },
        filter: {
          type: "bandpass",
          freq: 300,
          freqEnd: 7000,
          q: 1.4,
          attack: dur * 0.8,
          decay: dur * 0.95,
        },
        gain: 0.6,
      },
      {
        source: "osc",
        notes: [n(0, dur * 0.98, 90, { waveform: "sawtooth", glide: 7, glideExp: true })],
        gain: 0.4,
        filter: { type: "lowpass", freq: 600, freqEnd: 6000, q: 2 },
      },
    ],
    bus: { reverb: { mix: 0.22, size: 0.9, decay: 2.2 }, drive: 0.16 },
  };
}

/** 베이스 드롭 (EDM 풍) */
export function bassDrop(dur = 1.6): SynthSpec {
  return {
    duration: dur,
    layers: [
      {
        source: "osc",
        notes: [n(0, dur * 0.9, 55, { waveform: "sine", glide: 0.72, glideExp: true })],
        gain: 1,
      },
      {
        source: "osc",
        notes: [n(0, dur * 0.9, 110, { waveform: "square", glide: 0.75, glideExp: true })],
        gain: 0.35,
        filter: {
          type: "lowpass",
          freq: 2400,
          freqEnd: 200,
          q: 3,
          attack: 0.004,
          decay: dur * 0.6,
        },
      },
      {
        source: "noise",
        color: "white",
        burst: 0.1,
        amp: env.perc(0.09, 0.0004),
        filter: { type: "lowpass", freq: 8000, freqEnd: 900, q: 0.8 },
        gain: 0.3,
      },
    ],
    bus: { drive: 0.3, highpass: 26 },
  };
}

/** 검 휘두르기 */
export function swordSwing(): SynthSpec {
  return {
    duration: 0.5,
    layers: [
      {
        source: "noise",
        color: "pink",
        burst: 0.42,
        amp: { attack: 0.08, decay: 0.12, sustain: 0.5, release: 0.2 },
        filter: {
          type: "bandpass",
          freq: 700,
          freqEnd: 4200,
          q: 2.2,
          attack: 0.1,
          decay: 0.3,
        },
        gain: 0.7,
      },
      {
        source: "noise",
        color: "white",
        burst: 0.1,
        amp: env.perc(0.09, 0.004),
        filter: { type: "highpass", freq: 5200, q: 1.2 },
        gain: 0.18,
      },
    ],
    bus: { highpass: 300 },
  };
}

/** 화살 스치는 소리 */
export function arrowWhoosh(): SynthSpec {
  return swoosh({ dur: 0.38, from: 1400, to: 5600 });
}

/** 포물선 안 당기기 */
export function bowDraw(dur = 0.7): SynthSpec {
  return {
    duration: dur,
    layers: [
      {
        source: "osc",
        notes: [n(0, dur * 0.9, 160, { waveform: "sawtooth", glide: 1.9, glideExp: true })],
        gain: 0.3,
        filter: {
          type: "bandpass",
          freq: 600,
          freqEnd: 1800,
          q: 5,
          attack: dur * 0.7,
          decay: dur * 0.9,
        },
      },
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.9,
        amp: { attack: dur * 0.6, decay: 0.1, sustain: 0.6, release: dur * 0.2 },
        filter: { type: "bandpass", freq: 1400, q: 3.4 },
        gain: 0.28,
      },
    ],
  };
}

/** 마법 주문 시전 */
export function spellCast(dur = 1.3): SynthSpec {
  const notes: Note[] = [];
  const steps = 12;
  for (let i = 0; i < steps; i++) {
    notes.push(
      n(i * (dur * 0.7) / steps, 0.16, 300 * Math.pow(2, (i % 6) / 4 + R() * 0.4), {
        waveform: "sine",
        glide: 1.5,
        glideExp: true,
        gain: 0.3 + R() * 0.3,
      }),
    );
  }
  return {
    duration: dur,
    layers: [
      { source: "osc", notes, gain: 0.6, filter: { type: "bandpass", freq: 1600, q: 1.6 } },
      {
        source: "noise",
        color: "white",
        burst: dur * 0.85,
        amp: { attack: dur * 0.5, decay: dur * 0.2, sustain: 0.4, release: dur * 0.2 },
        filter: { type: "bandpass", freq: 2600, freqEnd: 5200, q: 1.4 },
        gain: 0.25,
      },
      {
        source: "osc",
        notes: [n(0, dur * 0.8, 60, { waveform: "triangle", glide: 3, glideExp: true })],
        gain: 0.35,
      },
    ],
    bus: { reverb: { mix: 0.3, size: 0.85, decay: 2.0 } },
  };
}

/** 마법 지팡이 */
export function magicWand(): SynthSpec {
  return {
    duration: 0.8,
    layers: [
      {
        source: "osc",
        notes: [n(0, 0.6, 1400, { waveform: "sine", glide: 2.6, glideExp: true })],
        gain: 0.5,
        vibrato: { rate: 22, depth: 120 },
      },
      ...sparkle({ count: 7, dur: 0.75 }).layers.map((l) => ({ ...l, gain: (l.gain ?? 1) * 0.5 })),
    ],
    bus: { reverb: { mix: 0.3, size: 0.85, decay: 1.8 } },
  };
}

/** 포털 열림 */
export function portalOpen(dur = 2.2): SynthSpec {
  return {
    duration: dur,
    layers: [
      {
        source: "osc",
        notes: [n(0, dur * 0.9, 70, { waveform: "sawtooth", glide: 5.5, glideExp: true })],
        gain: 0.55,
        filter: {
          type: "lowpass",
          freq: 300,
          freqEnd: 3400,
          q: 2.4,
          attack: dur * 0.5,
          decay: dur * 0.9,
        },
      },
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.9,
        amp: { attack: dur * 0.45, decay: dur * 0.15, sustain: 0.6, release: dur * 0.3 },
        filter: { type: "bandpass", freq: 500, freqEnd: 4200, q: 1.6, attack: dur * 0.5, decay: dur * 0.9 },
        gain: 0.45,
      },
      {
        source: "metal",
        notes: [n(0, dur, 220)],
        partials: [1, 1.5, 2.2, 3.1],
        gain: 0.25,
      },
    ],
    bus: { reverb: { mix: 0.38, size: 0.95, decay: 3.2 }, drive: 0.12 },
  };
}

/** 순간이동 */
export function teleport(): SynthSpec {
  return {
    duration: 0.9,
    layers: [
      {
        source: "osc",
        notes: [
          n(0, 0.35, 180, { waveform: "sine", glide: 9, glideExp: true }),
          n(0.4, 0.3, 2400, { waveform: "sine", glide: 0.1, glideExp: true }),
        ],
        gain: 0.6,
        vibrato: { rate: 30, depth: 300 },
      },
      {
        source: "noise",
        color: "white",
        burst: 0.4,
        amp: env.perc(0.32, 0.004),
        filter: { type: "bandpass", freq: 600, freqEnd: 6800, q: 2.4, attack: 0.01, decay: 0.35 },
        gain: 0.4,
      },
    ],
    bus: { reverb: { mix: 0.3, size: 0.85, decay: 1.6 }, drive: 0.12 },
  };
}

/** 로봇 경고음 */
export function robotBeep(high = false): SynthSpec {
  const f = high ? 1400 : 780;
  return {
    duration: 0.26,
    layers: [
      {
        source: "osc",
        notes: [n(0, 0.16, f, { waveform: "pulse", width: 0.24 })],
        gain: 0.55,
        filter: { type: "bandpass", freq: f * 1.4, q: 2.6 },
      },
      {
        source: "osc",
        notes: [n(0, 0.16, f * 0.5, { waveform: "square", gain: 0.2 })],
        gain: 0.35,
      },
    ],
    bus: { highpass: 300, drive: 0.1 },
  };
}

/** 컴퓨터 오류 */
export function computerError(): SynthSpec {
  const notes = [n(0, 0.1, 320, { waveform: "square" }), n(0.11, 0.1, 240, { waveform: "square" })];
  return {
    duration: 0.5,
    layers: [
      { source: "osc", notes, gain: 0.5, filter: { type: "lowpass", freq: 1800, q: 1.4 } },
      {
        source: "noise",
        color: "white",
        burst: 0.2,
        amp: env.perc(0.18, 0.004),
        filter: { type: "bandpass", freq: 2200, freqEnd: 900, q: 1.2 },
        gain: 0.22,
      },
    ],
    bus: { drive: 0.12, highpass: 160 },
  };
}

/** 컴퓨터 부팅 */
export function computerBoot(): SynthSpec {
  return {
    duration: 1.6,
    layers: [
      { source: "osc", notes: [n(0, 0.6, 180, { waveform: "square", glide: 4, glideExp: true })], gain: 0.4 },
      { source: "osc", notes: [n(0.7, 0.8, 900, { waveform: "sine" })], gain: 0.4 },
      {
        source: "noise",
        color: "pink",
        burst: 0.6,
        amp: env.perc(0.5, 0.01),
        filter: { type: "bandpass", freq: 600, freqEnd: 3200, q: 1.2 },
        gain: 0.2,
      },
    ],
    bus: { reverb: { mix: 0.14, size: 0.7, decay: 0.9 } },
  };
}

/** 프린터 */
export function printer(): SynthSpec {
  const layers: Layer[] = [
    {
      source: "noise",
      color: "pink",
      burst: 1.2,
      amp: { attack: 0.06, decay: 0.2, sustain: 0.7, release: 0.3 },
      filter: { type: "bandpass", freq: 1800, freqEnd: 2600, q: 1.2 },
      gain: 0.45,
    },
    {
      source: "osc",
      notes: [n(0, 1.1, 72, { waveform: "sawtooth" })],
      gain: 0.2,
      filter: { type: "lowpass", freq: 500 },
    },
  ];
  // 헤드 이동 잡음
  for (let i = 0; i < 16; i++) {
    layers.push({
      source: "noise",
      at: i * 0.072 + R() * 0.01,
      burst: 0.01,
      amp: env.perc(0.009, 0.0004),
      filter: { type: "bandpass", freq: 3200, q: 1.6 },
      gain: 0.1,
    });
  }
  return { duration: 1.5, layers, bus: { highpass: 150 } };
}

/** 지퍼 */
export function zipper(): SynthSpec {
  const layers: Layer[] = [
    {
      source: "noise",
      color: "pink",
      burst: 0.55,
      amp: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.08 },
      filter: { type: "bandpass", freq: 2800, freqEnd: 4200, q: 1.6 },
      gain: 0.5,
    },
  ];
  for (let i = 0; i < 26; i++) {
    layers.push({
      source: "noise",
      at: i * 0.02,
      burst: 0.004,
      amp: env.perc(0.003, 0.0002),
      filter: { type: "bandpass", freq: 3000 + R() * 2600, q: 2 },
      gain: 0.12,
    });
  }
  return { duration: 0.6, layers, bus: { highpass: 700 } };
}

/** 스위치 / 릴레이 플립 */
export function switchFlip(): SynthSpec {
  return {
    duration: 0.18,
    layers: [
      {
        source: "noise",
        color: "white",
        burst: 0.01,
        amp: env.perc(0.009, 0.0002),
        filter: { type: "bandpass", freq: 2200, freqEnd: 800, q: 1.4 },
        gain: 0.6,
      },
      {
        source: "metal",
        notes: [n(0, 0.06, 1800)],
        partials: [1, 2.6, 4.2],
        gain: 0.25,
      },
    ],
    bus: { highpass: 300 },
  };
}

/** 마우스 클릭 */
export function mouseClick(): SynthSpec {
  return {
    duration: 0.07,
    layers: [
      {
        source: "noise",
        color: "white",
        burst: 0.006,
        amp: env.perc(0.005, 0.0002),
        filter: { type: "bandpass", freq: 3600, freqEnd: 1600, q: 1.5 },
        gain: 0.5,
      },
      {
        source: "osc",
        notes: [n(0, 0.018, 900, { waveform: "triangle", glide: 0.55 })],
        gain: 0.2,
      },
    ],
    bus: { highpass: 600 },
  };
}

/** 키 입력 */
export function typeKeyStroke(): SynthSpec {
  const f = 2800 + R() * 1200;
  return {
    duration: 0.09,
    layers: [
      {
        source: "noise",
        color: "white",
        burst: 0.014,
        amp: env.perc(0.012, 0.0004),
        filter: { type: "bandpass", freq: f, freqEnd: f * 0.45, q: 1.2 },
        gain: 0.42,
      },
      {
        source: "osc",
        notes: [n(0, 0.025, f * 0.3, { waveform: "triangle", glide: 0.5 })],
        gain: 0.14,
      },
    ],
    bus: { highpass: 500 },
  };
}

/** 스크롤 */
export function scroll(): SynthSpec {
  return {
    duration: 0.45,
    layers: [
      {
        source: "noise",
        color: "pink",
        burst: 0.4,
        amp: { attack: 0.05, decay: 0.1, sustain: 0.6, release: 0.1 },
        filter: { type: "bandpass", freq: 1400, freqEnd: 2800, q: 0.9 },
        gain: 0.4,
      },
      {
        source: "osc",
        notes: [n(0, 0.35, 120, { waveform: "triangle", glide: 1.3 })],
        gain: 0.12,
      },
    ],
    bus: { highpass: 350 },
  };
}

/** 볶음 / 지글거리는 소리 */
export function sizzle(intensity = 1): SynthSpec {
  const dur = 4;
  const layers: Layer[] = [
    {
      source: "noise",
      color: "white",
      burst: dur,
      amp: { attack: dur * 0.15, decay: dur * 0.15, sustain: 0.85, release: dur * 0.2 },
      filter: { type: "highpass", freq: 3200 },
      gain: 0.28 * intensity,
    },
    {
      source: "noise",
      color: "pink",
      burst: dur,
      amp: { attack: dur * 0.2, decay: dur * 0.2, sustain: 0.75, release: dur * 0.2 },
      filter: { type: "bandpass", freq: 1800, freqEnd: 3200, q: 0.7 },
      gain: 0.3 * intensity,
    },
  ];
  for (let i = 0; i < 60 * intensity; i++) {
    const life = 0.003 + R() * 0.01;
    layers.push({
      source: "noise",
      color: "white",
      at: R() * dur * 0.95,
      burst: life,
      amp: env.perc(life, 0.0002),
      filter: { type: "highpass", freq: 4000 + R() * 5000 },
      gain: 0.04 + R() * 0.07,
    });
  }
  return { duration: dur, layers, bus: { highpass: 500 } };
}

/** 액체를 따르는 소리 */
export function pourLiquid(dur = 2): SynthSpec {
  return {
    duration: dur,
    layers: [
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.92,
        amp: { attack: dur * 0.18, decay: dur * 0.15, sustain: 0.85, release: dur * 0.25 },
        filter: {
          type: "bandpass",
          freq: 900,
          freqEnd: 2000,
          q: 1.4,
          attack: dur * 0.2,
          decay: dur * 0.7,
        },
        gain: 0.5,
      },
      {
        source: "noise",
        color: "brown",
        burst: dur * 0.92,
        amp: { attack: dur * 0.2, decay: dur * 0.2, sustain: 0.7, release: dur * 0.25 },
        filter: { type: "lowpass", freq: 600 },
        gain: 0.3,
      },
    ],
    bus: { highpass: 160 },
  };
}

/** 거품 */
export function bubbles(count = 6): SynthSpec {
  const notes: Note[] = [];
  for (let i = 0; i < count; i++) {
    notes.push(
      n(i * 0.14 + R() * 0.08, 0.07 + R() * 0.05, 500 + R() * 700, {
        waveform: "sine",
        glide: 2.6,
        glideExp: true,
        gain: 0.3 + R() * 0.3,
      }),
    );
  }
  return {
    duration: count * 0.14 + 0.4,
    layers: [{ source: "osc", notes, gain: 0.55, filter: { type: "bandpass", freq: 2200, q: 2 } }],
    bus: { reverb: { mix: 0.16, size: 0.7, decay: 0.8 } },
  };
}

/** 동전 떨어지는 소리 */
export function coinDrop(count = 3): SynthSpec {
  const layers: Layer[] = [];
  for (let i = 0; i < count; i++) {
    layers.push({
      source: "metal",
      at: i * (0.16 + R() * 0.07),
      notes: [n(0, 0.35, 2400 + R() * 900, { gain: 0.55 })],
      partials: [1, 2.43, 3.91, 5.2],
      partialDecay: [1, 1.3, 1.9, 2.8],
      gain: 0.45,
    });
  }
  return {
    duration: count * 0.23 + 0.6,
    layers,
    bus: { reverb: { mix: 0.2, size: 0.75, decay: 1.0 }, highpass: 500 },
  };
}

/** 주사위 굴리기 */
export function diceRoll(): SynthSpec {
  const layers: Layer[] = [
    {
      source: "noise",
      color: "pink",
      burst: 0.8,
      amp: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.4 },
      filter: { type: "bandpass", freq: 900, freqEnd: 2200, q: 1 },
      gain: 0.4,
    },
  ];
  for (let i = 0; i < 14; i++) {
    layers.push({
      source: "noise",
      at: i * 0.045 + R() * 0.03,
      burst: 0.012,
      amp: env.perc(0.011, 0.0004),
      filter: { type: "bandpass", freq: 1600 + R() * 2600, q: 1.8 },
      gain: 0.1 + R() * 0.14,
    });
  }
  return { duration: 1.1, layers, bus: { reverb: { mix: 0.16, size: 0.7, decay: 0.9 } } };
}

/** 현금 뭉치 떨어짐 */
export function cashDrop(): SynthSpec {
  return cashRegister();
}

/** 기차 지나감 */
export function trainPass(dur = 4): SynthSpec {
  return {
    duration: dur,
    layers: [
      {
        source: "noise",
        color: "brown",
        burst: dur * 0.92,
        amp: { attack: dur * 0.32, decay: dur * 0.12, sustain: 0.9, release: dur * 0.3 },
        filter: {
          type: "lowpass",
          freq: 260,
          freqEnd: 900,
          q: 0.9,
          attack: dur * 0.35,
          decay: dur * 0.6,
        },
        gain: 0.9,
      },
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.92,
        amp: { attack: dur * 0.34, decay: dur * 0.12, sustain: 0.85, release: dur * 0.28 },
        filter: { type: "bandpass", freq: 1400, freqEnd: 2600, q: 0.8 },
        gain: 0.5,
      },
      {
        source: "osc",
        notes: [n(dur * 0.3, dur * 0.45, 42, { waveform: "sine" })],
        gain: 0.6,
      },
    ],
    bus: { highpass: 30, lowpass: 6000 },
  };
}

/** 비행기 */
export function airplane(): SynthSpec {
  const dur = 5;
  return {
    duration: dur,
    layers: [
      {
        source: "noise",
        color: "brown",
        burst: dur * 0.92,
        amp: { attack: dur * 0.3, decay: dur * 0.15, sustain: 0.85, release: dur * 0.3 },
        filter: { type: "lowpass", freq: 400, q: 0.8 },
        gain: 0.85,
      },
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.92,
        amp: { attack: dur * 0.3, decay: dur * 0.15, sustain: 0.8, release: dur * 0.3 },
        filter: { type: "bandpass", freq: 900, freqEnd: 1600, q: 0.7 },
        gain: 0.4,
      },
      {
        source: "osc",
        notes: [n(0, dur * 0.92, 78, { waveform: "sine" })],
        gain: 0.4,
        vibrato: { rate: 9, depth: 4 },
      },
    ],
    bus: { highpass: 35, lowpass: 5000 },
  };
}

/** 오토바이 */
export function motorcycle(): SynthSpec {
  const dur = 2.4;
  return {
    duration: dur,
    layers: [
      {
        source: "osc",
        notes: [n(0, dur * 0.92, 84, { waveform: "sawtooth", glide: 1.35, glideExp: true })],
        gain: 0.6,
        filter: {
          type: "lowpass",
          freq: 500,
          freqEnd: 2000,
          q: 2.4,
          attack: dur * 0.2,
          decay: dur * 0.7,
        },
        vibrato: { rate: 22, depth: 9 },
      },
      {
        source: "noise",
        color: "brown",
        burst: dur * 0.92,
        amp: { attack: dur * 0.2, decay: dur * 0.2, sustain: 0.8, release: dur * 0.3 },
        filter: { type: "bandpass", freq: 700, freqEnd: 1400, q: 1 },
        gain: 0.4,
      },
    ],
    bus: { drive: 0.22, highpass: 45 },
  };
}

/** 짖는 새 소리 */
export function birdCall(): SynthSpec {
  return {
    duration: 1.0,
    layers: [
      {
        source: "osc",
        notes: [
          n(0, 0.1, 3200, { waveform: "sine", glide: 1.5, glideExp: true }),
          n(0.13, 0.08, 2600, { waveform: "sine", glide: 1.35, glideExp: true }),
          n(0.24, 0.16, 3400, { waveform: "sine", glide: 0.8, glideExp: true }),
        ],
        gain: 0.6,
        vibrato: { rate: 34, depth: 200 },
      },
      ...chirp({ base: 3000, count: 2 }).layers.map((l) => ({ ...l, gain: (l.gain ?? 1) * 0.4 })),
    ],
    bus: { reverb: { mix: 0.2, size: 0.8, decay: 1.2 }, highpass: 900 },
  };
}

/** 매미 */
export function cicada(dur = 4): SynthSpec {
  const layers: Layer[] = [
    {
      source: "osc",
      notes: [n(0, dur * 0.94, 4200, { waveform: "sawtooth" })],
      gain: 0.32,
      filter: { type: "bandpass", freq: 5200, q: 4.4 },
      vibrato: { rate: 26, depth: 260 },
    },
    {
      source: "noise",
      color: "pink",
      burst: dur * 0.92,
      amp: { attack: dur * 0.18, decay: dur * 0.15, sustain: 0.85, release: dur * 0.25 },
      filter: { type: "bandpass", freq: 6000, q: 2.2 },
      gain: 0.22,
    },
  ];
  return { duration: dur, layers, bus: { reverb: { mix: 0.16, size: 0.8, decay: 1.4 } } };
}

/** 개 헛깜질 */
export function dogPanting(): SynthSpec {
  const layers: Layer[] = [];
  for (let i = 0; i < 5; i++) {
    layers.push({
      source: "noise",
      at: i * 0.17,
      burst: 0.1,
      amp: env.perc(0.09, 0.008),
      filter: { type: "bandpass", freq: 1100, freqEnd: 1900, q: 1.1 },
      gain: 0.3,
    });
  }
  return { duration: 1.0, layers, bus: { highpass: 260 } };
}

/** 늑대 울음 */
export function wolfHowl(dur = 2.6): SynthSpec {
  return {
    duration: dur,
    layers: [
      {
        source: "osc",
        notes: [n(0, dur * 0.85, 320, { waveform: "sawtooth", glide: 1.55, glideExp: true })],
        gain: 0.65,
        filter: {
          type: "bandpass",
          freq: 900,
          freqEnd: 1700,
          q: 2.4,
          attack: dur * 0.25,
          decay: dur * 0.7,
        },
        vibrato: { rate: 5.5, depth: 22 },
      },
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.85,
        amp: { attack: dur * 0.2, decay: dur * 0.2, sustain: 0.6, release: dur * 0.25 },
        filter: { type: "bandpass", freq: 1400, q: 1.6 },
        gain: 0.22,
      },
    ],
    bus: { drive: 0.14, reverb: { mix: 0.26, size: 0.9, decay: 2.4 } },
  };
}

/** 사자 으렁 */
export function lionRoar(): SynthSpec {
  const dur = 2.2;
  return {
    duration: dur,
    layers: [
      {
        source: "osc",
        notes: [n(0, dur * 0.85, 92, { waveform: "sawtooth", glide: 0.7, glideExp: true })],
        gain: 0.8,
        filter: {
          type: "lowpass",
          freq: 1400,
          freqEnd: 480,
          q: 2.8,
          attack: 0.12,
          decay: dur * 0.7,
        },
        vibrato: { rate: 17, depth: 18 },
      },
      {
        source: "noise",
        color: "brown",
        burst: dur * 0.85,
        amp: { attack: 0.1, decay: dur * 0.4, sustain: 0.4, release: dur * 0.3 },
        filter: { type: "bandpass", freq: 800, freqEnd: 300, q: 1.4 },
        gain: 0.6,
      },
      {
        source: "noise",
        color: "white",
        burst: dur * 0.6,
        amp: { attack: 0.15, decay: dur * 0.5, sustain: 0.3, release: dur * 0.3 },
        filter: { type: "bandpass", freq: 2200, q: 1 },
        gain: 0.2,
      },
    ],
    bus: { drive: 0.3, reverb: { mix: 0.22, size: 0.85, decay: 2 } },
  };
}

/** 말이 달리는 소리 */
export function horseGallop(count = 6): SynthSpec {
  const layers: Layer[] = [];
  for (let i = 0; i < count; i++) {
    const at = i * 0.34;
    layers.push({
      source: "osc",
      at,
      notes: [n(0, 0.16, 130 + R() * 30, { waveform: "triangle", glide: 0.6, glideExp: true })],
      gain: 0.6,
    });
    layers.push({
      source: "noise",
      at,
      burst: 0.1,
      amp: env.perc(0.08, 0.002),
      filter: { type: "bandpass", freq: 2200, freqEnd: 800, q: 0.9 },
      gain: 0.3,
    });
  }
  return { duration: count * 0.34 + 0.4, layers, bus: { drive: 0.1 } };
}

/** 소 울음 */
export function cowMoo(): SynthSpec {
  const dur = 1.5;
  return {
    duration: dur,
    layers: [
      {
        source: "osc",
        notes: [n(0, dur * 0.8, 190, { waveform: "sawtooth", glide: 0.62, glideExp: true })],
        gain: 0.7,
        filter: {
          type: "bandpass",
          freq: 800,
          freqEnd: 460,
          q: 2.2,
          attack: 0.2,
          decay: dur * 0.7,
        },
        vibrato: { rate: 13, depth: 14 },
      },
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.8,
        amp: { attack: 0.18, decay: dur * 0.3, sustain: 0.5, release: dur * 0.3 },
        filter: { type: "bandpass", freq: 1200, q: 1.4 },
        gain: 0.25,
      },
    ],
    bus: { drive: 0.16, reverb: { mix: 0.16, size: 0.75, decay: 1.2 } },
  };
}

/** 돼지 grunt */
export function pigGrunt(): SynthSpec {
  const dur = 0.55;
  return {
    duration: dur * 1.3,
    layers: [
      {
        source: "osc",
        notes: [n(0, dur * 0.7, 300, { waveform: "sawtooth", glide: 0.55, glideExp: true })],
        gain: 0.7,
        filter: {
          type: "bandpass",
          freq: 1100,
          freqEnd: 520,
          q: 1.8,
          attack: 0.02,
          decay: dur * 0.6,
        },
        vibrato: { rate: 26, depth: 26 },
      },
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.6,
        amp: env.perc(dur * 0.5, 0.008),
        filter: { type: "bandpass", freq: 1400, q: 1.2 },
        gain: 0.3,
      },
    ],
    bus: { drive: 0.14 },
  };
}

/** 오리 */
export function duckQuack(): SynthSpec {
  const dur = 0.35;
  return {
    duration: dur * 1.4,
    layers: [
      {
        source: "osc",
        notes: [n(0, dur * 0.6, 420, { waveform: "sawtooth", glide: 0.72, glideExp: true })],
        gain: 0.65,
        filter: {
          type: "bandpass",
          freq: 1600,
          freqEnd: 900,
          q: 2.6,
          attack: 0.012,
          decay: dur * 0.55,
        },
      },
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.55,
        amp: env.perc(dur * 0.45, 0.006),
        filter: { type: "bandpass", freq: 1800, q: 1.8 },
        gain: 0.35,
      },
    ],
    bus: { drive: 0.12, reverb: { mix: 0.14, size: 0.7, decay: 0.8 } },
  };
}

/** 개구리 */
export function frogCroak(): SynthSpec {
  const dur = 0.3;
  return {
    duration: dur * 2,
    layers: [
      {
        source: "osc",
        notes: [n(0, dur * 0.55, 180, { waveform: "pulse", width: 0.35 })],
        gain: 0.7,
        filter: {
          type: "bandpass",
          freq: 620,
          freqEnd: 400,
          q: 3,
          attack: 0.008,
          decay: dur * 0.5,
        },
        vibrato: { rate: 30, depth: 16 },
      },
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.5,
        amp: env.perc(dur * 0.4, 0.005),
        filter: { type: "bandpass", freq: 900, q: 1.4 },
        gain: 0.25,
      },
    ],
    bus: { drive: 0.1, reverb: { mix: 0.2, size: 0.85, decay: 1.2 } },
  };
}

/** 벌 */
export function beeBuzz(dur = 3): SynthSpec {
  return {
    duration: dur,
    layers: [
      {
        source: "osc",
        notes: [n(0, dur * 0.92, 240, { waveform: "sawtooth" })],
        gain: 0.35,
        filter: { type: "bandpass", freq: 700, q: 3.4 },
        vibrato: { rate: 38, depth: 40 },
      },
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.92,
        amp: { attack: dur * 0.2, decay: dur * 0.2, sustain: 0.85, release: dur * 0.25 },
        filter: { type: "bandpass", freq: 1600, freqEnd: 2600, q: 1.6 },
        gain: 0.3,
      },
    ],
    bus: { highpass: 180 },
  };
}

/** 교회 종 */
export function churchBell(count = 3): SynthSpec {
  const layers: Layer[] = [];
  for (let i = 0; i < count; i++) {
    const at = i * 2.0;
    layers.push({
      source: "metal",
      at,
      notes: [n(0, 3.2, 262)],
      partials: [1, 2.0, 2.98, 4.1, 5.4, 6.8, 8.2],
      partialDecay: [1, 1.25, 1.6, 2.1, 2.7, 3.4, 4.2],
      gain: 0.8,
    });
  }
  return {
    duration: count * 2.0 + 3,
    layers,
    bus: { reverb: { mix: 0.42, size: 1, decay: 4.2 }, highpass: 70 },
  };
}

/** 바람 소리풍경 */
export function windChime(): SynthSpec {
  const notes: Note[] = [];
  const scale = [1, 1.26, 1.5, 1.68, 2, 2.52];
  for (let i = 0; i < 9; i++) {
    notes.push(
      n(i * 0.42 + R() * 0.16, 1.1 + R() * 0.8, 1046 * scale[i % scale.length] * (0.94 + R() * 0.12), {
        gain: 0.25 + R() * 0.3,
      }),
    );
  }
  return {
    duration: 4.2,
    layers: [{ source: "metal", notes, partials: [1, 2.01, 3.04, 4.2], gain: 0.6 }],
    bus: { reverb: { mix: 0.34, size: 0.9, decay: 2.6 }, highpass: 400 },
  };
}

/** 시계 초침 */
export function clockTick(): SynthSpec {
  return {
    duration: 0.16,
    layers: [
      {
        source: "noise",
        color: "white",
        burst: 0.01,
        amp: env.perc(0.009, 0.0003),
        filter: { type: "bandpass", freq: 4200, freqEnd: 1800, q: 1.4 },
        gain: 0.5,
      },
      {
        source: "metal",
        notes: [n(0, 0.05, 3200)],
        partials: [1, 2.6],
        gain: 0.15,
      },
    ],
    bus: { highpass: 600, reverb: { mix: 0.1, size: 0.6, decay: 0.5 } },
  };
}

/** 모래시계 뒤집기 */
export function hourglass(): SynthSpec {
  return {
    duration: 0.6,
    layers: [
      {
        source: "noise",
        color: "white",
        burst: 0.4,
        amp: { attack: 0.02, decay: 0.1, sustain: 0.7, release: 0.2 },
        filter: { type: "bandpass", freq: 4200, freqEnd: 2000, q: 1.2 },
        gain: 0.4,
      },
      {
        source: "metal",
        notes: [n(0, 0.08, 2400)],
        partials: [1, 2.7],
        gain: 0.2,
      },
    ],
    bus: { highpass: 800 },
  };
}

/** 바코드 스캔 */
export function barcodeScan(): SynthSpec {
  return {
    duration: 0.35,
    layers: [
      {
        source: "osc",
        notes: [n(0, 0.3, 2400, { waveform: "square", glide: 0.55 })],
        gain: 0.3,
        filter: { type: "bandpass", freq: 3000, q: 2.4 },
      },
      {
        source: "noise",
        color: "white",
        burst: 0.3,
        amp: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 },
        filter: { type: "highpass", freq: 3000 },
        gain: 0.2,
      },
    ],
    bus: { highpass: 600 },
  };
}

/** 카메라 플래시 */
export function cameraFlash(): SynthSpec {
  return {
    duration: 0.5,
    layers: [
      {
        source: "metal",
        notes: [n(0, 0.35, 5200)],
        partials: [1, 1.9, 2.8],
        gain: 0.25,
      },
      {
        source: "noise",
        color: "white",
        burst: 0.3,
        amp: { attack: 0.002, decay: 0.08, sustain: 0.3, release: 0.2 },
        filter: { type: "highpass", freq: 4000 },
        gain: 0.25,
      },
    ],
    bus: { reverb: { mix: 0.14, size: 0.7, decay: 0.9 } },
  };
}

/** 테니스 타격 */
export function tennisHit(): SynthSpec {
  return {
    duration: 0.26,
    layers: [
      {
        source: "osc",
        notes: [n(0, 0.12, 300, { waveform: "triangle", glide: 0.45, glideExp: true })],
        gain: 0.8,
      },
      {
        source: "noise",
        color: "white",
        burst: 0.06,
        amp: env.perc(0.05, 0.0006),
        filter: { type: "bandpass", freq: 2800, freqEnd: 800, q: 1 },
        gain: 0.55,
      },
    ],
    bus: { drive: 0.12 },
  };
}

/** 농구 dunk */
export function basketballDunk(): SynthSpec {
  return {
    duration: 0.9,
    layers: [
      {
        source: "osc",
        notes: [n(0, 0.4, 150, { waveform: "triangle", glide: 0.5, glideExp: true })],
        gain: 0.8,
      },
      {
        source: "noise",
        color: "white",
        burst: 0.15,
        amp: env.perc(0.13, 0.001),
        filter: { type: "bandpass", freq: 1800, freqEnd: 600, q: 0.9 },
        gain: 0.45,
      },
      {
        source: "osc",
        notes: [n(0.42, 0.5, 320, { waveform: "sine", glide: 0.6, glideExp: true })],
        gain: 0.4,
      },
    ],
    bus: { drive: 0.14, reverb: { mix: 0.22, size: 0.85, decay: 1.6 } },
  };
}

/** 골프 스윙 */
export function golfSwing(): SynthSpec {
  return {
    duration: 0.7,
    layers: [
      {
        source: "noise",
        color: "pink",
        burst: 0.55,
        amp: { attack: 0.06, decay: 0.14, sustain: 0.4, release: 0.25 },
        filter: {
          type: "bandpass",
          freq: 500,
          freqEnd: 3600,
          q: 2,
          attack: 0.08,
          decay: 0.4,
        },
        gain: 0.65,
      },
      {
        source: "noise",
        color: "white",
        burst: 0.1,
        amp: env.perc(0.09, 0.004),
        filter: { type: "bandpass", freq: 3200, q: 1.4 },
        gain: 0.2,
      },
    ],
    bus: { highpass: 260 },
  };
}

/** 복싱 펀치 */
export function punch(heavy = false): SynthSpec {
  const body = heavy ? 78 : 130;
  return {
    duration: heavy ? 0.55 : 0.35,
    layers: [
      {
        source: "osc",
        notes: [n(0, 0.2, body, { waveform: "sine", glide: 0.4, glideExp: true })],
        gain: 1,
      },
      {
        source: "noise",
        color: "white",
        burst: 0.05,
        amp: env.perc(0.045, 0.0004),
        filter: {
          type: "bandpass",
          freq: heavy ? 1600 : 2600,
          freqEnd: 400,
          q: 0.9,
          attack: 0.0005,
          decay: 0.045,
        },
        gain: heavy ? 0.65 : 0.4,
      },
    ],
    bus: { drive: heavy ? 0.3 : 0.18 },
  };
}

/** 수영 스트로크 */
export function swimmingStroke(): SynthSpec {
  const dur = 1.6;
  return {
    duration: dur,
    layers: [
      {
        source: "noise",
        color: "white",
        burst: dur * 0.9,
        amp: {
          attack: 0.12,
          decay: 0.2,
          sustain: 0.35,
          release: dur * 0.35,
        },
        filter: {
          type: "bandpass",
          freq: 1800,
          freqEnd: 700,
          q: 1.2,
          attack: 0.15,
          decay: dur * 0.6,
        },
        gain: 0.6,
      },
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.9,
        amp: { attack: 0.1, decay: 0.3, sustain: 0.3, release: dur * 0.3 },
        filter: { type: "lowpass", freq: 700, freqEnd: 300 },
        gain: 0.3,
      },
    ],
    bus: { highpass: 160 },
  };
}

/** 수중 거품 */
export function underwater(): SynthSpec {
  const layers: Layer[] = [
    {
      source: "noise",
      color: "brown",
      burst: 4,
      amp: { attack: 0.4, decay: 0.3, sustain: 0.8, release: 0.6 },
      filter: { type: "lowpass", freq: 420 },
      gain: 0.6,
    },
  ];
  for (let i = 0; i < 16; i++) {
    const life = 0.05 + R() * 0.1;
    layers.push({
      source: "noise",
      color: "white",
      at: R() * 3.9,
      burst: life,
      amp: env.perc(life * 0.9, 0.004),
      filter: { type: "bandpass", freq: 600 + R() * 1600, q: 2 },
      gain: 0.1,
    });
  }
  return { duration: 4.2, layers, bus: { lowpass: 2600, highpass: 90 } };
}

/** 미끄러지는 소리 */
export function slide(dur = 1.2): SynthSpec {
  return {
    duration: dur,
    layers: [
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.9,
        amp: { attack: 0.12, decay: 0.3, sustain: 0.6, release: dur * 0.25 },
        filter: {
          type: "bandpass",
          freq: 1400,
          freqEnd: 3200,
          q: 1.4,
          attack: 0.15,
          decay: dur * 0.7,
        },
        gain: 0.5,
      },
      {
        source: "osc",
        notes: [n(0, dur * 0.85, 220, { waveform: "triangle", glide: 1.2 })],
        gain: 0.15,
      },
    ],
    bus: { highpass: 240 },
  };
}

/** 마찰 / 끄는 소리 */
export function scrub(dur = 1): SynthSpec {
  return {
    duration: dur,
    layers: [
      {
        source: "noise",
        color: "white",
        burst: dur * 0.9,
        amp: { attack: 0.08, decay: 0.2, sustain: 0.55, release: dur * 0.3 },
        filter: {
          type: "bandpass",
          freq: 2200,
          freqEnd: 1400,
          q: 1.1,
          attack: 0.1,
          decay: dur * 0.8,
        },
        gain: 0.5,
      },
    ],
    bus: { highpass: 500 },
  };
}

/** 진공 청소기 */
export function vacuumCleaner(dur = 4): SynthSpec {
  return {
    duration: dur,
    layers: [
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.92,
        amp: { attack: dur * 0.15, decay: dur * 0.15, sustain: 0.9, release: dur * 0.2 },
        filter: {
          type: "bandpass",
          freq: 1800,
          freqEnd: 3200,
          q: 0.8,
          attack: dur * 0.2,
          decay: dur * 0.6,
        },
        gain: 0.45,
      },
      {
        source: "osc",
        notes: [n(0, dur * 0.92, 120, { waveform: "sawtooth" })],
        gain: 0.22,
        filter: { type: "lowpass", freq: 700 },
        vibrato: { rate: 24, depth: 6 },
      },
    ],
    bus: { highpass: 120 },
  };
}

/** 스위치를 껐다 켠다 */
export function powerSwitch(on = true): SynthSpec {
  return {
    duration: 0.26,
    layers: [
      {
        source: "noise",
        color: "white",
        burst: 0.012,
        amp: env.perc(0.011, 0.0003),
        filter: { type: "bandpass", freq: 1800, freqEnd: 700, q: 1.3 },
        gain: 0.55,
      },
      {
        source: "osc",
        notes: [n(0.02, 0.14, on ? 660 : 440, { waveform: "triangle", glide: on ? 1.3 : 0.75 })],
        gain: 0.25,
      },
    ],
    bus: { highpass: 250 },
  };
}

/** 액체 붓기 */
export function bubblingLiquid(dur = 2): SynthSpec {
  const layers: Layer[] = [
    {
      source: "noise",
      color: "pink",
      burst: dur * 0.9,
      amp: { attack: 0.15, decay: 0.3, sustain: 0.7, release: dur * 0.3 },
      filter: { type: "bandpass", freq: 700, freqEnd: 1400, q: 1.2 },
      gain: 0.35,
    },
  ];
  for (let i = 0; i < 24; i++) {
    const life = 0.02 + R() * 0.05;
    layers.push({
      source: "osc",
      at: R() * dur * 0.9,
      notes: [
        n(0, life, 260 + R() * 500, {
          waveform: "sine",
          glide: 2.2,
          glideExp: true,
          gain: 0.2 + R() * 0.2,
        }),
      ],
      gain: 0.35,
    });
  }
  return { duration: dur, layers, bus: { highpass: 150 } };
}

/** 모터 회전 소리 */
export function motorSpin(up = true, dur = 2): SynthSpec {
  return {
    duration: dur,
    layers: [
      {
        source: "osc",
        notes: [n(0, dur * 0.92, 90, { waveform: "sawtooth", glide: up ? 3.2 : 0.32, glideExp: true })],
        gain: 0.55,
        filter: {
          type: "lowpass",
          freq: 600,
          freqEnd: 2600,
          q: 2.2,
          attack: dur * 0.4,
          decay: dur * 0.9,
        },
        vibrato: { rate: 18, depth: 7 },
      },
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.92,
        amp: { attack: dur * 0.3, decay: dur * 0.2, sustain: 0.7, release: dur * 0.2 },
        filter: { type: "bandpass", freq: 1000, freqEnd: 2000, q: 1.4 },
        gain: 0.3,
      },
    ],
    bus: { drive: 0.1 },
  };
}

/** 경보음 (경비) */
export function securityAlarm(dur = 2.4): SynthSpec {
  const layers: Layer[] = [
    {
      source: "osc",
      notes: [n(0, dur * 0.92, 880, { waveform: "square", glide: 1.6, glideExp: true })],
      gain: 0.5,
      filter: { type: "lowpass", freq: 3400, q: 1.4 },
      vibrato: { rate: 2.2, depth: 220 },
    },
    {
      source: "osc",
      notes: [n(0, dur * 0.92, 1320, { waveform: "sine", glide: 1.6, glideExp: true, gain: 0.3 })],
      gain: 0.35,
    },
  ];
  for (let i = 0; i < 4; i++) {
    layers.push({
      source: "noise",
      at: i * 0.5,
      burst: 0.04,
      amp: env.perc(0.035, 0.001),
      filter: { type: "highpass", freq: 3600 },
      gain: 0.14,
    });
  }
  return { duration: dur, layers, bus: { reverb: { mix: 0.2, size: 0.8, decay: 1.4 }, drive: 0.14 } };
}

// ═══════════════════════ 멜로디 · 보컬 ═══════════════════════

/** 음 나열 기반 멜로디 생성기 */
export function melody(
  freqs: number[],
  o: {
    noteLen?: number;
    waveform?: Waveform;
    decay?: number;
    reverb?: number;
    /** 각 음의 길이 비율 (0~1). 1 이면 다음 음과 겹침 */
    overlap?: number;
    detune?: number;
    filter?: Filter;
  } = {},
): SynthSpec {
  const step = o.noteLen ?? 0.28;
  const decay = o.decay ?? 1;
  const overlap = o.overlap ?? 0.85;
  const dur = freqs.length * step + step * 1.6;

  const notes = freqs.map((f, i) =>
    n(i * step, step * (1 + (1 - overlap) * 2), f, {
      waveform: o.waveform ?? "triangle",
      gain: 0.9 - (i % 4) * 0.06,
    }),
  );

  return {
    duration: dur,
    layers: [
      {
        source: "osc",
        notes,
        gain: 0.7,
        detune: o.detune ?? 0,
        filter: o.filter ?? { type: "lowpass", freq: 3200, freqEnd: 2400, q: 1.1 },
        vibrato: { rate: 4.5, depth: 2.5 },
      },
      {
        source: "pluck",
        notes: notes.map((note) => ({ ...note, gain: (note.gain ?? 1) * 0.3 })),
        damping: 0.5 / decay,
        gain: 0.35,
      },
      {
        source: "noise",
        color: "white",
        burst: step * 0.4,
        amp: env.perc(step * 0.35, 0.002),
        filter: { type: "highpass", freq: 4200 },
        gain: 0.05,
      },
    ],
    bus: {
      reverb: { mix: o.reverb ?? 0.2, size: 0.8, decay: 1.6 },
      highpass: 90,
      drive: 0.06,
    },
  };
}

const N = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98,
};

export const melodyCalm = () =>
  melody([N.A4, N.C5, N.E5, N.D5, N.C5, N.A4, N.G4, N.A4], {
    noteLen: 0.42,
    waveform: "sine",
    reverb: 0.26,
    detune: 1.2,
  });

export const melodyUplift = () =>
  melody([N.C5, N.E5, N.G5, N.C6, N.G5, N.E5, N.F5, N.A5, N.C6], {
    noteLen: 0.26,
    waveform: "triangle",
    reverb: 0.2,
    detune: 2,
  });

export const melodySad = () =>
  melody([N.A4, N.G4, N.F4, N.E4, N.D4, N.C4, N.E4, N.A4], {
    noteLen: 0.44,
    waveform: "sine",
    decay: 0.8,
    reverb: 0.3,
    detune: 1.6,
  });

export const melodySynth = () =>
  melody([N.D5, N.A5, N.F5, N.C6, N.G5, N.D5, N.A4, N.D5, N.F5], {
    noteLen: 0.24,
    waveform: "sawtooth",
    reverb: 0.22,
    detune: 5,
    filter: { type: "lowpass", freq: 1400, freqEnd: 4200, q: 2.2 },
  });

export const melodyPop = () =>
  melody([N.G4, N.G4, N.B4, N.D5, N.B4, N.D5, N.G5, N.F5, N.E5, N.D5], {
    noteLen: 0.2,
    waveform: "square",
    reverb: 0.16,
    detune: 3,
    filter: { type: "lowpass", freq: 2600, freqEnd: 4200, q: 1.6 },
  });

export const melodyChip = () =>
  melody([N.E5, N.E5, N.E5, N.C5, N.E5, N.G5, N.G5, N.C5, N.G5, N.E5, N.C5, N.D5, N.F5, N.F5, N.E5, N.C5], {
    noteLen: 0.15,
    waveform: "pulse",
    overlap: 0.4,
    reverb: 0.12,
    filter: { type: "lowpass", freq: 5200, q: 0.9 },
  });

/** 흥얼거리는 음 */
export function melodyHumming(dur = 3): SynthSpec {
  const notes: Note[] = [];
  const scale = [N.G4, N.A4, N.B4, N.D5, N.E5, N.G5];
  for (let i = 0; i < 9; i++) {
    notes.push(
      n(i * (dur * 0.82) / 9, dur * 0.16, scale[i % scale.length] * (0.98 + R() * 0.05), {
        waveform: "sine",
        glide: 1.04,
        glideExp: true,
      }),
    );
  }
  return {
    duration: dur,
    layers: [
      {
        source: "osc",
        notes,
        gain: 0.6,
        detune: 3,
        vibrato: { rate: 5, depth: 6 },
        filter: { type: "bandpass", freq: 900, freqEnd: 1300, q: 2.4 },
      },
    ],
    bus: { reverb: { mix: 0.24, size: 0.8, decay: 1.5 }, highpass: 140 },
  };
}

/** 기타 스트로크 — 화음 한 번에 */
export function guitarStrum(): SynthSpec {
  const chord = [N.C4, N.E4, N.G4, N.C5, N.E5];
  const layers: Layer[] = [
    {
      source: "pluck",
      notes: chord.map((f, i) => n(i * 0.022, 1.1, f, { gain: 0.8 - i * 0.06 })),
      damping: 0.42,
      gain: 0.75,
    },
  ];
  for (let i = 0; i < 8; i++) {
    layers.push({
      source: "noise",
      at: i * 0.022,
      burst: 0.01,
      amp: env.perc(0.009, 0.0003),
      filter: { type: "bandpass", freq: 2400 + R() * 1800, q: 1.4 },
      gain: 0.07,
    });
  }
  return {
    duration: 1.8,
    layers,
    bus: { reverb: { mix: 0.2, size: 0.8, decay: 1.3 }, highpass: 100 },
  };
}

/** 기침 */
export function cough(): SynthSpec {
  const hit = (at: number, gain: number, len: number): Layer[] => [
    {
      source: "noise",
      at,
      burst: len * 0.8,
      amp: { attack: 0.006, decay: len * 0.4, sustain: 0.35, release: len * 0.4 },
      filter: {
        type: "bandpass",
        freq: 900,
        freqEnd: 500,
        q: 1.2,
        attack: 0.006,
        decay: len * 0.7,
      },
      gain,
    },
    {
      source: "osc",
      at,
      notes: [n(0, len * 0.6, 160, { waveform: "triangle", glide: 0.7, glideExp: true })],
      gain: gain * 0.5,
    },
  ];
  return {
    duration: 0.85,
    layers: [...hit(0, 1, 0.3), ...hit(0.42, 0.65, 0.2)],
    bus: { highpass: 110, drive: 0.08 },
  };
}

/** 재채기 */
export function sneeze(): SynthSpec {
  return {
    duration: 0.7,
    layers: [
      {
        source: "noise",
        burst: 0.16,
        amp: { attack: 0.004, decay: 0.07, sustain: 0.5, release: 0.1 },
        filter: {
          type: "bandpass",
          freq: 1600,
          freqEnd: 5000,
          q: 0.9,
          attack: 0.004,
          decay: 0.15,
        },
        gain: 0.8,
      },
      {
        source: "noise",
        at: 0.2,
        burst: 0.14,
        amp: env.perc(0.12, 0.01),
        filter: { type: "bandpass", freq: 700, freqEnd: 2400, q: 1 },
        gain: 0.3,
      },
      {
        source: "osc",
        notes: [n(0, 0.12, 300, { waveform: "triangle", glide: 0.55, glideExp: true })],
        gain: 0.25,
      },
    ],
    bus: { drive: 0.12, highpass: 130 },
  };
}

/** 웃음 */
export function laugh(o: { pitch?: number; count?: number; gain?: number } = {}): SynthSpec {
  const pitch = o.pitch ?? 1;
  const count = o.count ?? 5;
  const level = o.gain ?? 1;
  const notes: Note[] = [];
  for (let i = 0; i < count; i++) {
    notes.push(
      n(i * 0.14, 0.1, (280 + (i % 2) * 90) * pitch, {
        waveform: "sawtooth",
        glide: i % 2 ? 1.35 : 0.78,
        glideExp: true,
        gain: (0.5 + R() * 0.25) * level,
      }),
    );
  }
  return {
    duration: 0.35 + count * 0.14,
    layers: [
      {
        source: "osc",
        notes,
        gain: 0.55,
        filter: {
          type: "bandpass",
          freq: 1200 * pitch,
          freqEnd: 2200 * pitch,
          q: 2,
          attack: 0.1,
          decay: 0.3 + count * 0.14,
        },
      },
      {
        source: "noise",
        burst: 0.3 + count * 0.14,
        amp: { attack: 0.06, decay: 0.2, sustain: 0.5, release: 0.3 },
        filter: { type: "bandpass", freq: 1800 * pitch, q: 1.4 },
        gain: 0.25,
      },
    ],
    bus: { reverb: { mix: 0.16, size: 0.75, decay: 1.1 }, drive: 0.08 },
  };
}

/** 힘줄 때 */
export function grunt(): SynthSpec {
  const dur = 0.45;
  return {
    duration: dur,
    layers: [
      {
        source: "osc",
        notes: [n(0, dur * 0.85, 105, { waveform: "sawtooth", glide: 0.78, glideExp: true })],
        gain: 0.7,
        filter: {
          type: "lowpass",
          freq: 1400,
          freqEnd: 500,
          q: 2.4,
          attack: 0.02,
          decay: dur * 0.7,
        },
        vibrato: { rate: 16, depth: 11 },
      },
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.8,
        amp: { attack: 0.02, decay: dur * 0.4, sustain: 0.5, release: dur * 0.2 },
        filter: { type: "bandpass", freq: 800, freqEnd: 400, q: 1.2 },
        gain: 0.35,
      },
    ],
    bus: { drive: 0.16, highpass: 70 },
  };
}

/** 실내 공기음 (room tone) */
export function roomTone(dur = 4): SynthSpec {
  return {
    duration: dur,
    layers: [
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.94,
        amp: {
          attack: dur * 0.25,
          decay: dur * 0.15,
          sustain: 0.85,
          release: dur * 0.25,
        },
        filter: { type: "lowpass", freq: 1400, freqEnd: 700, q: 0.6 },
        gain: 0.4,
      },
      {
        source: "noise",
        color: "brown",
        burst: dur * 0.94,
        amp: { attack: dur * 0.25, decay: dur * 0.2, sustain: 0.7, release: dur * 0.25 },
        filter: { type: "lowpass", freq: 220 },
        gain: 0.25,
      },
    ],
    bus: { reverb: { mix: 0.16, size: 0.8, decay: 1.2 }, highpass: 60 },
  };
}

/** 진흙 발걸음 */
export function squelchStep(): SynthSpec {
  const dur = 0.42;
  return {
    duration: dur * 2.2,
    layers: [
      {
        source: "osc",
        notes: [n(0, dur * 0.7, 108, { waveform: "sine", glide: 0.6, glideExp: true })],
        gain: 0.65,
      },
      {
        source: "noise",
        color: "pink",
        burst: dur * 0.6,
        amp: { attack: 0.006, decay: dur * 0.3, sustain: 0.3, release: dur * 0.35 },
        filter: {
          type: "bandpass",
          freq: 1300,
          freqEnd: 380,
          q: 2.2,
          attack: 0.006,
          decay: dur * 0.55,
        },
        gain: 0.55,
      },
    ],
    bus: { drive: 0.08, highpass: 70 },
  };
}

/** 로봇 걸음 — 기계적 타이밍과 금속 공명 */
export function robotStep(): SynthSpec {
  const dur = 0.5;
  return {
    duration: dur * 2.2,
    layers: [
      {
        source: "osc",
        notes: [n(0, dur * 0.6, 72, { waveform: "square", glide: 0.7, glideExp: true })],
        gain: 0.6,
        filter: { type: "lowpass", freq: 900, freqEnd: 300, q: 2.6 },
      },
      {
        source: "metal",
        notes: [n(0, 0.22, 420)],
        partials: [1, 2.31, 3.77, 5.4],
        partialDecay: [1, 1.4, 2, 3],
        gain: 0.3,
      },
      {
        source: "noise",
        color: "white",
        burst: 0.03,
        amp: env.perc(0.028, 0.0006),
        filter: { type: "bandpass", freq: 2800, freqEnd: 900, q: 1.4 },
        gain: 0.35,
      },
    ],
    bus: { drive: 0.14, reverb: { mix: 0.2, size: 0.85, decay: 1.2 }, highpass: 60 },
  };
}

/** 범용 클릭 */
export function click(o: { freq?: number; len?: number; soft?: boolean } = {}): SynthSpec {
  const f = o.freq ?? 1400;
  const len = o.len ?? 0.09;
  return {
    duration: len * 2.4,
    layers: [
      {
        source: "noise",
        color: "white",
        burst: len * 0.5,
        amp: env.perc(len * 0.45, 0.0002),
        filter: {
          type: "bandpass",
          freq: f * 1.6,
          freqEnd: f,
          q: 1.4,
          attack: 0.0002,
          decay: len * 0.5,
        },
        gain: o.soft ? 0.28 : 0.5,
      },
      {
        source: "osc",
        notes: [n(0, len * 0.25, f, { waveform: "triangle", glide: 0.6 })],
        gain: 0.28,
      },
    ],
    bus: { highpass: 320 },
  };
}