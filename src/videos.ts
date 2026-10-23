import { safeImageUrl } from "./images.js";

const videoTypes: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
};

export function videoSource(
  value: unknown,
  base: string,
): { src: string; type: string } | undefined {
  const src = safeImageUrl(value, base);
  if (!src) return undefined;
  const extension = new URL(src).pathname.match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase();
  const type = extension && videoTypes[extension];
  return type ? { src, type } : undefined;
}
