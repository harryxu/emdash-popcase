import { definePlugin, getRequestContext } from "emdash";
import { normalizeOptions } from "./src/options.js";
import { encodeMarker } from "./src/markers.js";

const version = "0.1.0";

export function popcase(options = {}) {
  return {
    id: "popcase",
    version,
    format: "native",
    entrypoint: "popcase",
    componentsEntry: "popcase/astro",
    options: normalizeOptions(options),
  };
}

export function createPlugin(options = {}) {
  const config = normalizeOptions(options);
  return definePlugin({
    id: "popcase",
    version,
    capabilities: ["hooks.page-fragments:register"],
    hooks: {
      "page:fragments": ({ page }) => {
        const context = getRequestContext();
        const enabled = !context?.editMode && page.kind === "content" &&
          config.collections.includes(page.content?.collection);
        if (!enabled) return null;
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

export function popcaseIntegration() {
  return {
    name: "popcase",
    hooks: {
      "astro:config:setup": ({ addMiddleware }) => {
        addMiddleware({ entrypoint: "popcase/middleware", order: "pre" });
      },
    },
  };
}

export default popcase;
