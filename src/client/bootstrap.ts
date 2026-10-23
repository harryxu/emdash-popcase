import { collectGroup } from "./group";
import { normalizeConfig } from "../config.js";

let sequence = 0;
let viewer: typeof import("./viewer") | undefined;

function initialize() {
  for (const { anchor, slide } of collectGroup(document)) {
    anchor.setAttribute("role", "button");
    anchor.setAttribute("aria-haspopup", "dialog");
    const label = slide.type === "video" || slide.type === "youtube" ? "Open video" : "Open image";
    anchor.setAttribute("aria-label", `${label}${slide.alt ? `: ${slide.alt}` : ""}`);
  }
}

document.addEventListener("click", async (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[data-popcase]");
  if (!anchor) return;
  const group = collectGroup(document);
  const index = group.findIndex((entry) => entry.anchor === anchor);
  if (index < 0) return;
  event.preventDefault();
  const request = ++sequence;
  anchor.setAttribute("aria-busy", "true");
  anchor.focus();
  try {
    if (import.meta.env.DEV) await import("@vitejs/plugin-react/preamble");
    viewer = await import("./viewer");
    await viewer.prepareViewer();
    if (request !== sequence || !anchor.isConnected) return;
    viewer.openViewer({
      slides: group.map((entry) => entry.slide),
      index,
      config: normalizeConfig(JSON.parse(anchor.dataset.popcaseConfig ?? "{}")),
      trigger: anchor,
    });
  } catch (error) {
    if (request === sequence && anchor.isConnected) {
      console.warn("Popcase could not open the viewer; opening the media directly.", error);
      window.location.assign(anchor.href);
    }
  } finally {
    anchor.removeAttribute("aria-busy");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== " " || event.repeat || event.defaultPrevented) return;
  const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[data-popcase]");
  if (!anchor || !collectGroup(document).some((entry) => entry.anchor === anchor)) return;
  event.preventDefault();
  anchor.click();
});

document.addEventListener("astro:before-swap", () => {
  sequence++;
  viewer?.disposeViewer();
});
document.addEventListener("astro:page-load", initialize);
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
else initialize();
