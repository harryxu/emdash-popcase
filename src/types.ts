export interface PopcaseOptions {
  zoom?: boolean;
  counter?: boolean;
  captions?: boolean;
  /** Override the labels for the page's Chinese or English interface. */
  labels?: Record<string, string>;
}

export interface PopcaseConfig {
  zoom: boolean;
  counter: boolean;
  captions: boolean;
  labels: Record<string, string>;
}

export type ContentTypes = { mode: "all" } | { mode: "selected"; collections: string[] };

export type SettingsResponse = {
  ok: true;
  settings: ContentTypes;
  collections: { slug: string; label: string }[];
} | { ok: false; error: "INVALID_SETTINGS" | "UNKNOWN_CONTENT_TYPE" };

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
