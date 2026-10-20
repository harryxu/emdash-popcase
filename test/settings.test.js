import test from "node:test";
import assert from "node:assert/strict";
import { runWithContext } from "emdash/request-context";
import { createPlugin, popcase } from "../index.js";
import { enhanceResponse } from "../src/server.js";
import { encodeMarker } from "../src/markers.js";

function fixture() {
  const values = new Map();
  const collections = [
    { slug: "posts", label: "Posts" }, { slug: "pages", label: "Pages" },
    { slug: "internal", label: "Internal", hidden: true, routable: false },
  ];
  const settings = {
    get: async (key) => structuredClone(values.get(key) ?? null),
    set: async (key, value) => { values.set(key, structuredClone(value)); },
  };
  const plugin = createPlugin();
  const request = (method, input) => plugin.routes.settings.handler({
    request: new Request("https://example.org/_emdash/api/plugins/popcase/settings", { method }),
    input, settings, schema: { listCollections: async () => collections },
  });
  const render = async (collection, editMode = false, kind = "content") => {
    const fragment = await runWithContext({ editMode }, () => plugin.hooks["page:fragments"].handler({
      page: { kind, content: { collection } },
    }, { settings }));
    const marker = encodeMarker({ nodes: [{ source: "https://example.org/full.jpg" }], inline: false });
    return enhanceResponse(`${fragment?.html ?? ""}<!--popcase:${marker}--><figure class="emdash-image"><img src="/preview.jpg" alt="Preview"></figure><!--/popcase-->`, "https://example.org/story");
  };
  return { request, render, collections, values };
}

test("settings default to all types, including future, hidden and non-routable types", async () => {
  const { request, render, values } = fixture();
  const result = await request("GET");
  assert.deepEqual(result.settings, { mode: "all" });
  assert.deepEqual(result.collections.map(({ slug }) => slug), ["internal", "pages", "posts"]);
  assert.equal(values.size, 0);
  assert.match(await render("future-type"), /data-popcase=/);
  assert.doesNotMatch(await render("posts", true), /data-popcase=/);
  assert.doesNotMatch(await render("posts", false, "custom"), /data-popcase=/);
});

test("saved selections change existing page output, persist on reload, and exclude newly created types", async () => {
  const { request, render, collections } = fixture();
  assert.match(await render("pages"), /data-popcase=/);
  assert.equal((await request("POST", { mode: "selected", collections: ["posts", "posts"] })).ok, true);
  assert.deepEqual((await request("GET")).settings, { mode: "selected", collections: ["posts"] });
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
  assert.deepEqual([...values], [["contentTypes", { mode: "all" }]]);
  assert.match(await render("notes"), /data-popcase=/);
  await request("POST", { mode: "selected", collections: [] });
  assert.doesNotMatch(await render("posts"), /data-popcase=/);
});

test("invalid submissions never replace a saved selection", async () => {
  const { request } = fixture();
  await request("POST", { mode: "selected", collections: ["pages"] });
  for (const input of [null, [], {}, { mode: true }, { mode: "selected" },
    { mode: "selected", collections: "posts" }, { mode: "selected", collections: [1] },
    { mode: "selected", collections: [""] }, { mode: "selected", collections: ["unknown"] }]) {
    assert.equal((await request("POST", input)).ok, false);
    assert.deepEqual((await request("GET")).settings, { mode: "selected", collections: ["pages"] });
  }
});

test("settings reads and writes report storage failures rather than claiming success", async () => {
  const { values, render } = fixture();
  values.set("contentTypes", { mode: "broken" });
  await assert.rejects(render("posts"), /Invalid Popcase/);
  await assert.rejects(createPlugin().routes.settings.handler({
    request: new Request("https://example.org/settings", { method: "POST" }),
    input: { mode: "all" }, schema: { listCollections: async () => [] },
    settings: { set: async () => { throw new Error("Storage unavailable"); } },
  }), /Storage unavailable/);
});

test("native descriptor pairs its admin entry with a private manager-only settings route", () => {
  const plugin = createPlugin();
  assert.equal(popcase().adminEntry, plugin.admin.entry);
  assert.equal(plugin.admin.entry, "emdash-popcase/admin");
  assert.equal(plugin.admin.pages[0].path, "/settings");
  assert.equal(plugin.routes.settings.permission, "plugins:manage");
  assert.notEqual(plugin.routes.settings.public, true);
  assert.deepEqual(plugin.routes.settings.methods, ["GET", "POST"]);
  assert.ok(plugin.capabilities.includes("schema:read"));
});
