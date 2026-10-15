/**
 * 생성되는 WAV / ZIP 바이트와 사운드 자체의 음향 타당성을 검증합니다.
 * 실행: npm run verify
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderSpec, specToWav } from "../lib/audio";
import { createZip } from "../lib/zip";
import {
  PACKS,
  CATEGORIES,
  TOTAL_SOUNDS,
  packsByCategory,
  soundBars,
  soundDuration,
  type Sound,
} from "../lib/packs";

const OUT = join(process.cwd(), ".verify");
mkdirSync(OUT, { recursive: true });

let failures = 0;
const warnings: string[] = [];
const fail = (msg: string) => {
  failures++;
  console.error(`  [FAIL] ${msg}`);
};
const warn = (msg: string) => warnings.push(msg);

console.log(
  `\nPixwave 검증 — ${PACKS.length}개 팩 · ${TOTAL_SOUNDS}개 사운드 · ${CATEGORIES.length}개 카테고리\n`,
);

// ─────────────────────────── 측정 ───────────────────────────

/** Goertzel — 특정 주파수 하나의 전력 */
function goertzelPower(samples: Float32Array, sr: number, freq: number): number {
  const stride = Math.max(1, Math.floor(samples.length / 12000));
  const n = Math.floor(samples.length / stride);
  if (n < 8) return 0;

  // 표본을 건너뛰며 읽으므로 실제 표본레이트는 sr/stride
  const effSr = sr / stride;
  const k = Math.round((n * freq) / effSr);
  if (k < 1 || k >= n / 2) return 0;

  const w = (2 * Math.PI * k) / n;
  const coeff = 2 * Math.cos(w);
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < samples.length; i += stride) {
    const s0 = samples[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return Math.max(0, s1 * s1 + s2 * s2 - coeff * s1 * s2) / n;
}

function countClipped(samples: Float32Array, at: number): number {
  let c = 0;
  for (const v of samples) if (Math.abs(v) >= at) c++;
  return c;
}

function analyse(samples: Float32Array, sr: number) {
  let peak = 0;
  let sumSq = 0;
  let bad = 0;
  let dc = 0;
  let firstActive = -1;
  let lastActive = -1;

  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    if (!Number.isFinite(v)) bad++;
    const a = Math.abs(v);
    if (a > peak) peak = a;
    sumSq += v * v;
    dc += v;
  }

  // 소리가 나는 구간만 찾아 무음 꼬리를 지표에서 제외한다
  const gate = peak * 0.05;
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) > gate) {
      if (firstActive < 0) firstActive = i;
      lastActive = i;
    }
  }

  let activeSq = 0;
  let activeCount = 0;
  for (let i = Math.max(firstActive, 0); i >= 0 && i <= lastActive; i++) {
    activeSq += samples[i] * samples[i];
    activeCount++;
  }
  const activeRms = activeCount > 0 ? Math.sqrt(activeSq / activeCount) : 0;

  const bands: { f: number; p: number }[] = [];
  for (let i = 0; i < 16; i++) {
    const f = 55 * Math.pow(16000 / 55, i / 15);
    bands.push({ f, p: goertzelPower(samples, sr, f) });
  }
  const totalP = bands.reduce((s, b) => s + b.p, 0);
  const centroid = totalP > 0 ? bands.reduce((s, b) => s + b.f * b.p, 0) / totalP : 0;

  // 음향 에너지가 시간축 어디에 몰려 있는지 (0 = 맨 앞, 1 = 맨 뒤)
  let num = 0;
  let den = 0;
  const N = 64;
  for (let b = 0; b < N; b++) {
    let e = 0;
    const s0 = Math.floor((b * samples.length) / N);
    const s1 = Math.floor(((b + 1) * samples.length) / N);
    for (let i = s0; i < s1; i++) e += samples[i] * samples[i];
    const pos = (b + 0.5) / N;
    num += e * pos;
    den += e;
  }
  const energyCentroidTime = den > 0 ? num / den : 0;

  // 고에너지 블록이 전체 시간轴 어디에 퍼져 있는지 — 흩뿌린(파열·박수) 사운드 판별용
  const peaks: number[] = [];
  for (let b = 0; b < N; b++) {
    let e = 0;
    const s0 = Math.floor((b * samples.length) / N);
    const s1 = Math.floor(((b + 1) * samples.length) / N);
    for (let i = s0; i < s1; i++) e += samples[i] * samples[i];
    peaks.push(e);
  }
  const meanE = peaks.reduce((a, b) => a + b, 0) / N;
  const bigBlocks = peaks.filter((e) => e > meanE * 2).length;
  const sparse = bigBlocks >= 2 && bigBlocks <= N * 0.5 && energyCentroidTime < 0.35;

  return {
    peak,
    rms: Math.sqrt(sumSq / samples.length),
    durationSec: samples.length / sr,
    activeRatio: activeCount / samples.length,
    activeRms,
    crest: activeRms > 0 ? peak / activeRms : 0,
    centroid,
    energyCentroidTime,
    sparse,
    dc: dc / samples.length,
    bad,
  };
}

// ───────────────────── 1. 전수 검증 ─────────────────────

console.log("[1] 전수 검증 (합성 + 실제 파일)");
let minDur = Infinity;
let maxDur = 0;
let totalSeconds = 0;
let fileSoundCount = 0;
const perCat = new Map<string, number>();
const synth = { count: 0, centroidSum: 0, crestSum: 0, longCount: 0, longCrestSum: 0, longActiveSum: 0 };
const file = { count: 0, centroidSum: 0, crestSum: 0, clipSamples: 0, totalSamples: 0 };

/** 합성과 파일에 공통으로 적용하는 타당성 검사 */
function checkAudio(
  where: string,
  m: ReturnType<typeof analyse>,
  isFile: boolean,
) {
  // 1초 미만은 짧은 타격·클릭이라 에너지가 초반에 몰리는 게 정상이다
  const isShort = m.activeRatio < 0.001 && m.durationSec < 1;
  if (m.bad > 0) fail(`${where}: NaN/Inf ${m.bad}개`);
  if (m.peak < 0.5) fail(`${where}: 피크 ${m.peak.toFixed(3)} — 소리가 너무 작음`);
  if (m.peak > 0.999) fail(`${where}: 피크 ${m.peak.toFixed(3)} — 클리핑`);
  if (m.rms < 0.004) fail(`${where}: RMS ${m.rms.toFixed(4)} — 사실상 무음`);
  if (Math.abs(m.dc) > 0.01) fail(`${where}: DC 오프셋 ${m.dc.toFixed(4)}`);
  if (m.activeRatio < 0.02) {
    fail(`${where}: 활성 구간 ${(m.activeRatio * 100).toFixed(1)}% — 지나치게 짧음`);
  }

  // 크레스트 팩터. 스파이크가 많은 실제 녹음은 값이 크다.
  // (박수·폭죽·웃음이 여기 걸리는 게 정상이므로 한계를 넉넉히 둔다)
  const crestLimit = isFile ? 22 : 14;
  if (m.crest < 1.15) {
    fail(`${where}: 크레스트 ${m.crest.toFixed(2)} — 거친 노이즈만 (딱딱함)`);
  } else if (m.crest > crestLimit) {
    fail(`${where}: 크레스트 ${m.crest.toFixed(2)} — 한계(${crestLimit}) 초과`);
  }

  // 지속음이어야 하는데 앞쪽에 몰려 있으면 중간에 죽은 것
  if (m.energyCentroidTime < 0.12 && !m.sparse) {
    fail(
      `${where}: 에너지가 앞쪽 ${(m.energyCentroidTime * 100).toFixed(0)}% 에 몰림 — 지속음처럼 들려야 하는데 끊김`,
    );
  }
  if (m.energyCentroidTime < 0.06 && !isShort) {
    warn(
      `${where}: 에너지가 초반에 몰려 있음 (${(m.energyCentroidTime * 100).toFixed(0)}%)`,
    );
  }

  if (m.activeRms < 0.05) {
    warn(`${where}: 활성 RMS ${m.activeRms.toFixed(3)} — 다른 소리보다 작게 들릴 수 있음`);
  }
  if (m.centroid < 45) {
    fail(`${where}: 스펙트럼 중심 ${m.centroid.toFixed(0)}Hz — 저역만 (안 들림)`);
  } else if (m.centroid > 13000) {
    warn(`${where}: 스펙트럼 중심 ${m.centroid.toFixed(0)}Hz — 매우 높은 편`);
  }
}

/** 파일 기반 사운드 검증 */
function checkFileSound(where: string, sound: Sound) {
  if (sound.spec) fail(`${where}: spec 과 file 을 동시에 가짐`);
  fileSoundCount++;

  const f = sound.file!;
  const filePath = join(process.cwd(), "public", f.path);

  if (!existsSync(filePath)) {
    fail(`${where}: 파일 없음 ${f.path}`);
    return;
  }

  const buf = readFileSync(filePath);
  if (buf.length !== f.bytes) fail(`${where}: 파일 크기 ${buf.length} != 등록값 ${f.bytes}`);
  if (buf.toString("ascii", 0, 4) !== "RIFF") fail(`${where}: RIFF 아님`);
  if (buf.toString("ascii", 8, 12) !== "WAVE") fail(`${where}: WAVE 아님`);

  const sr = buf.readUInt32LE(24);
  const ch = buf.readUInt16LE(22);
  const bits = buf.readUInt16LE(34);
  if (sr !== 44100) fail(`${where}: ${sr}Hz — 44100 이어야 함`);
  if (ch !== 1) fail(`${where}: ${ch}ch — 모노여야 함`);
  if (bits !== 16) fail(`${where}: ${bits}bit — 16bit 이어야 함`);

  const dataSize = buf.readUInt32LE(40);
  if (buf.length !== 44 + dataSize) fail(`${where}: data 청크 크기 불일치`);
  // 1 샘플 오차까지는 부동소수점 반올림 차이로 본다
  if (Math.abs(dataSize / 2 / 44100 - f.duration) > 1 / 44100) {
    fail(
      `${where}: 길이 ${(dataSize / 2 / 44100).toFixed(4)}s != 등록값 ${f.duration.toFixed(4)}s`,
    );
  }

  const frames = dataSize / 2;
  const pcm = new Float32Array(frames);
  for (let i = 0; i < frames; i++) pcm[i] = buf.readInt16LE(44 + i * 2) / 32768;

  const m = analyse(pcm, 44100);
  checkAudio(where, m, true);

  file.count++;
  file.centroidSum += m.centroid;
  file.crestSum += m.crest;
  file.clipSamples += countClipped(pcm, 0.999);
  file.totalSamples += frames;

  const bars = soundBars(sound, 44);
  if (bars.length !== 44 || bars.some((b) => !Number.isFinite(b) || b < 0 || b > 1)) {
    fail(`${where}: 등록된 파형 바 값 이상`);
  }
}

for (const pack of PACKS) {
  const seenIds = new Set<string>();

  for (const sound of pack.sounds) {
    const where = `${pack.slug}/${sound.id}`;
    if (seenIds.has(sound.id)) fail(`${where}: 팩 내 사운드 id 중복`);
    seenIds.add(sound.id);

    const dur = soundDuration(sound);
    minDur = Math.min(minDur, dur);
    maxDur = Math.max(maxDur, dur);
    totalSeconds += dur;
    perCat.set(pack.category, (perCat.get(pack.category) ?? 0) + 1);

    if (sound.file) {
      checkFileSound(where, sound);
      continue;
    }

    if (!sound.spec) {
      fail(`${where}: spec 도 file 도 없음`);
      continue;
    }

    const samples = renderSpec(sound.spec);
    const expected = Math.floor(sound.spec.duration * 44100);
    if (samples.length !== expected) fail(`${where}: 샘플 수 ${samples.length} != ${expected}`);

    const m = analyse(samples, 44100);
    checkAudio(where, m, false);

    const bars = soundBars(sound, 44);
    if (bars.length !== 44 || bars.some((b) => !Number.isFinite(b) || b < 0 || b > 1)) {
      fail(`${where}: 파형 바 값 이상`);
    }

    synth.count++;
    synth.centroidSum += m.centroid;
    synth.crestSum += m.crest;
    if (sound.spec.duration >= 1.5) {
      synth.longCount++;
      synth.longCrestSum += m.crest;
      synth.longActiveSum += m.activeRatio;
    }
  }
}

// 카테고리 무결성
const catSlugs = new Set(CATEGORIES.map((c) => c.slug));
for (const pack of PACKS) {
  if (!catSlugs.has(pack.category)) fail(`${pack.slug}: 없는 카테고리 '${pack.category}'`);
}
for (const cat of CATEGORIES) {
  if (packsByCategory(cat.slug).length === 0) fail(`카테고리 '${cat.slug}': 팩이 없음`);
}

console.log(
  `  합성 ${synth.count}개 · 실제파일 ${file.count}개 — 길이 ${minDur.toFixed(2)}s ~ ${maxDur.toFixed(2)}s, 총 ${Math.round(totalSeconds)}s`,
);
console.log(
  `  합성 평균: 스펙트럼 중심 ${(synth.centroidSum / synth.count).toFixed(0)}Hz · 크레스트 ${(synth.crestSum / synth.count).toFixed(2)}`,
);
if (file.count > 0) {
  console.log(
    `  파일 평균: 스펙트럼 중심 ${(file.centroidSum / file.count).toFixed(0)}Hz · 크레스트 ${(file.crestSum / file.count).toFixed(2)}`,
  );
  console.log(
    `  파일 클리핑: ${file.clipSamples.toLocaleString()} / ${file.totalSamples.toLocaleString()} 샘플 (${((file.clipSamples / file.totalSamples) * 100).toFixed(3)}%)`,
  );
}
if (synth.longCount > 0) {
  console.log(
    `  긴 합성 사운드 ${synth.longCount}개 — 평균 크레스트 ${(synth.longCrestSum / synth.longCount).toFixed(2)}, 평균 활성 비율 ${((synth.longActiveSum / synth.longCount) * 100).toFixed(0)}%`,
  );
}

// ───────────────────── 2. WAV 헤더 ─────────────────────

console.log("\n[2] 합성 WAV 헤더");
const ascii = (b: Uint8Array, start: number, len: number) =>
  String.fromCharCode(...b.slice(start, start + len));

let checkedWav = 0;
for (const pack of PACKS) {
  for (const sound of pack.sounds) {
    if (!sound.spec) continue;
    const wav = specToWav(sound.spec);
    const v = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
    const n = Math.floor(sound.spec.duration * 44100);

    if (ascii(wav, 0, 4) !== "RIFF") fail(`${sound.id}: RIFF 없음`);
    if (ascii(wav, 8, 4) !== "WAVE") fail(`${sound.id}: WAVE 없음`);
    if (ascii(wav, 12, 4) !== "fmt ") fail(`${sound.id}: fmt 없음`);
    if (v.getUint16(20, true) !== 1) fail(`${sound.id}: PCM 아님`);
    if (v.getUint16(22, true) !== 1) fail(`${sound.id}: 모노 아님`);
    if (v.getUint32(24, true) !== 44100) fail(`${sound.id}: 44.1kHz 아님`);
    if (v.getUint16(34, true) !== 16) fail(`${sound.id}: 16bit 아님`);
    if (ascii(wav, 36, 4) !== "data") fail(`${sound.id}: data 없음`);
    if (v.getUint32(40, true) !== n * 2) fail(`${sound.id}: data 크기 불일치`);
    if (v.getUint32(4, true) !== wav.length - 8) fail(`${sound.id}: RIFF 크기 불일치`);
    if (wav.length !== 44 + n * 2) fail(`${sound.id}: 총 길이 불일치`);
    checkedWav++;
  }
}
console.log(`  ${checkedWav}개 WAV 헤더/크기 통과`);

const firstSynth = PACKS.flatMap((p) => p.sounds).find((s) => s.spec);
if (firstSynth?.spec) {
  writeFileSync(join(OUT, `${firstSynth.id}.wav`), specToWav(firstSynth.spec));
}

// ───────────────────── 3. ZIP 구조 ─────────────────────

console.log("\n[3] ZIP 패키징");
const encoder = new TextEncoder();
const entries = PACKS.flatMap((pack) =>
  pack.sounds.map((sound) => ({
    name: `${pack.slug}/wav/${sound.id}.wav`,
    // Node 에서는 fetch 가 없으므로 파일은 직접 읽는다
    data: sound.file
      ? readFileSync(join(process.cwd(), "public", sound.file.path))
      : specToWav(sound.spec!),
  })),
);
entries.push({ name: "LICENSE.txt", data: encoder.encode("Pixwave test license\n") });

const zip = createZip(entries);
const zv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);

if (zv.getUint32(0, true) !== 0x04034b50) fail("로컬 파일 헤더 없음");
const eocd = zip.length - 22;
if (zv.getUint32(eocd, true) !== 0x06054b50) fail("EOCD 없음");
if (zv.getUint16(eocd + 10, true) !== entries.length) fail("엔트리 수 불일치");
if (zv.getUint32(eocd + 16, true) + zv.getUint32(eocd + 12, true) !== eocd) {
  fail("중앙 디렉터리 오프셋 불일치");
}
writeFileSync(join(OUT, "all-packs.zip"), zip);
console.log(`  ${entries.length}개 항목, ${(zip.length / 1024 / 1024).toFixed(1)} MB`);

// ───────────────────── 4. 분포 ─────────────────────

console.log("\n[4] 카테고리 분포");
for (const cat of CATEGORIES) {
  const count = perCat.get(cat.slug) ?? 0;
  const packs = packsByCategory(cat.slug).length;
  console.log(
    `  ${cat.name.padEnd(16)} 팩 ${String(packs).padStart(2)}개 · 사운드 ${String(count).padStart(3)}개`,
  );
  if (count < 10) warn(`카테고리 '${cat.slug}': 사운드 ${count}개 — 10개 미만`);
}

console.log(
  `\n총 사운드 ${TOTAL_SOUNDS}개 · 팩 ${PACKS.length}개 · 카테고리 ${CATEGORIES.length}개`,
);
if (TOTAL_SOUNDS < 300) fail(`사운드가 300개 미만: ${TOTAL_SOUNDS}개`);

if (warnings.length > 0) {
  console.log(`\n! 경고 ${warnings.length}건`);
  for (const w of warnings.slice(0, 12)) console.log(`  [WARN] ${w}`);
  if (warnings.length > 12) console.log(`  ... 외 ${warnings.length - 12}건`);
}

console.log(
  failures === 0 ? `\nOK 모든 검증 통과\n` : `\nFAIL ${failures}건 실패\n`,
);
process.exit(failures === 0 ? 0 : 1);