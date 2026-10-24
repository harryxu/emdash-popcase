import type { PluginRoute, RouteContext, SettingsAccess } from "emdash";
import type { ContentTypes, SettingsResponse } from "./types.js";
import { parse, CssSyntaxError } from "postcss";
import { customCssSelector, wrapCustomCss } from "./custom-css.js";

const settingKey = "contentTypes";

export function validateCustomCss(value: unknown): string | undefined {
  if (typeof value !== "string") return "Custom CSS must be text.";
  try {
    const stylesheet = parse(wrapCustomCss(value), { from: undefined });
    if (
      stylesheet.nodes.length !== 1 ||
      stylesheet.first?.type !== "rule" ||
      stylesheet.first.selector !== customCssSelector
    )
      return "Custom CSS must stay inside the viewer rule. Check for extra closing braces.";
  } catch (error) {
    if (error instanceof CssSyntaxError)
      return `Custom CSS: ${error.reason} (line ${Math.max(1, (error.line ?? 2) - 1)}, column ${error.column ?? 1}).`;
    throw error;
  }
}

export function parseContentTypes(value: unknown): ContentTypes | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!("mode" in value)) return null;
  if (value.mode === "all") return { mode: "all" };
  if (
    value.mode !== "selected" ||
    !("collections" in value) ||
    !Array.isArray(value.collections) ||
    !value.collections.every((slug) => typeof slug === "string" && slug.length > 0)
  )
    return null;
  return { mode: "selected", collections: [...new Set(value.collections)] };
}

export async function readContentTypes(
  settings: Pick<SettingsAccess, "get">,
): Promise<ContentTypes> {
  return (await readSettings(settings)).settings;
}

export async function readSettings(settings: Pick<SettingsAccess, "get">): Promise<{
  settings: ContentTypes;
  thumbnails: boolean;
  videoAutoplay: boolean;
  photoInformation: boolean;
  customCss: string;
}> {
  const value = await settings.get<Record<string, unknown>>(settingKey);
  if (value == null)
    return {
      settings: { mode: "all" },
      thumbnails: false,
      videoAutoplay: true,
      photoInformation: true,
      customCss: "",
    };
  const parsed = parseContentTypes(value);
  if (!parsed) throw new Error("Invalid Popcase content type settings.");
  const thumbnails = "thumbnails" in value ? value.thumbnails : false;
  if (typeof thumbnails !== "boolean") throw new Error("Invalid Popcase thumbnail settings.");
  const videoAutoplay = "videoAutoplay" in value ? value.videoAutoplay : true;
  if (typeof videoAutoplay !== "boolean")
    throw new Error("Invalid Popcase video autoplay settings.");
  const photoInformation = "photoInformation" in value ? value.photoInformation : true;
  if (typeof photoInformation !== "boolean")
    throw new Error("Invalid Popcase photo information settings.");
  const customCss = "customCss" in value ? value.customCss : "";
  const cssError = validateCustomCss(customCss);
  if (cssError) throw new Error(`Invalid Popcase custom CSS settings. ${cssError}`);
  return {
    settings: parsed,
    thumbnails,
    videoAutoplay,
    photoInformation,
    customCss: customCss as string,
  };
}

export function isCollectionEnabled(settings: ContentTypes, collection: string): boolean {
  return settings.mode === "all" || settings.collections.includes(collection);
}

export const settingsRoute = {
  methods: ["GET", "POST"],
  permission: "plugins:manage",
  handler: async (
    ctx: Pick<RouteContext, "schema" | "settings" | "request" | "input">,
  ): Promise<SettingsResponse> => {
    if (!ctx.schema) throw new Error("Popcase requires schema:read access.");
    const collections = (await ctx.schema.listCollections())
      .map(({ slug, label }) => ({ slug, label }))
      .sort((a, b) => a.label.localeCompare(b.label) || a.slug.localeCompare(b.slug));
    if (ctx.request.method === "POST") {
      const parsed = parseContentTypes(ctx.input);
      if (!parsed) return { ok: false, error: "INVALID_SETTINGS" };
      const thumbnails =
        ctx.input && typeof ctx.input === "object" && "thumbnails" in ctx.input
          ? ctx.input.thumbnails
          : false;
      if (typeof thumbnails !== "boolean") return { ok: false, error: "INVALID_SETTINGS" };
      const videoAutoplay =
        ctx.input && typeof ctx.input === "object" && "videoAutoplay" in ctx.input
          ? ctx.input.videoAutoplay
          : true;
      if (typeof videoAutoplay !== "boolean") return { ok: false, error: "INVALID_SETTINGS" };
      const photoInformation =
        ctx.input && typeof ctx.input === "object" && "photoInformation" in ctx.input
          ? ctx.input.photoInformation
          : true;
      if (typeof photoInformation !== "boolean") return { ok: false, error: "INVALID_SETTINGS" };
      const customCss =
        ctx.input && typeof ctx.input === "object" && "customCss" in ctx.input
          ? ctx.input.customCss
          : "";
      const cssError = validateCustomCss(customCss);
      if (cssError) return { ok: false, error: "INVALID_CUSTOM_CSS", message: cssError };
      const known = new Set(collections.map(({ slug }) => slug));
      if (parsed.mode === "selected" && parsed.collections.some((slug) => !known.has(slug))) {
        return { ok: false, error: "UNKNOWN_CONTENT_TYPE" };
      }
      await ctx.settings.set(settingKey, {
        ...parsed,
        thumbnails,
        videoAutoplay,
        photoInformation,
        customCss,
      });
      return {
        ok: true,
        settings: parsed,
        thumbnails,
        videoAutoplay,
        photoInformation,
        customCss: customCss as string,
        collections,
      };
    }
    return { ok: true, ...(await readSettings(ctx.settings)), collections };
  },
} satisfies PluginRoute;
