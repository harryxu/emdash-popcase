import type { PluginRoute, RouteContext, SettingsAccess } from "emdash";
import type { ContentTypes, SettingsResponse } from "./types.js";

const settingKey = "contentTypes";

export function parseContentTypes(value: unknown): ContentTypes | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!("mode" in value)) return null;
  if (value.mode === "all") return { mode: "all" };
  if (value.mode !== "selected" || !("collections" in value) || !Array.isArray(value.collections) ||
      !value.collections.every((slug) => typeof slug === "string" && slug.length > 0)) return null;
  return { mode: "selected", collections: [...new Set(value.collections)] };
}

export async function readContentTypes(settings: Pick<SettingsAccess, "get">): Promise<ContentTypes> {
  return (await readSettings(settings)).settings;
}

export async function readSettings(settings: Pick<SettingsAccess, "get">): Promise<{ settings: ContentTypes; thumbnails: boolean }> {
  const value = await settings.get<Record<string, unknown>>(settingKey);
  if (value == null) return { settings: { mode: "all" }, thumbnails: false };
  const parsed = parseContentTypes(value);
  if (!parsed) throw new Error("Invalid Popcase content type settings.");
  const thumbnails = "thumbnails" in value ? value.thumbnails : false;
  if (typeof thumbnails !== "boolean") throw new Error("Invalid Popcase thumbnail settings.");
  return { settings: parsed, thumbnails };
}

export function isCollectionEnabled(settings: ContentTypes, collection: string): boolean {
  return settings.mode === "all" || settings.collections.includes(collection);
}

export const settingsRoute = {
  methods: ["GET", "POST"],
  permission: "plugins:manage",
  handler: async (ctx: Pick<RouteContext, "schema" | "settings" | "request" | "input">): Promise<SettingsResponse> => {
    if (!ctx.schema) throw new Error("Popcase requires schema:read access.");
    const collections = (await ctx.schema.listCollections())
      .map(({ slug, label }) => ({ slug, label }))
      .sort((a, b) => a.label.localeCompare(b.label) || a.slug.localeCompare(b.slug));
    if (ctx.request.method === "POST") {
      const parsed = parseContentTypes(ctx.input);
      if (!parsed) return { ok: false, error: "INVALID_SETTINGS" };
      const thumbnails = ctx.input && typeof ctx.input === "object" && "thumbnails" in ctx.input ? ctx.input.thumbnails : false;
      if (typeof thumbnails !== "boolean") return { ok: false, error: "INVALID_SETTINGS" };
      const known = new Set(collections.map(({ slug }) => slug));
      if (parsed.mode === "selected" && parsed.collections.some((slug) => !known.has(slug))) {
        return { ok: false, error: "UNKNOWN_CONTENT_TYPE" };
      }
      await ctx.settings.set(settingKey, { ...parsed, thumbnails });
      return { ok: true, settings: parsed, thumbnails, collections };
    }
    return { ok: true, ...await readSettings(ctx.settings), collections };
  },
} satisfies PluginRoute;
