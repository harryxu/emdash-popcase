import { definePlugin, getRequestContext } from "emdash";
import { normalizeOptions } from "./options.js";
import { encodeMarker } from "./markers.js";
import { isCollectionEnabled, readContentTypes, settingsRoute } from "./settings.js";

import type { PluginDescriptor } from "emdash";
import type { AstroIntegration } from "astro";
import type { PopcaseOptions } from "./types.js";

export type { PopcaseOptions, PopcaseConfig } from "./types.js";

const version = "0.1.0";

export function popcase(options: PopcaseOptions = {}): PluginDescriptor {
  return {
    id: "popcase",
    version,
    format: "native",
    entrypoint: "emdash-popcase",
    componentsEntry: "emdash-popcase/astro",
    adminEntry: "emdash-popcase/admin",
    options: { ...normalizeOptions(options) },
  };
}

export function createPlugin(options: PopcaseOptions = {}) {
  const config = normalizeOptions(options);
  return definePlugin({
    id: "popcase",
    version,
    capabilities: ["hooks.page-fragments:register", "schema:read"],
    admin: {
      entry: "emdash-popcase/admin",
      pages: [{ path: "/settings", label: "Popcase", icon: "images" }],
    },
    routes: { settings: settingsRoute },
    hooks: {
      "page:fragments": async ({ page }, ctx) => {
        const context = getRequestContext();
        if (context?.editMode || page.kind !== "content" || !page.content?.collection) return null;
        if (!isCollectionEnabled(await readContentTypes(ctx.settings), page.content.collection)) return null;
        return {
          kind: "html",
          placement: "head",
          key: "popcase-page",
          html: `<template data-popcase-page>${encodeMarker(config)}</template>`,
        };
      },
    },
  });
}

export function popcaseIntegration(): AstroIntegration {
  return {
    name: "popcase",
    hooks: {
      "astro:config:setup": ({ addMiddleware }) => {
        addMiddleware({ entrypoint: "emdash-popcase/middleware", order: "pre" });
      },
    },
  };
}

export default popcase;
