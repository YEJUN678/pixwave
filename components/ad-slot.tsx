/**
 * 광고 슬롯 — clickmon 배너로 연결되어 있습니다.
 * 위치는 그대로 두되, "DOWNLOAD 직전/후" 구역에 두는 편이 단가가 높습니다.
 */
import { ClickmonBanner } from "./clickmon-ads";

export default function AdSlot({
  format = "horizontal",
}: {
  format?: "horizontal" | "in-article";
  /** 예약되어 있지만 배너는 이 값을 쓰지 않습니다 */
  label?: string;
}) {
  return <ClickmonBanner format={format} />;
}
