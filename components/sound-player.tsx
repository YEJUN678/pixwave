"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SAMPLE_RATE,
  downloadBytes,
  renderSpec,
  slugifyFile,
  specToWav,
} from "@/lib/audio";
import { formatDuration } from "@/lib/format";
import { soundBars, soundDuration, type Sound } from "@/lib/packs";

/**
 * 동시에 하나만 재생되도록 하는 전역 레지스트리.
 * 목록에서 여러 개를 빠르게 눌러도 소리가 겹치지 않습니다.
 */
const activeStoppers = new Set<() => void>();

let sharedCtx: AudioContext | null = null;
function getContext(): AudioContext {
  if (!sharedCtx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    sharedCtx = new Ctor();
  }
  if (sharedCtx.state === "suspended") void sharedCtx.resume();
  return sharedCtx;
}

/** 파일 기반 사운드는 한 번만 받아 캐시한다 */
const fileBuffers = new Map<string, Promise<AudioBuffer>>();

function loadFile(ctx: AudioContext, path: string): Promise<AudioBuffer> {
  let pending = fileBuffers.get(path);
  if (!pending) {
    pending = fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`${path} 불러오기 실패 (${res.status})`);
        return res.arrayBuffer();
      })
      .then((buf) => ctx.decodeAudioData(buf));
    // 실패한 캐시는 다음 클릭 때 재시도할 수 있게 지운다
    pending.catch(() => fileBuffers.delete(path));
    fileBuffers.set(path, pending);
  }
  return pending;
}

export default function SoundPlayer({
  sound,
  accent = ["#7c5cff", "#22d3ee"],
  prefix,
  compact = false,
}: {
  sound: Sound;
  accent?: [string, string];
  /** 파일명 접두사 (팩 슬러그 등) */
  prefix?: string;
  compact?: boolean;
}) {
  const file = sound.file ?? null;
  const duration = soundDuration(sound);

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloaded, setDownloaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  /** 파일 로딩 중 다른 소리가 재생돼서 취소됐는지 확인용 */
  const tokenRef = useRef(0);

  const bars = useMemo(() => soundBars(sound, compact ? 26 : 44), [sound, compact]);

  const stop = useCallback(() => {
    tokenRef.current++; // 진행 중인 비동기 로딩을 무효화
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const src = sourceRef.current;
    sourceRef.current = null;
    if (src) {
      src.onended = null;
      try {
        src.stop();
      } catch {
        /* 이미 정지된 경우 */
      }
    }
    setPlaying(false);
    setLoading(false);
    setProgress(0);
  }, []);

  useEffect(() => {
    const stopper = () => stop();
    activeStoppers.add(stopper);
    return () => {
      activeStoppers.delete(stopper);
      stop();
    };
  }, [stop]);

  const startBuffer = useCallback(
    (ctx: AudioContext, buffer: AudioBuffer, token: number) => {
      if (tokenRef.current !== token) return;

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      sourceRef.current = src;

      startedAtRef.current = ctx.currentTime;
      setPlaying(true);

      const tick = () => {
        const elapsed = ctx.currentTime - startedAtRef.current;
        setProgress(Math.min(1, elapsed / buffer.duration));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      src.onended = () => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        sourceRef.current = null;
        setPlaying(false);
        setProgress(0);
      };
      src.start();
    },
    [],
  );

  const play = useCallback(() => {
    // 다른 사운드 정지
    activeStoppers.forEach((fn) => fn());
    activeStoppers.delete(stop);

    const ctx = getContext();
    const token = tokenRef.current;

    if (file) {
      setFailed(false);
      setLoading(true); // 실제 파일은 네트워크를 기다려야 한다
      loadFile(ctx, file.path)
        .then((buffer) => {
          if (tokenRef.current !== token) return;
          setLoading(false);
          startBuffer(ctx, buffer, token);
        })
        .catch(() => {
          if (tokenRef.current !== token) return;
          setFailed(true);
          setLoading(false);
          setPlaying(false);
        });
      return;
    }

    if (!sound.spec) return;
    const samples = renderSpec(sound.spec, ctx.sampleRate || SAMPLE_RATE);
    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
    startBuffer(ctx, buffer, token);
  }, [file, sound.spec, startBuffer, stop]);

  const handleDownload = useCallback(() => {
    const filename = `${prefix ? `${prefix}-` : ""}${slugifyFile(sound.id)}.wav`;

    if (file) {
      // 실제 파일은 그대로 내려받는다 (재합성할 이유가 없다)
      const a = document.createElement("a");
      a.href = file.path;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else if (sound.spec) {
      downloadBytes(specToWav(sound.spec), filename, "audio/wav");
    } else {
      return;
    }

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 1800);
  }, [file, sound.id, sound.spec, prefix]);

  const playedBars = Math.round(progress * bars.length);

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <button
        type="button"
        onClick={() => (playing || loading ? stop() : play())}
        aria-label={
          loading
            ? `${sound.name} 불러오는 중`
            : playing
              ? `${sound.name} 정지`
              : `${sound.name} 재생`
        }
        aria-pressed={playing}
        aria-busy={loading}
        className="group relative grid size-11 shrink-0 place-items-center rounded-full transition-transform duration-150 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-95"
        style={{
          backgroundImage: `linear-gradient(135deg, ${accent[0]}, ${accent[1]})`,
        }}
      >
        <span
          className="absolute inset-0 rounded-full opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-50"
          style={{
            backgroundImage: `linear-gradient(135deg, ${accent[0]}, ${accent[1]})`,
          }}
        />
        {loading ? (
          <svg viewBox="0 0 24 24" className="size-4 relative animate-spin" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : playing ? (
          <svg viewBox="0 0 24 24" className="size-4 relative" fill="currentColor" aria-hidden>
            <rect x="6" y="5" width="4" height="14" rx="1.2" />
            <rect x="14" y="5" width="4" height="14" rx="1.2" />
          </svg>
        ) : failed ? (
          <svg viewBox="0 0 24 24" className="size-4 relative" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 8v5m0 3h.01" strokeLinecap="round" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-4 relative translate-x-px" fill="currentColor" aria-hidden>
            <path d="M8 5.14v13.72c0 .8.87 1.28 1.55.85l10.3-6.86a1 1 0 0 0 0-1.7L9.55 4.29A1 1 0 0 0 8 5.14Z" />
          </svg>
        )}
      </button>

      {/* 높이가 auto 면 자식의 % 높이가 0이 되므로 반드시 고정 높이를 준다 */}
      <div className="flex h-9 min-w-0 flex-1 items-center gap-[2px]" aria-hidden>
        {bars.map((height, i) => (
          <span
            key={i}
            className="w-full min-w-px rounded-full transition-colors duration-100"
            style={{
              height: `${Math.max(8, height * 100)}%`,
              backgroundColor:
                i < playedBars ? accent[1] : "rgba(255,255,255,0.16)",
            }}
          />
        ))}
      </div>

      <span className="w-10 shrink-0 text-right font-mono text-xs text-mute tabular-nums">
        {formatDuration(duration)}
      </span>

      <button
        type="button"
        onClick={handleDownload}
        title={`${sound.id}.wav 내려받기`}
        aria-label={`${sound.name} WAV 파일 내려받기`}
        className="grid size-9 shrink-0 place-items-center rounded-lg border border-ink-700 bg-ink-850 text-mute transition-colors hover:border-ink-600 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {downloaded ? (
          <svg viewBox="0 0 24 24" className="size-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 17v1.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V17" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </div>
  );
}