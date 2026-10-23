import { parseHTML } from "linkedom";
import { imageSource, isImageDestination, positiveDimension, safeImageUrl } from "./images.js";
import { decodeMarker } from "./markers.js";
import { videoSource } from "./videos.js";
import { youtubeSource } from "./youtube.js";

import type { BlockMetadata, ImageMetadata, PopcaseConfig } from "./types.js";

interface EnhanceOptions extends BlockMetadata {
  base: string;
  publicUrl?: (key: string) => string;
  config: PopcaseConfig;
  knownSources?: string[];
}

export function enhanceHtml(html: string, { nodes = [], base, publicUrl, config, inline = false, knownSources = [] }: EnhanceOptions): string {
  const { document } = parseHTML(`<html><body>${html}</body></html>`);
  const sources = nodes.map((node) => node?.source ?? imageSource(node, base, publicUrl));
  const figures = Array.from(document.querySelectorAll("figure.emdash-image, figure.emdash-gallery-item"));
  const entries: { img: HTMLImageElement | null; node?: ImageMetadata; index?: number }[] = inline
    ? Array.from(document.querySelectorAll<HTMLImageElement>("a[href] img")).map((img) => ({ img }))
    : figures.map((figure, index) => ({ img: figure.querySelector<HTMLImageElement>("img"), node: nodes[index], index }));

  for (const { img, node, index } of entries) {
    if (!img) continue;
    const link = img.closest("a");
    const source = index === undefined ? undefined : sources[index];
    const href = link?.getAttribute("href");
    if (href && !isImageDestination(href, base, [...knownSources, ...sources].filter((value): value is string => Boolean(value)))) continue;
    const src = safeImageUrl(href ?? source, base);
    if (!src) continue;
    const anchor = link ?? document.createElement("a");
    if (!link) {
      img.replaceWith(anchor);
      anchor.appendChild(img);
      anchor.setAttribute("href", src);
    }
    const sameSource = !href || safeImageUrl(href, base) === source;
    const width = sameSource ? positiveDimension(node?.width ?? node?.asset?.width) : undefined;
    const height = sameSource ? positiveDimension(node?.height ?? node?.asset?.height) : undefined;
    const caption = node?.caption ?? img.closest("figure")?.querySelector("figcaption")?.textContent ?? "";
    anchor.setAttribute("data-popcase", JSON.stringify({
      src, alt: node?.alt ?? img.getAttribute("alt") ?? "", description: caption,
      ...(width && height ? { width, height } : {}),
    }));
    anchor.setAttribute("data-popcase-config", JSON.stringify(config));
    anchor.setAttribute("aria-label", `Open image${img.getAttribute("alt") ? `: ${img.getAttribute("alt")}` : ""}`);
  }
  return document.body.innerHTML;
}

export function enhanceResponse(html: string, base: string): string {
  let config: PopcaseConfig | undefined;
  const content = html.replace(/<template data-popcase-page>([^<]*)<\/template>/g, (_, encoded) => {
    try { config = decodeMarker<PopcaseConfig>(encoded); } catch { config = undefined; }
    return "";
  });
  const blocks = /<!--popcase:([^>]*)-->([\s\S]*?)<!--\/popcase-->/g;
  const knownSources: string[] = [];
  for (const match of content.matchAll(blocks)) {
    try {
      knownSources.push(...(decodeMarker<BlockMetadata>(match[1]).nodes ?? []).map((node) => node.source).filter((value): value is string => Boolean(value)));
    } catch { /* Invalid markers leave the original block unchanged. */ }
  }
  const output = content.replace(blocks, (_, encoded, markup) => {
    if (!config) return markup;
    try {
      const metadata = decodeMarker<BlockMetadata>(encoded);
      return enhanceHtml(markup, { ...metadata, base, config, knownSources });
    } catch { return markup; }
  });
  if (!config) return output;
  const { document } = parseHTML(output);
  let changed = false;
  for (const anchor of document.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    if (anchor.hasAttribute("data-popcase") || anchor.hasAttribute("download") ||
        anchor.closest('[contenteditable="true"], .emdash-inline-editor, figure.emdash-video, [data-popcase-root]')) continue;
    const youtube = youtubeSource(anchor.getAttribute("href"), base);
    const source = youtube ? undefined : videoSource(anchor.getAttribute("href"), base);
    if (!source && !youtube) continue;
    const img = anchor.querySelector("img");
    const poster = safeImageUrl(img?.getAttribute("src"), base);
    const alt = img?.getAttribute("alt") ?? anchor.textContent?.trim() ?? "";
    const description = anchor.closest("figure")?.querySelector("figcaption")?.textContent ?? "";
    anchor.setAttribute("data-popcase", JSON.stringify({
      ...(youtube ? { type: "youtube", ...youtube } : { type: "video", src: source!.src, sources: [source!] }),
      alt, description,
      ...(poster ? { poster } : {}),
    }));
    anchor.setAttribute("data-popcase-config", JSON.stringify(config));
    anchor.setAttribute("aria-label", `Open video${alt ? `: ${alt}` : ""}`);
    changed = true;
  }
  return changed ? document.toString() : output;
}
