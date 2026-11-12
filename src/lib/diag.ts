import type { Diag } from "./support";

/** Thông tin kỹ thuật cơ bản đính kèm báo cáo. Không chứa nội dung hội thoại hay ID cuộc trò chuyện. */
export function baseDiag(): Diag {
  let version = "?";
  try { version = chrome.runtime.getManifest().version; } catch { /* chạy ngoài extension */ }
  const ua = navigator.userAgent.match(/(Chrome|Edg|Brave)\/[\d.]+/)?.[0] ?? "không rõ";
  return {
    "Phiên bản Nói Đi": version,
    "Trình duyệt": ua,
    "Hệ điều hành": navigator.platform,
    "Ngôn ngữ trình duyệt": navigator.language,
    "Thời gian": new Date().toISOString(),
  };
}
