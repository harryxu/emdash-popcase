export interface PopcaseConfig {
  thumbnails: boolean;
  videoAutoplay: boolean;
  photoInformation: boolean;
}

export type ContentTypes = { mode: "all" } | { mode: "selected"; collections: string[] };

export type SettingsResponse =
  | {
      ok: true;
      settings: ContentTypes;
      thumbnails: boolean;
      videoAutoplay: boolean;
      photoInformation: boolean;
      customCss: string;
      collections: { slug: string; label: string }[];
    }
  | { ok: false; error: "INVALID_SETTINGS" | "UNKNOWN_CONTENT_TYPE" }
  | { ok: false; error: "INVALID_CUSTOM_CSS"; message: string };

export interface ImageMetadata extends MediaNode {
  source?: string;
}

export interface BlockMetadata {
  nodes?: ImageMetadata[];
  inline?: boolean;
}

export interface MediaNode {
  asset?: {
    _ref?: string;
    id?: string;
    url?: string;
    src?: string;
    provider?: string;
    width?: number;
    height?: number;
    alt?: string;
    meta?: Record<string, unknown>;
  };
  width?: number;
  height?: number;
  alt?: string;
  caption?: string;
  meta?: Record<string, unknown>;
}
