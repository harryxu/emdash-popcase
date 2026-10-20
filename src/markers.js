export function encodeMarker(value) {
  return encodeURIComponent(JSON.stringify(value)).replaceAll("-", "%2D");
}

export function decodeMarker(value) {
  return JSON.parse(decodeURIComponent(value));
}
