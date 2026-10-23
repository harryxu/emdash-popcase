import { safeImageUrl } from "./images.js";

function startSeconds(value: string | null): number | undefined {
  if (!value) return undefined;
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(value);
  const seconds = /^\d+$/.test(value)
    ? Number(value)
    : match
      ? Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)
      : NaN;
  return Number.isSafeInteger(seconds) && seconds >= 0 ? seconds : undefined;
}

export function youtubeSource(value: unknown, base: string) {
  const src = safeImageUrl(value, base);
  if (!src) return undefined;
  const url = new URL(src);
  if (url.port) return undefined;
  let videoId: string | null | undefined;
  let shorts = false;
  if (url.hostname === "youtu.be") {
    videoId = /^\/([\w-]{11})\/?$/.exec(url.pathname)?.[1];
  } else if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
    if (url.pathname === "/watch") videoId = url.searchParams.get("v");
    else {
      videoId = /^\/shorts\/([\w-]{11})\/?$/.exec(url.pathname)?.[1];
      shorts = Boolean(videoId);
    }
  }
  if (!videoId || !/^[\w-]{11}$/.test(videoId)) return undefined;
  const fragment = new URLSearchParams(url.hash.slice(1));
  const start =
    startSeconds(url.searchParams.get("t")) ??
    startSeconds(url.searchParams.get("start")) ??
    startSeconds(fragment.get("t")) ??
    startSeconds(fragment.get("start")) ??
    0;
  return { src, videoId, shorts, start };
}

export function youtubeEmbedUrl(
  { videoId, start }: { videoId: string; start: number },
  videoAutoplay = true,
): string {
  const url = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
  url.search = new URLSearchParams({
    autoplay: videoAutoplay ? "1" : "0",
    playsinline: "1",
    controls: "1",
    fs: "0",
    hl: "en",
    start: String(start),
  }).toString();
  return url.href;
}
