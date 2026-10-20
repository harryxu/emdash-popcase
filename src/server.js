import { parseHTML } from "linkedom";
import { imageSource, isImageDestination, positiveDimension, safeImageUrl } from "./images.js";
import { resolveLabels } from "./options.js";
import { decodeMarker } from "./markers.js";

export function enhanceHtml(html, { nodes = [], base, publicUrl, config, inline = false, knownSources = [] }) {
  const { document } = parseHTML(`<html><body>${html}</body></html>`);
  const sources = nodes.map((node) => node?.source ?? imageSource(node, base, publicUrl));
  const figures = Array.from(document.querySelectorAll("figure.emdash-image, figure.emdash-gallery-item"));
  const entries = inline
    ? Array.from(document.querySelectorAll("a[href] img")).map((img) => ({ img }))
    : figures.map((figure, index) => ({ img: figure.querySelector("img"), node: nodes[index], index }));

  for (const { img, node, index } of entries) {
    if (!img) continue;
    const link = img.closest("a");
    const source = inline ? undefined : sources[index];
    const href = link?.getAttribute("href");
    if (href && !isImageDestination(href, base, [...knownSources, ...sources].filter(Boolean))) continue;
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
    const label = resolveLabels("en", config.labels)["Open image"] ?? "Open image";
    anchor.setAttribute("aria-label", `${label}${img.getAttribute("alt") ? `: ${img.getAttribute("alt")}` : ""}`);
  }
  return document.body.innerHTML;
}

export function enhanceResponse(html, base) {
  let config;
  const content = html.replace(/<template data-popcase-page>([^<]*)<\/template>/g, (_, encoded) => {
    try { config = decodeMarker(encoded); } catch { config = undefined; }
    return "";
  });
  const blocks = /<!--popcase:([^>]*)-->([\s\S]*?)<!--\/popcase-->/g;
  const knownSources = [];
  for (const match of content.matchAll(blocks)) {
    try {
      knownSources.push(...(decodeMarker(match[1]).nodes ?? []).map((node) => node.source).filter(Boolean));
    } catch { /* Invalid markers leave the original block unchanged. */ }
  }
  return content.replace(blocks, (_, encoded, markup) => {
    if (!config) return markup;
    try {
      const metadata = decodeMarker(encoded);
      return enhanceHtml(markup, { ...metadata, base, config, knownSources });
    } catch { return markup; }
  });
}
