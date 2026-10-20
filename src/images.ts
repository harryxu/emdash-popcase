import type { MediaNode } from "./types.js";

const imageExtension = /\.(?:avif|gif|jpe?g|png|webp|svg|bmp|ico)$/i;
const mediaRoute = "/_emdash/api/media/file/";
const safeKey = /^[A-Za-z0-9._-]+$/;

export function safeImageUrl(value: unknown, base: string): string | undefined {
  if (typeof value !== "string" || !value.trim() || value.trim().startsWith("#")) return undefined;
  try {
    const url = new URL(value, base);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function isImageDestination(value: unknown, base: string, knownSources: string[] = []): boolean {
  const href = safeImageUrl(value, base);
  if (!href) return false;
  if (knownSources.some((source) => safeImageUrl(source, base) === href)) return true;
  const url = new URL(href);
  if (imageExtension.test(url.pathname)) return true;
  // Extensionless local media IDs are image destinations only when known from
  // an image reference. The same media endpoint also serves non-image files.
  return false;
}

export function imageSource(node: MediaNode | undefined, base: string, publicUrl?: (key: string) => string): string | undefined {
  const asset = node?.asset;
  if (!asset) return undefined;
  if (asset.provider && asset.provider !== "local") return safeImageUrl(asset.url ?? asset.src, base);
  const storageKey = asset.meta?.storageKey ?? node?.meta?.storageKey;
  const url = asset.url ?? asset.src;
  const id = asset._ref ?? asset.id;
  if (!url && typeof storageKey === "string" && safeKey.test(storageKey)) {
    return safeImageUrl(publicUrl?.(storageKey) ?? `${mediaRoute}${storageKey}`, base);
  }
  if (typeof url === "string" && url.startsWith(mediaRoute)) {
    const key = url.slice(mediaRoute.length);
    if (safeKey.test(key)) return safeImageUrl(publicUrl?.(key) ?? url, base);
  }
  return safeImageUrl(url ?? (id ? `${mediaRoute}${encodeURIComponent(id)}` : undefined), base);
}

export function positiveDimension(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}
