import type { Metadata } from "next";
import BrowseGrid from "@/components/browse-grid";
import AdSlot from "@/components/ad-slot";
import { PACKS, TOTAL_SOUNDS } from "@/lib/packs";

export const metadata: Metadata = {
  title: "전체 사운드 팩",
  description: `알림음, UI, 게임 효과음, 벨소리, 충전음까지 총 ${TOTAL_SOUNDS}개의 무료 사운드를 팩 단위로 확인하고 받으세요.`,
  alternates: { canonical: "/packs" },
};

export default function PacksPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <header className="max-w-2xl">
        <p className="font-mono text-xs tracking-[0.18em] text-brand uppercase">
          전체 팩
        </p>
        <h1 className="mt-2.5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {PACKS.length}개 팩, {TOTAL_SOUNDS}개 사운드
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-mute sm:text-base">
          재생 버튼을 눌러서 먼저 듣고, 마음에 드는 팩만 받아가세요.
          검색은 팩 이름뿐 아니라 개별 사운드 이름과 태그까지 함께 훑습니다.
        </p>
      </header>

      <div className="mt-10">
        <BrowseGrid packs={PACKS} />
      </div>

      <div className="mt-14">
        <AdSlot format="horizontal" />
      </div>
    </div>
  );
}