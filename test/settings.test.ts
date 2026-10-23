import test from "node:test";
import assert from "node:assert/strict";
import { contribution } from "./helpers.ts";
import type { SchemaAccess, SettingsAccess } from "emdash";
import type { SettingsResponse } from "../src/types.ts";
import { settingsRoute } from "../dist/settings.js";
import { createPlugin, popcase } from "../dist/index.js";
import { enhanceResponse } from "../dist/server.js";
import { encodeMarker } from "../dist/markers.js";

function fixture() {
  const values = new Map<string, unknown>();
  const collections = [
    { slug: "posts", label: "Posts" }, { slug: "pages", label: "Pages" },
    { slug: "internal", label: "Internal", hidden: true, routable: false },
  ];
  const settings = {
    get: async <T>(key: string): Promise<T | null> => structuredClone(values.get(key) ?? null) as T | null,
    set: async (key: string, value: unknown) => { values.set(key, structuredClone(value)); },
  };
  const plugin = createPlugin();
  const request = (method: string, input?: unknown): Promise<SettingsResponse> => settingsRoute.handler({
    request: new Request("https://example.org/_emdash/api/plugins/popcase/settings", { method }),
    input, settings: settings as SettingsAccess, schema: { listCollections: async () => collections } as unknown as SchemaAccess,
  });
  const read = async () => {
    const result = await request("GET");
    assert.ok(result.ok);
    return result;
  };
  const render = async (collection: string, editMode = false, kind: "content" | "custom" = "content") => {
    const fragment = await contribution({ kind, content: { collection } }, { editMode }, plugin, settings);
    const marker = encodeMarker({ nodes: [{ source: "https://example.org/full.jpg" }], inline: false });
    return enhanceResponse(`${fragment?.html ?? ""}<!--popcase:${marker}--><figure class="emdash-image"><img src="/preview.jpg" alt="Preview"></figure><!--/popcase-->`, "https://example.org/story");
  };
  return { request, read, render, collections, values };
}

test("settings default to all types, including future, hidden and non-routable types", async () => {
  const { read, render, values } = fixture();
  const result = await read();
  assert.deepEqual(result.settings, { mode: "all" });
  assert.deepEqual(result.collections.map(({ slug }) => slug), ["internal", "pages", "posts"]);
  assert.equal(values.size, 0);
  assert.match(await render("future-type"), /data-popcase=/);
  assert.doesNotMatch(await render("posts", true), /data-popcase=/);
  assert.doesNotMatch(await render("posts", false, "custom"), /data-popcase=/);
});

test("saved selections change existing page output, persist on reload, and exclude newly created types", async () => {
  const { request, read, render, collections } = fixture();
  assert.match(await render("pages"), /data-popcase=/);
  assert.equal((await request("POST", { mode: "selected", collections: ["posts", "posts"] })).ok, true);
  assert.deepEqual((await read()).settings, { mode: "selected", collections: ["posts"] });
  assert.match(await render("posts"), /data-popcase=/);
  assert.doesNotMatch(await render("pages"), /data-popcase=/);
  collections.push({ slug: "notes", label: "Notes" });
  assert.doesNotMatch(await render("notes"), /data-popcase=/);
  await request("POST", { mode: "selected", collections: ["notes"] });
  assert.match(await render("notes"), /data-popcase=/);
  assert.doesNotMatch(await render("posts"), /data-popcase=/);
});

test("empty selection disables everything and all mode discards any saved whitelist", async () => {
  const { request, render, values } = fixture();
  await request("POST", { mode: "selected", collections: [] });
  assert.doesNotMatch(await render("posts"), /data-popcase=/);
  assert.doesNotMatch(await render("notes"), /data-popcase=/);
  await request("POST", { mode: "selected", collections: ["posts"] });
  await request("POST", { mode: "all", collections: ["posts"] });
  assert.deepEqual([...values], [["contentTypes", { mode: "all", thumbnails: false, videoAutoplay: true }]]);
  assert.match(await render("notes"), /data-popcase=/);
  await request("POST", { mode: "selected", collections: [] });
  assert.doesNotMatch(await render("posts"), /data-popcase=/);
});

test("invalid submissions never replace a saved selection", async () => {
  const { request, read } = fixture();
  await request("POST", { mode: "selected", collections: ["pages"] });
  for (const input of [null, [], {}, { mode: true }, { mode: "selected" },
    { mode: "selected", collections: "posts" }, { mode: "selected", collections: [1] },
    { mode: "selected", collections: [""] }, { mode: "selected", collections: ["unknown"] }]) {
    assert.equal((await request("POST", input)).ok, false);
    assert.deepEqual((await read()).settings, { mode: "selected", collections: ["pages"] });
  }
});

test("settings reads and writes report storage failures rather than claiming success", async () => {
  const { values, render } = fixture();
  values.set("contentTypes", { mode: "broken" });
  await assert.rejects(render("posts"), /Invalid Popcase/);
  await assert.rejects(settingsRoute.handler({
    request: new Request("https://example.org/settings", { method: "POST" }),
    input: { mode: "all" }, schema: { listCollections: async () => [] } as unknown as SchemaAccess,
    settings: { set: async () => { throw new Error("Storage unavailable"); } } as unknown as SettingsAccess,
  }), /Storage unavailable/);
});

test("native descriptor pairs its admin entry with a private manager-only settings route", () => {
  const plugin = createPlugin();
  assert.equal(popcase().adminEntry, plugin.admin.entry);
  assert.equal(plugin.admin.entry, "emdash-popcase/admin");
  assert.equal(plugin.admin.pages?.[0]?.path, "/settings");
  assert.equal(plugin.routes.settings.permission, "plugins:manage");
  assert.notEqual(plugin.routes.settings.public, true);
  assert.deepEqual(plugin.routes.settings.methods, ["GET", "POST"]);
  assert.ok(plugin.capabilities.includes("schema:read"));
});


test("thumbnails default off, migrate existing settings, persist and reach public image configuration", async () => {
  const { request, read, render, values } = fixture();
  assert.equal((await read()).thumbnails, false);
  values.set("contentTypes", { mode: "selected", collections: ["posts"] });
  assert.equal((await read()).thumbnails, false);
  for (const thumbnails of [true, false]) {
    const result = await request("POST", { mode: "selected", collections: ["posts"], thumbnails });
    assert.ok(result.ok);
    assert.equal(result.thumbnails, thumbnails);
    assert.equal((await read()).thumbnails, thumbnails);
    assert.deepEqual((await read()).settings, { mode: "selected", collections: ["posts"] });
    const html = await render("posts");
    assert.ok(html.includes(`&quot;thumbnails&quot;:${thumbnails}`));
    assert.doesNotMatch(await render("pages"), /data-popcase=/);
  }
});

test("invalid thumbnail values cannot overwrite either setting", async () => {
  const { request, read, values, render } = fixture();
  await request("POST", { mode: "all", thumbnails: true });
  for (const thumbnails of [null, "true", "false", 0, 1, [], {}]) {
    assert.deepEqual(await request("POST", { mode: "selected", collections: [], thumbnails }), { ok: false, error: "INVALID_SETTINGS" });
    assert.equal((await read()).thumbnails, true);
    assert.deepEqual((await read()).settings, { mode: "all" });
  }
  values.set("contentTypes", { mode: "all", thumbnails: "true" });
  await assert.rejects(render("posts"), /Invalid Popcase thumbnail settings/);
});

test("video autoplay defaults on for new and legacy settings", async () => {
  const { read, render, values } = fixture();
  assert.equal((await read()).videoAutoplay, true);
  for (const legacy of [{ mode: "all" }, { mode: "selected", collections: ["posts"], thumbnails: true }]) {
    values.set("contentTypes", legacy);
    assert.equal((await read()).videoAutoplay, true);
    assert.ok((await render("posts")).includes('&quot;videoAutoplay&quot;:true'));
  }
});

test("video autoplay persists with thumbnails and content types and reaches page configuration", async () => {
  const { request, read, render, values } = fixture();
  for (const videoAutoplay of [false, true]) {
    const result = await request("POST", { mode: "selected", collections: ["posts"], thumbnails: true, videoAutoplay });
    assert.ok(result.ok);
    assert.equal(result.videoAutoplay, videoAutoplay);
    assert.equal((await read()).videoAutoplay, videoAutoplay);
    assert.deepEqual(values.get("contentTypes"), { mode: "selected", collections: ["posts"], thumbnails: true, videoAutoplay });
    assert.ok((await render("posts")).includes(`&quot;videoAutoplay&quot;:${videoAutoplay}`));
    assert.doesNotMatch(await render("pages"), /data-popcase=/);
  }
});

test("invalid autoplay values leave all saved settings unchanged and invalid stored values fail", async () => {
  const { request, read, render, values } = fixture();
  await request("POST", { mode: "selected", collections: ["posts"], thumbnails: true, videoAutoplay: false });
  const saved = await read();
  for (const videoAutoplay of [null, undefined, "true", "false", 0, 1, [], {}]) {
    assert.deepEqual(await request("POST", { mode: "all", thumbnails: false, videoAutoplay }), { ok: false, error: "INVALID_SETTINGS" });
    assert.deepEqual(await read(), saved);
  }
  values.set("contentTypes", { mode: "all", videoAutoplay: "false" });
  await assert.rejects(render("posts"), /Invalid Popcase video autoplay settings/);
});
