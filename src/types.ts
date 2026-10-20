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
