import { wrapCustomCss } from "../custom-css.js";
import { decodeMarker } from "../markers.js";

export function mountCustomCss(document: Document): HTMLStyleElement | undefined {
  const encoded = document.querySelector<HTMLTemplateElement>("template[data-popcase-custom-css]")
    ?.content.firstChild?.textContent;
  if (!encoded) return;
  const css = decodeMarker<unknown>(encoded);
  if (typeof css !== "string" || !css.trim()) return;
  const style = document.createElement("style");
  style.dataset.popcaseCustomStyle = "";
  style.textContent = wrapCustomCss(css);
  document.head.appendChild(style);
  return style;
}
