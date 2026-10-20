import type { PopcaseConfig } from "../../index.js";

export interface ViewerImage {
  src: string;
  alt: string;
  description: string;
  width?: number;
  height?: number;
}

export function collectGroup(document: Document) {
  return Array.from(document.querySelectorAll<HTMLAnchorElement>("a[data-popcase]"))
    .filter((anchor) => !anchor.closest('[contenteditable="true"], .emdash-inline-editor'))
    .flatMap((anchor) => {
      try {
        const image = JSON.parse(anchor.dataset.popcase!) as ViewerImage;
        return image.src ? [{ anchor, image }] : [];
      } catch {
        return [];
      }
    });
}

export interface OpenRequest {
  images: ViewerImage[];
  index: number;
  config: PopcaseConfig;
  language: string;
  trigger: HTMLAnchorElement;
}
