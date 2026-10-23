import type { PopcaseConfig, PopcaseOptions } from "./types.js";

export function normalizeOptions(options: PopcaseOptions & { thumbnails?: boolean; videoAutoplay?: boolean } = {}): PopcaseConfig {
  return {
    zoom: options.zoom !== false,
    counter: options.counter !== false,
    captions: options.captions !== false,
    thumbnails: options.thumbnails === true,
    videoAutoplay: options.videoAutoplay !== false,
    labels: Object.fromEntries(Object.entries(options.labels ?? {})
      .filter(([, value]) => typeof value === "string")),
  };
}
