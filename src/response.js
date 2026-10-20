import { enhanceResponse } from "./server.js";

const cookieKey = Symbol.for("astro.cookies");

export async function transformResponse(response, base) {
  if (response.status !== 200 || !response.body || response.headers.has("content-encoding") ||
      response.headers.has("content-range") || !response.headers.get("content-type")?.includes("text/html")) return response;
  const html = await response.text();
  const output = enhanceResponse(html, base);
  const headers = new Headers(response.headers);
  if (output !== html) {
    for (const name of ["content-length", "etag", "digest", "content-md5", "content-digest", "repr-digest"]) headers.delete(name);
  }
  const result = new Response(output, { status: response.status, statusText: response.statusText, headers });
  if (Reflect.has(response, cookieKey)) Reflect.set(result, cookieKey, Reflect.get(response, cookieKey));
  return result;
}
