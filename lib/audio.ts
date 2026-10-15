/**
 * Pixwave 합성 엔진
 * ─────────────────────────────────────────────────────────────
 * 사운드는 바이너리 파일이 아니라 이 엔진의 파라미터로 정의됩니다.
 * 미리듣기와 다운로드는 완전히 동일한 샘플을 생성합니다.
 *
 * 신호 경로
 *   Layer (음원 → 필터 → 앰프 엔벨로프)
 *     └─ Bus (하이패스 → 로우패스 → 딜레이 → 드라이브 → 리버브 → 리마스터)
 *
 * 단순 사인파 + 화이트노이즈로는 실감이 안 나므로, 실제 SFX 복원에 필요한
 * 요소를 모두 포함합니다:
 *   - TPT 상태변수 필터 (공진 + 컷오프 스윕)
 *   - ADSR / 지수 감쇠 엔벨로프
 *   - 핑크·브라운 노이즈 (색이 있는 노이즈)
 *   - 비조화 부분음 뱅크 (현악·테이블·사이렌)
 *   - Karplus-Strong (현악기 플럭)
 *   - Schroeder 리버브, 피드백 딜레이
 *   - 결정론적 난수 (미리듣기 == 다운로드)
 */

export const SAMPLE_RATE = 44100;
const TAU = Math.PI * 2;
const TWO_PI = TAU;

// ─────────────────────────── 타입 ───────────────────────────

export type Waveform =
  | "sine"
  | "triangle"
  | "sawtooth"
  | "square"
  | "pulse"
  | "noise";

export type NoiseColor = "white" | "pink" | "brown";

/** 앰프 엔벨로프. sustain 을 생략하거나 0 으로 두면 타격형 지수 감쇠가 됩니다. */
export interface Envelope {
  attack: number;
  decay: number;
  sustain?: number;
  release?: number;
  /** 감쇠 곡선. 1 = 선형, 클수록 지수적. 기본 2 */
  curve?: number;
}

/** 필터 + 선택적 컷오프 엔벨로프 */
export interface Filter {
  type: "lowpass" | "highpass" | "bandpass" | "notch";
  /** 시작 컷오프 (Hz) */
  freq: number;
  /** 필터 엔벨로프 끝 컷오프 (Hz). 없으면 고정 */
  freqEnd?: number;
  /** Q. 기본 0.707 */
  q?: number;
  /** 엔벨로프가 왕복하는 오각 수. 기본 0 */
  sweep?: number;
  attack?: number;
  decay?: number;
}

export interface LFO {
  rate: number;
  /** 주파수 진폭 (Hz) */
  depth: number;
  shape?: Waveform;
}

export interface Note {
  /** 시작 오프셋 (초) */
  at: number;
  /** 길이 (초) */
  dur: number;
  /** 주파수 (Hz) */
  freq: number;
  gain?: number;
  waveform?: Waveform;
  /** 이 음이 길어질수록 freq → freq × glide 로 이동 */
  glide?: number;
  /** 글라이드를 지수 곡선으로. 기본 false */
  glideExp?: boolean;
  /** 펄스 폭 (0~1, waveform: "pulse" 용) */
  width?: number;
}

export type LayerSource = "osc" | "noise" | "metal" | "pluck";

export interface Layer {
  source: LayerSource;
  /** 레이어 시작 오프셋 (초). 노이즈 버스트를 시간축에 흩뿌릴 때 사용 */
  at?: number;
  /** osc / metal / pluck 음원 */
  notes?: Note[];
  /** metal: 기준 주파수에 곱해지는 비조화 비율 */
  partials?: number[];
  /** metal: 각 부분음의 감쇠 배수 (1 = 동일, 클수록 짧음) */
  partialDecay?: number[];
  /** pluck: 지직임 계수. 클수록 짧게 울림 */
  damping?: number;
  /** noise: 노이즈 색 */
  color?: NoiseColor;
  /** 레이어 게인 */
  gain?: number;
  /** 레이어 전체 엔벨로프. 지정하지 않으면 note.duration 을 게이트로 사용 */
  amp?: Envelope;
  filter?: Filter;
  /** 톤 레이어에 살짝 섞일 노이즈 (에어/스쳐감) */
  drive?: number;
  /** 동일 음을 여러 개 살짝 어긋나게 겹쳐 음색을 넓힘 */
  detune?: number;
  vibrato?: LFO;
  /** 노이즈 레이어 전용: 타격형 게이트 길이 (초) */
  burst?: number;
}

export interface Reverb {
  mix: number;
  /** RT60 (초). 기본 1.6 */
  decay?: number;
  /** 공간 크기 0~1. 기본 0.8 */
  size?: number;
  /** 고역 감쇠 0~1. 기본 0.4 */
  damp?: number;
}

export interface Delay {
  mix: number;
  /** 지연 시간 (초). 기본 0.18 */
  time?: number;
  /** 0~0.9 */
  feedback?: number;
  /** 반복음 로우패스 0~1 */
  tone?: number;
}

export interface Bus {
  highpass?: number;
  lowpass?: number;
  drive?: number;
  reverb?: Reverb;
  delay?: Delay;
  /** 최종 피크. 기본 0.89 */
  peak?: number;
}

export interface SynthSpec {
  duration: number;
  layers: Layer[];
  bus?: Bus;
}

/** 데이터 작성용 헬퍼 — 한 음 */
export function n(
  at: number,
  dur: number,
  freq: number,
  extra: Partial<Note> = {},
): Note {
  return { at, dur, freq, ...extra };
}

// ─────────────────────── 엔벨로프 헬퍼 ───────────────────────

export const env = {
  /** 타격형: 빠른 어택 + 지수 감쇠 */
  perc: (decay = 0.2, attack = 0.001): Envelope => ({ attack, decay }),
  /** 어택 + 감쇠, sustain 없음 */
  ad: (attack: number, decay: number): Envelope => ({ attack, decay }),
  /** 완전한 ADSR */
  adsr: (
    attack: number,
    decay: number,
    sustain: number,
    release: number,
    curve?: number,
  ): Envelope => ({ attack, decay, sustain, release, curve }),
  /** 아주 짧은 클릭/틱 */
  tick: (): Envelope => ({ attack: 0.0004, decay: 0.012 }),
};

// ─────────────────────────── DSP ───────────────────────────

/** 결정론적 난수 — 같은 사양이면 항상 같은 소리 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** TPT 상태변수 필터 — 컷오프를 샘플마다 변조해도 안정적 */
class SVF {
  private ic1 = 0;
  private ic2 = 0;
  private a1 = 0;
  private a2 = 0;
  private a3 = 0;
  private v3 = 0;

  private set(freq: number, q: number, sr: number) {
    const fc = Math.min(Math.max(freq, 12), sr * 0.47);
    const g = Math.tan((Math.PI * fc) / sr);
    const k = 1 / Math.max(q, 0.05);
    const denom = 1 + g * (g + k);
    this.a1 = 1 / denom;
    this.a2 = g * this.a1;
    this.a3 = g * this.a2;
  }

  process(x: number, freq: number, q: number, type: Filter["type"], sr: number) {
    this.set(freq, q, sr);
    const k = 1 / Math.max(q, 0.05);
    this.v3 = x - this.ic2;
    const v1 = this.a1 * this.ic1 + this.a2 * this.v3;
    const v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * this.v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;

    switch (type) {
      case "lowpass":
        return v2;
      case "highpass":
        return x - k * v1 - v2;
      case "bandpass":
        return v1;
      case "notch":
        return x - k * v1;
    }
  }
}

/** 1차 로우패스 (다항목 연결용) */
class OnePole {
  private z = 0;
  process(x: number, coeff: number) {
    this.z += coeff * (x - this.z);
    return this.z;
  }
}

function noiseSource(
  rnd: () => number,
  state: { pink: number[]; brown: number },
  color: NoiseColor,
): number {
  const white = rnd() * 2 - 1;
  switch (color) {
    case "white":
      return white;
    case "brown": {
      state.brown = (state.brown + white * 0.035) / 1.02;
      return state.brown * 6.5;
    }
    case "pink": {
      // Paul Kellet economy pink filter
      state.pink[0] = 0.99765 * state.pink[0] + white * 0.0990460;
      state.pink[1] = 0.96300 * state.pink[1] + white * 0.2965164;
      state.pink[2] = 0.57000 * state.pink[2] + white * 1.0526913;
      const out =
        state.pink[0] + state.pink[1] + state.pink[2] + white * 0.1848;
      state.pink[0] *= 0.9;
      state.pink[1] *= 0.72;
      state.pink[2] *= 0.28;
      return out * 0.22;
    }
  }
}

function osc(
  waveform: Waveform,
  phase: number,
  rnd: () => number,
  width = 0.5,
): number {
  switch (waveform) {
    case "sine":
      return Math.sin(phase);
    case "triangle": {
      const p = phase / TWO_PI - Math.floor(phase / TWO_PI);
      return p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
    }
    case "sawtooth": {
      const p = phase / TWO_PI - Math.floor(phase / TWO_PI + 0.5);
      return 2 * p;
    }
    case "square":
      return Math.sin(phase) >= 0 ? 1 : -1;
    case "pulse": {
      const p = phase / TWO_PI - Math.floor(phase / TWO_PI);
      return p < width ? 1 : -1;
    }
    case "noise":
      return rnd() * 2 - 1;
  }
}

function envelopeValue(e: Envelope, t: number, gateEnd: number): number {
  const A = Math.max(0, e.attack);
  const D = Math.max(0.0005, e.decay);
  const S = e.sustain ?? 0;
  const R = Math.max(0.0005, e.release ?? D * 0.6);
  const curve = e.curve ?? 2;

  if (t <= 0) return t === 0 && A === 0 ? 1 : 0;
  if (A > 0 && t < A) return t / A;

  // 타격형: sustain 이 없으면 끝까지 지수 감쇠
  if (S <= 0.001) {
    return Math.exp((-6.9 * (t - A)) / D);
  }

  if (t < A + D) {
    const x = (t - A) / D;
    return 1 - (1 - S) * Math.pow(x, curve);
  }

  const gateStart = Math.max(gateEnd, A + D);
  if (t < gateStart) return S;
  const x = (t - gateStart) / R;
  return x >= 1 ? 0 : S * (1 - Math.pow(x, curve));
}

/**
 * 오실레이터 노트 엔벨로프.
 *
 * 짧은 음은 타격형 지수 감쇠가 맞지만, 긴 음에 같은 식을 쓰면
 * 6초짜리 드론이 2초 만에 죽습니다. 길이에 따라 방식을 나눕니다.
 */
function oscEnvelope(local: number, dur: number): number {
  const attack = Math.min(0.012, dur * 0.06);
  if (local < attack) return attack > 0 ? local / attack : 1;

  if (dur < 0.5) {
    // 짧은 음 — 어택 직후 지수 감쇠
    return Math.exp((-6.9 * (local - attack)) / Math.max(dur - attack, 0.001));
  }

  // 긴 음 — 유지하다가 끝에서 릴리즈
  const hold = dur * 0.72;
  const releaseLen = Math.max(dur - hold, 0.05);
  if (local < hold) return 1;
  const x = (local - hold) / releaseLen;
  return x >= 1 ? 0 : Math.pow(1 - x, 1.8);
}

/** 필터 컷오프 추적 (env sweep) */
function filterFreq(
  filter: Filter,
  t: number,
  dur: number,
): number {
  if (!filter.freqEnd) return filter.freq;
  const a = filter.attack ?? 0.002;
  const d = filter.decay ?? dur * 0.4;
  let x: number;
  if (t < a) x = a > 0 ? t / a : 1;
  else x = Math.min(1, (t - a) / Math.max(d, 0.0005));

  const octaves = Math.log2(filter.freqEnd / filter.freq);
  return filter.freq * Math.pow(2, octaves * x);
}

// ─────────────────────── 레이어 렌더링 ───────────────────────

function renderLayer(
  layer: Layer,
  out: Float32Array,
  sr: number,
  seed: number,
  specDuration: number,
) {
  const notes = layer.notes ?? [];
  const gain = layer.gain ?? 1;
  const detune = layer.detune ?? 0;
  const vibrato = layer.vibrato;
  const filter = layer.filter;
  const filterQ = filter?.q ?? 0.707;
  const layerAt = layer.at ?? 0;

  const svf = filter ? new SVF() : null;

  // 노이즈 색 상태
  const rnd = mulberry32(seed);
  const noiseState = { pink: [0, 0, 0], brown: 0 };

  const layerAmp = layer.amp;
  const gateEnd = specDuration;
  const burstGate = layer.burst ?? specDuration;

  // pluck 레이어용 지연선 (음별)
  const ksLines = notes.map((note) => ({
    note,
    buf: new Float32Array(Math.max(2, Math.round(sr / note.freq))),
    idx: 0,
    primed: false,
    phase: 0,
    last: 0,
  }));

  const phases = notes.map(() => 0);
  const phases2 = notes.map(() => 0);
  const oscRnd = mulberry32(seed ^ 0x9e3779b9);

  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    // 레이어 오프셋을 뺀 로컬 시간. 아직 시작되지 않은 레이어는 건너뛴다.
    const lt = t - layerAt;
    let sample = 0;

    if (layer.source === "noise") {
      if (lt < 0) continue;
      const color = layer.color ?? "white";
      const raw = noiseSource(rnd, noiseState, color);
      const gate = layerAmp ? gateEnd : burstGate;
      const a = layerAmp ? envelopeValue(layerAmp, lt, gate) : 1;
      sample = raw * a;
    } else if (layer.source === "pluck") {
      // Karplus-Strong
      // 감쇠는 루프 안의 평균화 필터와 1 에 아주 가까운 루프 게인이 결정한다.
      // 게인을 확 낮추면 0.2초 만에 죽어 현악기가 되지 못한다.
      const loopGain = 1 - (layer.damping ?? 0.5) * 0.0009;
      for (const line of ksLines) {
        const note = line.note;
        if (lt < note.at || lt > note.at + note.dur) continue;
        const gate = lt - note.at;

        if (!line.primed) {
          for (let k = 0; k < line.buf.length; k++) {
            line.buf[k] = rnd() * 2 - 1;
          }
          // 두 번 평균내 목의 나무처럼 약한 고음만 남긴다
          for (let pass = 0; pass < 2; pass++) {
            let prev = line.buf[line.buf.length - 1];
            for (let k = 0; k < line.buf.length; k++) {
              const cur = line.buf[k];
              line.buf[k] = (cur + prev) * 0.5;
              prev = cur;
            }
          }
          line.primed = true;
        }

        const cur = line.buf[line.idx];
        line.buf[line.idx] = ((line.last + cur) * 0.5) * loopGain;
        line.last = cur;
        line.idx = (line.idx + 1) % line.buf.length;

        // 지수 감쇠 + 노트 끝 짧은 릴리즈 (갑자기 끊겨 생기는 클릭 방지)
        const releaseLen = Math.max(note.dur * 0.14, 0.012);
        const releaseStart = Math.max(note.dur - releaseLen, 0);
        let e = Math.exp((-1.5 * gate) / Math.max(note.dur, 0.05));
        if (gate > releaseStart) {
          e *= 1 - (gate - releaseStart) / releaseLen;
        }
        sample += Math.max(0, e) * cur * (note.gain ?? 1);
      }
    } else if (layer.source === "metal") {
      const ratios = layer.partials ?? [1, 1.41, 1.98, 2.37, 3.11, 4.07];
      const decays = layer.partialDecay ?? ratios.map((_, k) => 1 + k * 0.45);
      for (let ni = 0; ni < notes.length; ni++) {
        const note = notes[ni];
        const local = lt - note.at;
        if (local < 0 || local > note.dur) continue;
        for (let p = 0; p < ratios.length; p++) {
          const f = note.freq * ratios[p];
          if (f > sr * 0.45) continue;
          const dScale = decays[p] ?? 1;
          const decayLen = note.dur / dScale;
          if (local > decayLen) continue;
          const e = Math.exp((-7 * local) / Math.max(decayLen, 0.001));
          phases[ni] += (TAU * f) / sr;
          sample +=
            Math.sin(phases[ni]) * e * (note.gain ?? 1) / Math.sqrt(p + 1.4);
        }
      }
    } else {
      // osc
      for (let ni = 0; ni < notes.length; ni++) {
        const note = notes[ni];
        const local = lt - note.at;
        if (local < 0 || local > note.dur) continue;

        let freq = note.freq;
        if (note.glide && note.dur > 0) {
          const p = note.glideExp
            ? Math.pow(note.glide, local / note.dur)
            : 1 + (note.glide - 1) * (local / note.dur);
          freq = note.freq * p;
        }
        if (vibrato) {
          const shape = vibrato.shape ?? "sine";
          const lfo =
            shape === "sine"
              ? Math.sin(TAU * vibrato.rate * lt)
              : shape === "triangle"
                ? ((((lt * vibrato.rate) % 1) + 1) % 1 < 0.5
                    ? 4 * (((lt * vibrato.rate) % 1) + 1) % 1 - 1
                    : 3 - (4 * (((lt * vibrato.rate) % 1) + 1)) % 1)
                : 2 * ((((lt * vibrato.rate) % 1) + 1) % 1) - 1;
          freq += vibrato.depth * lfo;
        }
        if (freq <= 0 || freq > sr * 0.48) continue;

        const e = oscEnvelope(local, note.dur);

        const wf = note.waveform ?? "sine";
        phases[ni] += (TAU * freq) / sr;
        let v = osc(wf, phases[ni], oscRnd, note.width ?? 0.5) * e;
        if (detune) {
          phases2[ni] += (TAU * (freq + detune)) / sr;
          v += osc(wf, phases2[ni], oscRnd, note.width ?? 0.5) * e * 0.6;
        }
        sample += v * (note.gain ?? 1);
      }
    }

    if (svf && filter) {
      if (lt >= 0) {
        const freq = filterFreq(filter, lt, specDuration);
        const q = filter.sweep
          ? filterQ * (1 + filter.sweep * Math.exp((-4 * lt) / Math.max(filter.decay ?? 0.2, 0.01)))
          : filterQ;
        sample = svf.process(sample, freq, q, filter.type, sr);
      }
    }

    if (layerAmp && layer.source !== "noise") {
      sample *= envelopeValue(layerAmp, lt, gateEnd);
    }

    const drive = layer.drive ?? 0;
    if (drive > 0) sample = Math.tanh(sample * (1 + drive * 4)) / (1 + drive * 0.6);

    out[i] += sample * gain;
  }
}

// ─────────────────────────── 버스 ───────────────────────────

function applyDelay(buf: Float32Array, delay: Delay, sr: number, seed: number) {
  const mix = delay.mix ?? 0;
  if (mix <= 0) return;
  const time = delay.time ?? 0.18;
  const feedback = Math.min(0.9, Math.max(0, delay.feedback ?? 0.35));
  const tone = delay.tone ?? 0.4;

  const len = Math.max(1, Math.round(time * sr));
  const line = new Float32Array(len);
  const damp = new OnePole();
  const dry = Float32Array.from(buf);

  // 시작 위치를 흩뜨려 반복 패턴이 들리지 않게
  let idx = Math.abs(seed) % len;

  for (let i = 0; i < buf.length; i++) {
    const read = line[idx];
    buf[i] += read * mix;
    const fb = damp.process(read, tone) * feedback;
    line[idx] = dry[i] + fb;
    idx = (idx + 1) % len;
  }
}

function applyReverb(buf: Float32Array, reverb: Reverb, sr: number) {
  const mix = reverb.mix ?? 0;
  if (mix <= 0) return;
  const size = reverb.size ?? 0.8;
  const damp = reverb.damp ?? 0.4;
  const rt60 = reverb.decay ?? 1.6;

  const scale = (0.7 + size * 0.6) * (sr / 44100);
  const combs = [1557, 1617, 1491, 1422].map((d) =>
    Math.max(16, Math.round(d * scale)),
  );
  const allpasses = [225, 556].map((d) => Math.max(8, Math.round(d * scale)));

  const feedback = Math.min(0.96, Math.pow(10, (-3 * (rt60 * scale)) / combs[0]));

  const combBufs = combs.map((len) => new Float32Array(len));
  const combIdx = combs.map(() => 0);
  const combDamp = combs.map(() => 0);
  const apBufs = allpasses.map((len) => new Float32Array(len));
  const apIdx = allpasses.map(() => 0);

  const dry = Float32Array.from(buf);

  for (let i = 0; i < buf.length; i++) {
    const input = dry[i] * 0.22;

    let wet = 0;
    for (let c = 0; c < combs.length; c++) {
      const y = combBufs[c][combIdx[c]];
      combDamp[c] = y * (1 - damp) + combDamp[c] * damp;
      combBufs[c][combIdx[c]] = input + combDamp[c] * feedback;
      const len = combs[c];
      combIdx[c] = (combIdx[c] + 1) % len;
      wet += y;
    }
    wet *= 0.25;

    for (let a = 0; a < allpasses.length; a++) {
      const bufA = apBufs[a];
      const lenA = bufA.length;
      const y = bufA[apIdx[a]];
      const outA = -wet + y;
      bufA[apIdx[a]] = wet + y * 0.5;
      apIdx[a] = (apIdx[a] + 1) % lenA;
      wet = outA;
    }

    buf[i] = dry[i] * (1 - mix * 0.35) + wet * mix * 1.6;
  }
}

// ──────────────────────── 공개 API ────────────────────────

export function normalize(samples: Float32Array, peak: number): Float32Array {
  let max = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > max) max = a;
  }
  if (max < 1e-9) return samples;
  const scale = peak / max;
  for (let i = 0; i < samples.length; i++) samples[i] *= scale;
  return samples;
}

export function renderSpec(
  spec: SynthSpec,
  sampleRate = SAMPLE_RATE,
): Float32Array<ArrayBuffer> {
  const total = Math.max(1, Math.floor(spec.duration * sampleRate));
  const out = new Float32Array(total);
  const seed = hashString(JSON.stringify(spec));

  spec.layers.forEach((layer, i) => {
    renderLayer(layer, out, sampleRate, (seed + i * 0x9e3779b9) >>> 0, spec.duration);
  });

  const bus = spec.bus ?? {};

  // 버스 고역/저역 정리
  if (bus.highpass) {
    const svf = new SVF();
    for (let i = 0; i < out.length; i++) {
      const t = i / sampleRate;
      out[i] = svf.process(out[i], bus.highpass, 0.707, "highpass", sampleRate);
      void t;
    }
  }
  if (bus.lowpass) {
    const svf = new SVF();
    for (let i = 0; i < out.length; i++) {
      out[i] = svf.process(out[i], bus.lowpass, 0.707, "lowpass", sampleRate);
    }
  }

  if (bus.delay) applyDelay(out, bus.delay, sampleRate, seed);
  if (bus.reverb) applyReverb(out, bus.reverb, sampleRate);

  // 드라이브 + 소프트 리미터
  const drive = bus.drive ?? 0;
  for (let i = 0; i < out.length; i++) {
    let v = out[i];
    if (drive > 0) v = Math.tanh(v * (1 + drive * 3.5));
    // 마지막 페이드 아웃 (클릭 방지)
    const fadeStart = spec.duration * 0.94;
    const t = i / sampleRate;
    if (t > fadeStart) {
      const p = (t - fadeStart) / Math.max(spec.duration - fadeStart, 1e-6);
      v *= Math.max(0, 1 - p * p);
    }
    out[i] = v;
  }

  // DC 차단 — 반드시 드라이브 *뒤* 에 둔다.
  // tanh 는 비선형이라 DC 가 섞인 신호를 비대칭으로 눌러 새로운 DC 를 만들어낸다.
  {
    const r = 0.9995; // corner 약 3.5Hz — 색 변화 없이 DC 만 제거
    let prevIn = 0;
    let prevOut = 0;
    for (let i = 0; i < out.length; i++) {
      const x = out[i];
      const y = x - prevIn + r * prevOut;
      prevIn = x;
      prevOut = y;
      out[i] = y;
    }
  }

  return normalize(out, bus.peak ?? 0.89) as Float32Array<ArrayBuffer>;
}

/** 시각화용 엔벨로프 바 — 실제 렌더링 없이 파형 모양만 계산 */
export function envelopeBars(spec: SynthSpec, count = 44): number[] {
  const bars: number[] = [];

  for (let i = 0; i < count; i++) {
    const t = ((i + 0.5) / count) * spec.duration;
    let energy = 0;

    for (const layer of spec.layers) {
      const gain = layer.gain ?? 1;
      const lt = t - (layer.at ?? 0);

      if (layer.source === "noise") {
        if (lt < 0) continue;
        const gate = layer.amp
          ? envelopeValue(layer.amp, lt, spec.duration)
          : envelopeValue(
              { attack: 0.002, decay: layer.burst ?? spec.duration * 0.5 },
              lt,
              spec.duration,
            );
        energy += gain * gate;
        continue;
      }

      for (const note of layer.notes ?? []) {
        const local = lt - note.at;
        if (local < 0 || local > note.dur) continue;
        const e = oscEnvelope(local, note.dur);
        energy += gain * e * (note.gain ?? 1);
      }
    }

    bars.push(Math.min(1, energy));
  }

  const max = Math.max(...bars, 1e-6);
  return bars.map((b) => Math.max(0.08, b / max));
}

// ─────────────────────── WAV 인코딩 ───────────────────────

export function encodeWav(
  samples: Float32Array<ArrayBufferLike>,
  sampleRate = SAMPLE_RATE,
): Uint8Array {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += bytesPerSample;
  }

  return new Uint8Array(buffer);
}

export function specToWav(spec: SynthSpec): Uint8Array {
  return encodeWav(renderSpec(spec));
}

export function downloadBytes(
  bytes: Uint8Array,
  filename: string,
  mime = "application/octet-stream",
) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function slugifyFile(input: string): string {
  return input
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}