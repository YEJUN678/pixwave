"use client";

import { useEffect, useState } from "react";
import { slugifyFile, specToWav } from "@/lib/audio";
import { createZip } from "@/lib/zip";
import { LICENSES } from "@/lib/site";
import type { Pack, Sound } from "@/lib/packs";

/** 파일 기반 사운드는 합성하지 않고 그대로 바이트를 읽는다 */
async function soundBytes(sound: Sound): Promise<Uint8Array> {
  if (sound.file) {
    const res = await fetch(sound.file.path);
    if (!res.ok) throw new Error(`${sound.file.path} 읽기 실패 (${res.status})`);
    return new Uint8Array(await res.arrayBuffer());
  }
  return sound.spec ? specToWav(sound.spec) : new Uint8Array(0);
}

function buildLicenseText(pack: Pack): string {
  const license = LICENSES[pack.license];
  const lines = [
    `Pixwave 사운드 팩 — ${pack.name} (${pack.nameEn})`,
    "",
    `라이선스: ${license.name}`,
    `자세히: ${license.url}`,
    "",
    "조건",
    ` - ${license.summary}`,
    " - 이 팩의 WAV 파일은 수정 없이 사용해도 됩니다.",
    " - 재배포를 하려면 아래 출처를 함께 적어 주세요:",
    "   https://pixwave.example.com/packs/" + pack.slug,
    "",
    `포함 사운드 (${pack.sounds.length}개)`,
    ...pack.sounds.map(
      (s, i) =>
        `  ${String(i + 1).padStart(2, "0")}. ${s.name} (${s.nameEn}) — ${s.id}.wav${s.file ? "  [실제 녹음]" : ""}`,
    ),
    "",
    "포맷: 44.1kHz / 16bit / Mono PCM WAV",
  ];
  return lines.join("\n");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DownloadPack({
  pack,
  className = "",
}: {
  pack: Pack;
  className?: string;
}) {
  const [size, setSize] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");

  // 버튼에 용량을 미리 표시하기 위해 미리 계산
  useEffect(() => {
    let cancelled = false;
    const encoder = new TextEncoder();

    const compute = async () => {
      let total = encoder.encode(buildLicenseText(pack)).length;
      for (const sound of pack.sounds) {
        if (sound.file) {
          // 파일은 헤더 크기를 알고 있으므로 fetch 없이 계산
          total += sound.file.bytes;
        } else {
          total += specToWav(sound.spec!).length;
        }
      }
      total += pack.sounds.length * 180; // ZIP 오버헤드 감안
      if (!cancelled) setSize(total);
    };

    const idle = (
      window as unknown as {
        requestIdleCallback?: (cb: () => void) => number;
      }
    ).requestIdleCallback;
    if (idle) idle(() => void compute());
    else window.setTimeout(() => void compute(), 250);

    return () => {
      cancelled = true;
    };
  }, [pack]);

  const handleDownload = async () => {
    setState("working");
    try {
      const encoder = new TextEncoder();
      const entries = await Promise.all(
        pack.sounds.map(async (sound) => ({
          name: `wav/${sound.id}.wav`,
          data: await soundBytes(sound),
        })),
      );
      entries.push({
        name: "LICENSE.txt",
        data: encoder.encode(buildLicenseText(pack)),
      });

      const zip = createZip(entries);
      const blob = new Blob([zip as unknown as BlobPart], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pack.slug}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);

      setState("done");
      setTimeout(() => setState("idle"), 2200);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleDownload()}
      disabled={state === "working"}
      className={`group inline-flex items-center gap-2.5 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink-950 transition-all hover:shadow-[0_8px_30px_rgba(255,255,255,0.15)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 ${className}`}
    >
      {state === "done" ? (
        <svg viewBox="0 0 24 24" className="size-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : state === "error" ? (
        <svg viewBox="0 0 24 24" className="size-4 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 8v5m0 3h.01" strokeLinecap="round" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 17v1.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V17" strokeLinecap="round" />
        </svg>
      )}
      <span>
        {state === "working"
          ? "패킹 중…"
          : state === "done"
            ? "내려받기 완료"
            : state === "error"
              ? "실패 — 다시 시도"
              : `전체 ${pack.sounds.length}개 받기`}
      </span>
      {size !== null && state === "idle" && (
        <span className="font-mono text-xs font-normal opacity-55">
          ZIP {formatBytes(size)}
        </span>
      )}
    </button>
  );
}