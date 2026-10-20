import type { MiddlewareHandler } from "astro";
import { defineMiddleware } from "astro:middleware";
import { transformResponse } from "./response.js";

export const onRequest: MiddlewareHandler = defineMiddleware(async (context, next) => {
  const response = await next();
  if (context.request.method !== "GET" || context.url.pathname.startsWith("/_emdash/")) return response;
  return transformResponse(response, context.url.href);
});
