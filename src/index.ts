import { definePlugin, getRequestContext } from "emdash";
import packageMetadata from "../package.json" with { type: "json" };
import { normalizeConfig } from "./config.js";
import { encodeMarker } from "./markers.js";
import { isCollectionEnabled, readSettings, settingsRoute } from "./settings.js";

import type { PluginDescriptor } from "emdash";
import type { AstroIntegration } from "astro";
export type { PopcaseConfig } from "./types.js";

const { version } = packageMetadata;

export function popcase(): PluginDescriptor {
  return {
    id: "popcase",
    version,
    format: "native",
    entrypoint: "emdash-popcase",
    componentsEntry: "emdash-popcase/astro",
    adminEntry: "emdash-popcase/admin",
  };
}

export function createPlugin() {
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
        const settings = await readSettings(ctx.settings);
        if (!isCollectionEnabled(settings.settings, page.content.collection)) return null;
        return {
          kind: "html",
          placement: "head",
          key: "popcase-page",
          html: `<template data-popcase-page>${encodeMarker({ ...normalizeConfig(settings), customCss: settings.customCss })}</template>`,
        };
      },
    },
  });
}

export function popcaseIntegration(): AstroIntegration {
  return {
    name: "popcase",
    hooks: {
      "astro:config:setup": ({ addMiddleware, injectScript }) => {
        addMiddleware({ entrypoint: "emdash-popcase/middleware", order: "pre" });
        injectScript("page", 'import "emdash-popcase/client";');
      },
    },
  };
}

export default popcase;
