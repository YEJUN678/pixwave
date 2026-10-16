/**
 * 외부 녹음 WAV 를 사이트 규격으로 변환해 등록합니다.
 * 실행: npm run import:audio
 *
 * 하는 일:
 *   1. LIST 같은 중간 청크가 끼어 있는 WAV 도 정확히 파싱
 *   2. 이벤트(클릭/방울 등) 분리 — "클릭 3회분"을 "클릭 1회"로 잘라낸다
 *   3. 지정한 이벤트만 이어 붙여 하나의 사운드로 만든다
 *   4. 앞뒤 무음 트리밍 → 44.1kHz 리샘플 → 모노 → 피크 0.89 정규화
 *   5. public/audio/ 에 쓰고, 등록 정보를 lib/audio-files.ts 로 자동 생성
 *
 * lib/audio-files.ts 는 이 스크립트가 만드는 파일입니다. 직접 고치지 마세요.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * 원본 녹음이 있는 디렉터리.
 *
 * 이 값은 이 컴퓨터에만 유효하므로 저장소에 박아두면 안 됩니다.
 * (하드코딩했던 탓에 CI 가 ENOENT 로 죽었습니다)
 * 우선순위: AUDIO_SRC_DIR 환경변수 → 저장소 바로 위 디렉터리.
 * 원본 녹음은 저장소에 커밋하지 않으므로, 없는 환경(CI)에서는 아래 조기 종료로 빠집니다.
 */
const SRC_DIR = resolve(process.env.AUDIO_SRC_DIR || join(process.cwd(), ".."));
const OUT_DIR = join(process.cwd(), "public", "audio");
const REGISTRY = join(process.cwd(), "lib", "audio-files.ts");

const TARGET_SR = 44100;
const PEAK = 0.89;
const SILENCE_RATIO = 0.015;
const PAD_SEC = 0.015;

// ─────────────────────────── WAV 파싱 ───────────────────────────

interface Parsed {
  channels: number;
  sampleRate: number;
  bits: number;
  mono: Float32Array;
  frames: number;
}

/** LIST 청크가 끼어도 동작하는 WAV 파서 */
function parseWav(buf: Buffer): Parsed {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("RIFF/WAVE 가 아님");
  }

  let fmt: { channels: number; sampleRate: number; bits: number; format: number } | null = null;
  let dataOffset = -1;
  let dataSize = 0;

  let pos = 12;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);

    if (id === "fmt ") {
      fmt = {
        format: buf.readUInt16LE(pos + 8),
        channels: buf.readUInt16LE(pos + 10),
        sampleRate: buf.readUInt32LE(pos + 12),
        bits: buf.readUInt16LE(pos + 22),
      };
    } else if (id === "data") {
      dataOffset = pos + 8;
      dataSize = Math.min(size, buf.length - dataOffset);
      break;
    }
    pos += 8 + size + (size % 2); // 청크는 짝수 바이트 정렬
  }

  if (!fmt) throw new Error("fmt 청크 없음");
  if (dataOffset < 0) throw new Error("data 청크 없음");
  if (fmt.format !== 1 || fmt.bits !== 16) {
    throw new Error(`16bit PCM 아님 (format=${fmt.format}, bits=${fmt.bits})`);
  }

  const { channels, sampleRate } = fmt;
  const frames = Math.floor(dataSize / (channels * 2));
  const acc = new Float32Array(frames);
  const l = new Float32Array(frames);

  for (let i = 0; i < frames; i++) {
    if (channels === 1) {
      acc[i] = buf.readInt16LE(dataOffset + i * 2) / 32768;
    } else {
      const a = buf.readInt16LE(dataOffset + i * channels * 2) / 32768;
      const b = buf.readInt16LE(dataOffset + i * channels * 2 + 2) / 32768;
      l[i] = a;
      acc[i] = (a + b) * 0.5;
    }
  }
  void l;

  return { channels, sampleRate, bits: fmt.bits, mono: acc, frames };
}

// ─────────────────────────── 이벤트 분리 ───────────────────────────

type Event = [number, number]; // [시작초, 끝초]

/** RMS 에너지 기반 온셋 검출 */
function detectOnsets(x: Float32Array, sr: number): Event[] {
  const W = Math.round(sr * 0.005);
  const n = Math.floor(x.length / W);
  const e = new Float32Array(n);

  for (let b = 0; b < n; b++) {
    let s2 = 0;
    for (let k = b * W; k < (b + 1) * W && k < x.length; k++) s2 += x[k] * x[k];
    e[b] = Math.sqrt(s2 / W);
  }

  const sorted = [...e].sort((a, b) => b - a);
  const median = sorted[Math.floor(n * 0.5)] || 1e-9;
  const threshold = Math.max(median * 6, sorted[Math.floor(n * 0.9)] * 0.22);

  const events: Event[] = [];
  let active = false;
  let start = 0;
  for (let b = 0; b < n; b++) {
    if (!active && e[b] > threshold) {
      active = true;
      start = b;
    } else if (active && e[b] < threshold * 0.35) {
      active = false;
      events.push([start * W / sr, (b * W) / sr]);
    }
  }
  if (active) events.push([start * W / sr, n / W / sr]);

  return events.filter((ev) => ev[1] - ev[0] > 0.008);
}

/** 선택한 이벤트만 잘라 이어 붙인다 */
function extract(
  x: Float32Array,
  sr: number,
  indices: number[],
  events: Event[],
  gapMs: number,
): Float32Array {
  const gap = Math.round((gapMs / 1000) * sr);
  const pad = Math.round(PAD_SEC * sr);
  const chunks: Float32Array[] = [];
  let total = 0;

  for (const idx of indices) {
    const ev = events[idx];
    if (!ev) throw new Error(`이벤트 ${idx} 없음 (총 ${events.length}개)`);
    const s0 = Math.max(0, Math.round(ev[0] * sr) - pad);
    const s1 = Math.min(x.length, Math.round(ev[1] * sr) + pad);
    const chunk = x.slice(s0, s1);
    chunks.push(chunk);
    total += chunk.length + gap;
  }
  total -= gap;

  const out = new Float32Array(total);
  let cursor = 0;
  chunks.forEach((chunk, i) => {
    out.set(chunk, cursor);
    cursor += chunk.length;
    if (i < chunks.length - 1) cursor += gap;
  });
  return out;
}

// ─────────────────────────── DSP ───────────────────────────

/** 해밍 창 이동평균 (저역통과) — taps 는 홀수 */
function lowpass(x: Float32Array, taps = 25): Float32Array {
  if (taps % 2 === 0) taps += 1;
  const half = Math.floor(taps / 2);
  const win = new Float64Array(taps);
  for (let i = 0; i < taps; i++) {
    win[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (taps - 1));
  }

  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    let sum = 0;
    let wsum = 0;
    for (let k = -half; k <= half; k++) {
      const idx = i + k;
      if (idx < 0 || idx >= x.length) continue;
      const w = win[k + half]; // 창 인덱스가 k 와 함께 움직여야 한다
      sum += x[idx] * w;
      wsum += w;
    }
    out[i] = wsum > 0 ? sum / wsum : x[i];
  }
  return out;
}

function resample(x: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return x;
  const ratio = from / to;
  const outLen = Math.floor(x.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, x.length - 1);
    const t = pos - i0;
    out[i] = x[i0] * (1 - t) + x[i1] * t;
  }
  return out;
}

function peakOf(x: Float32Array): number {
  let p = 0;
  for (const v of x) {
    const a = Math.abs(v);
    if (a > p) p = a;
  }
  return p;
}

function trimSilence(x: Float32Array, sr: number): Float32Array {
  const peak = peakOf(x);
  if (peak < 1e-9) return x;
  const thresh = peak * SILENCE_RATIO;
  const pad = Math.round(PAD_SEC * sr);
  let first = 0;
  let last = x.length - 1;
  while (first < x.length && Math.abs(x[first]) < thresh) first++;
  while (last > 0 && Math.abs(x[last]) < thresh) last--;
  if (first >= last) return x;
  return x.slice(Math.max(0, first - pad), Math.min(x.length, last + pad + 1));
}

/** DC 차단 (경계 처리를 한 번 더) */
function dcBlock(x: Float32Array): Float32Array {
  const r = 0.9995;
  let prevIn = 0;
  let prevOut = 0;
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const y = x[i] - prevIn + r * prevOut;
    prevIn = x[i];
    prevOut = y;
    out[i] = y;
  }
  return out;
}

/** 16bit PCM WAV 인코딩 */
function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const ascii = (o: number, t: string) => {
    for (let i = 0; i < t.length; i++) view.setUint8(o + i, t.charCodeAt(i));
  };
  ascii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, dataSize, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    o += 2;
  }
  return new Uint8Array(buffer);
}

function makeBars(x: Float32Array, count = 44): number[] {
  const per = Math.max(1, Math.floor(x.length / count));
  const raw: number[] = [];
  for (let i = 0; i < count; i++) {
    let m = 0;
    const s0 = i * per;
    const s1 = i === count - 1 ? x.length : (i + 1) * per;
    for (let k = s0; k < s1; k++) {
      const a = Math.abs(x[k]);
      if (a > m) m = a;
    }
    raw.push(m);
  }
  const max = Math.max(...raw, 1e-6);
  return raw.map((b) => Math.max(0.08, Math.round((b / max) * 10000) / 10000));
}

// ─────────────────────────── 작업 목록 ───────────────────────────

interface Job {
  /** 등록 키 (lib/audio-files.ts 의 키) */
  key: string;
  src: string;
  /** 사용할 이벤트 인덱스 (whole 이면 무시) */
  events?: number[];
  /** 이벤트 사이 간격(ms) */
  gapMs?: number;
  /** true 면 전체를 사용 (이벤트 분리 안 함) */
  whole?: boolean;
}

const JOBS: Job[] = [
  // ── UI 클릭 ──
  { key: "click",        src: "normalclick.wav", events: [0] },
  { key: "click-2",      src: "normalclick.wav", events: [1] },
  { key: "click-3",      src: "normalclick.wav", events: [2] },
  { key: "double-click", src: "doubleclick.wav", events: [6, 7], gapMs: 15 },
  { key: "triple-click", src: "doubleclick.wav", events: [6, 7, 8], gapMs: 15 },

  // ── 알림 ──
  { key: "notification", src: "notification_sound.wav", whole: true },
  { key: "bell",         src: "bell.wav", whole: true },

  // ── 소도구 (책) ──
  { key: "book-turn",   src: "turn_the_books_next1.wav", whole: true },
  { key: "book-pages",  src: "turn_the_books_next2.wav", events: [0, 1, 2], gapMs: 80 },

  // ── 물 ──
  { key: "water-drop",     src: "waterdrop1.wav", whole: true },
  { key: "water-drop-2",   src: "waterdrop2.wav", events: [0] },
  { key: "water-droplets", src: "waterdrop2.wav", events: [0, 8, 13], gapMs: 300 },

  // ── 날씨 ──
  { key: "thunder", src: "thunder.wav", whole: true },

  // ── 사람 ──
  { key: "laugh",    src: "laugh1.wav", whole: true },
  { key: "laughter", src: "laugh2.wav", whole: true },
  { key: "clap-1",   src: "clap1.wav", whole: true },
  { key: "clap-2",   src: "clap2.wav", whole: true },
];

// ─────────────────────────── 실행 ───────────────────────────

interface Entry {
  path: string;
  duration: number;
  bytes: number;
  bars: number[];
}

const registry: Record<string, Entry> = {};
const sourceCache = new Map<string, Parsed>();
const onsetCache = new Map<string, Event[]>();

function getSource(name: string): Parsed {
  let p = sourceCache.get(name);
  if (!p) {
    p = parseWav(readFileSync(join(SRC_DIR, name)));
    sourceCache.set(name, p);
    console.log(
      `\n${name} — ${p.sampleRate}Hz · ${p.channels}ch · ${(p.frames / p.sampleRate).toFixed(3)}s`,
    );
  }
  return p;
}

function getOnsets(name: string): Event[] {
  let e = onsetCache.get(name);
  if (!e) {
    e = detectOnsets(getSource(name).mono, getSource(name).sampleRate);
    onsetCache.set(name, e);
    console.log(`  이벤트 ${e.length}개 검출`);
  }
  return e;
}

mkdirSync(OUT_DIR, { recursive: true });

/**
 * 원본 녹음이 없는 환경(CI 등)에서는 조용히 건너뜁니다.
 *
 * public/audio/*.wav 와 lib/audio-files.ts 는 이미 저장소에 커밋돼 있으므로
 * 빌드에 이 스크립트가 꼭 필요하지는 않습니다. ENOENT 로 죽이면
 * 배포 파이프라인 전체가 깨집니다.
 */
const missing = JOBS.filter((job) => !existsSync(join(SRC_DIR, job.src)));
if (missing.length > 0) {
  console.warn(
    `\n원본 녹음 ${missing.length}/${JOBS.length}개를 ${SRC_DIR} 에서 찾지 못했습니다.\n` +
      `AUDIO_SRC_DIR 환경변수로 원본이 있는 디렉터리를 지정하면 됩니다.\n` +
      `이 파일들은 이미 public/audio/ 에 커밋되어 있으므로 건너뜁니다.\n`,
  );
  process.exit(0);
}

for (const job of JOBS) {
  const src = getSource(job.src);

  let cut: Float32Array;
  if (job.whole) {
    cut = src.mono;
  } else {
    const events = getOnsets(job.src);
    cut = extract(src.mono, src.sampleRate, job.events, events, job.gapMs ?? 20);
  }

  cut = trimSilence(cut, src.sampleRate);
  let out = resample(lowpass(cut), src.sampleRate, TARGET_SR);
  out = dcBlock(out);

  for (let i = 0; i < out.length; i++) {
    if (!Number.isFinite(out[i])) throw new Error(`${job.key}: ${i}번째 샘플이 ${out[i]}`);
  }

  const before = peakOf(out);
  if (before < 0.02) {
    throw new Error(`${job.key}: 변환 후 피크 ${before.toFixed(4)} — 필터가 뭉갠 의심`);
  }
  const scale = PEAK / before;
  for (let i = 0; i < out.length; i++) out[i] *= scale;

  const wav = encodeWav(out, TARGET_SR);
  writeFileSync(join(OUT_DIR, `${job.key}.wav`), wav);

  registry[job.key] = {
    path: `/audio/${job.key}.wav`,
    // 반올림하지 않는다 — 반올림하면 검증 시 1 샘플 차이가 생긴다
    duration: out.length / TARGET_SR,
    bytes: wav.length,
    bars: makeBars(out),
  };

  const clipped = out.reduce((n, v) => n + (Math.abs(v) >= 0.999 ? 1 : 0), 0);
  console.log(
    `  -> ${job.key.padEnd(16)} ${(out.length / TARGET_SR).toFixed(3)}s  ${wav.length.toLocaleString()}B  정규화 x${scale.toFixed(2)}  클리핑 ${clipped}`,
  );
}

// ── 등록 파일 자동 생성 ──
const lines: string[] = [
  "// 자동 생성 파일입니다 — scripts/import-audio.ts 가 만듭니다.",
  "// 직접 수정하지 마세요. 원본 녹음을 바꾸면 `npm run import:audio` 를 다시 돌리세요.",
  "",
  'import type { FileSound } from "./packs";',
  "",
  "export const AUDIO_FILES: Record<string, FileSound> = {",
];
for (const [key, v] of Object.entries(registry)) {
  lines.push(`  "${key}": {`);
  lines.push(`    path: ${JSON.stringify(v.path)},`);
  lines.push(`    duration: ${v.duration},`);
  lines.push(`    bytes: ${v.bytes},`);
  lines.push(`    bars: [${v.bars.join(", ")}],`);
  lines.push("  },");
}
lines.push("};");
lines.push("");
lines.push("/** 등록되지 않은 키면 개발 중에 즉시 드러나도록 던집니다 */");
lines.push("export function audioFile(key: keyof typeof AUDIO_FILES): FileSound {");
lines.push("  const entry = AUDIO_FILES[key];");
lines.push("  if (!entry) throw new Error(`알 수 없는 오디오 파일 키: ${key}`);");
lines.push("  return entry;");
lines.push("}");
lines.push("");

writeFileSync(REGISTRY, lines.join("\n"));
console.log(`\n${Object.keys(registry).length}개 등록 — lib/audio-files.ts 생성 완료`);