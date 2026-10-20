export function encodeMarker(value: unknown): string {
  return encodeURIComponent(JSON.stringify(value)).replaceAll("-", "%2D");
}

export function decodeMarker<T = unknown>(value: string): T {
  return JSON.parse(decodeURIComponent(value));
}
