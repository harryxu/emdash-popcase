const settingKey = "contentTypes";

/** @typedef {{ mode: "all" } | { mode: "selected", collections: string[] }} ContentTypes */

/** @returns {ContentTypes | null} */
export function parseContentTypes(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (value.mode === "all") return { mode: "all" };
  if (value.mode !== "selected" || !Array.isArray(value.collections) ||
      !value.collections.every((slug) => typeof slug === "string" && slug.length > 0)) return null;
  return { mode: "selected", collections: [...new Set(value.collections)] };
}

export async function readContentTypes(settings) {
  const value = await settings.get(settingKey);
  if (value == null) return { mode: "all" };
  const parsed = parseContentTypes(value);
  if (!parsed) throw new Error("Invalid Popcase content type settings.");
  return parsed;
}

export function isCollectionEnabled(settings, collection) {
  return settings.mode === "all" || settings.collections.includes(collection);
}

export const settingsRoute = {
  methods: ["GET", "POST"],
  permission: "plugins:manage",
  handler: async (ctx) => {
    const collections = (await ctx.schema.listCollections())
      .map(({ slug, label }) => ({ slug, label }))
      .sort((a, b) => a.label.localeCompare(b.label) || a.slug.localeCompare(b.slug));
    if (ctx.request.method === "POST") {
      const parsed = parseContentTypes(ctx.input);
      if (!parsed) return { ok: false, error: "INVALID_SETTINGS" };
      const known = new Set(collections.map(({ slug }) => slug));
      if (parsed.mode === "selected" && parsed.collections.some((slug) => !known.has(slug))) {
        return { ok: false, error: "UNKNOWN_CONTENT_TYPE" };
      }
      await ctx.settings.set(settingKey, parsed);
      return { ok: true, settings: parsed, collections };
    }
    return { ok: true, settings: await readContentTypes(ctx.settings), collections };
  },
};
