import type { PopcaseConfig } from "../types.js";

export interface ViewerImage {
  type?: "image";
  src: string;
  alt: string;
  description: string;
  width?: number;
  height?: number;
}

export interface ViewerVideo {
  type: "video";
  src: string;
  sources: { src: string; type: string }[];
  poster?: string;
  alt: string;
  description: string;
}

export interface ViewerYoutube {
  type: "youtube";
  src: string;
  videoId: string;
  start: number;
  shorts: boolean;
  poster?: string;
  alt: string;
  description: string;
}

export type ViewerSlide = ViewerImage | ViewerVideo | ViewerYoutube;

export function collectGroup(document: Document) {
  return Array.from(document.querySelectorAll<HTMLAnchorElement>("a[data-popcase]"))
    .filter((anchor) => !anchor.closest('[contenteditable="true"], .emdash-inline-editor'))
    .flatMap((anchor) => {
      try {
        const slide = JSON.parse(anchor.dataset.popcase!) as ViewerSlide;
        return slide.src ? [{ anchor, slide }] : [];
      } catch {
        return [];
      }
    });
}

export interface OpenRequest {
  slides: ViewerSlide[];
  index: number;
  config: PopcaseConfig;
  trigger: HTMLAnchorElement;
}
