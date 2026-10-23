import type { PopcaseConfig } from "./types.js";

export function normalizeConfig(config: Partial<PopcaseConfig> = {}): PopcaseConfig {
  return {
    thumbnails: config.thumbnails === true,
    videoAutoplay: config.videoAutoplay !== false,
    photoInformation: config.photoInformation !== false,
  };
}
