import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-5 py-32 text-center">
      <p className="font-mono text-sm tracking-[0.2em] text-brand">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
        찾으시는 사운드가 없어요
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-mute">
        주소가 바뀌었거나 삭제된 팩일 수 있어요. 전체 목록에서 다시 찾아보세요.
      </p>
      <Link
        href="/packs"
        className="mt-8 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-ink-950 transition-opacity hover:opacity-90"
      >
        전체 팩 보기
      </Link>
    </div>
  );
}