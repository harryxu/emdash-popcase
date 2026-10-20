import test from "node:test";
import assert from "node:assert/strict";
import { runWithContext } from "emdash/request-context";
import { createPlugin, popcase, popcaseIntegration } from "../index.js";
import { encodeMarker } from "../src/markers.js";
import { enhanceResponse } from "../src/server.js";
import { transformResponse } from "../src/response.js";

const base = "https://blog.example/posts/story";
const plugin = createPlugin();
const page = (collection = "posts") => ({ kind: "content", content: { collection } });
const contribution = (p, context = { editMode: false }, instance = plugin) =>
  runWithContext(context, () => instance.hooks["page:fragments"].handler({ page: p }, {}));
const block = (markup, nodes = [], inline = false) => `<!--popcase:${encodeMarker({ nodes, inline })}-->${markup}<!--/popcase-->`;
const markup = '<figure class="emdash-image"><img src="/preview.jpg" alt="A test diagram"></figure>';
const source = { source: "https://blog.example/full.jpg", width: 2400, height: 1600 };

test("native configuration uses real page identity and stays isolated across concurrent contexts", async () => {
  const instance = createPlugin({ collections: ["notes"], zoom: false });
  const values = await Promise.all([
    contribution(page()), contribution(page("pages")), contribution(page("notes")),
    contribution(page(), { editMode: true }), contribution({ kind: "custom" }),
    contribution(page("notes"), { editMode: false }, instance),
  ]);
  assert.ok(values[0]?.html.includes("data-popcase-page"));
  assert.ok(values[1]);
  assert.equal(values[2], null);
  assert.equal(values[3], null);
  assert.equal(values[4], null);
  assert.ok(decodeURIComponent(values[5].html).includes('"zoom":false'));
  assert.equal(popcase().format, "native");
  const middlewares = [];
  popcaseIntegration().hooks["astro:config:setup"]({ addMiddleware: (entry) => middlewares.push(entry) });
  assert.equal(middlewares[0].order, "pre");
});

test("response enhancement is independent of whether page metadata precedes or follows image rendering", () => {
  const pageHtml = contribution(page()).html;
  const body = block(markup, [source]);
  const before = enhanceResponse(pageHtml + body, base);
  const after = enhanceResponse(body + pageHtml, base);
  assert.equal(before, after);
  assert.ok(before.includes("data-popcase="));
  assert.ok(!before.includes("<!--popcase:") && !before.includes("data-popcase-page"));
});

test("excluded pages retain original block HTML and surrounding document bytes", () => {
  const document = '<!doctype html><html><head><script>let x = "<&";</script></head><body>';
  const html = document + block(markup, [source]) + "</body></html>";
  assert.equal(enhanceResponse(html, base), document + markup + "</body></html>");
});

test("known extensionless image references can be linked from another block", () => {
  const src = "https://blog.example/_emdash/api/media/file/known-image";
  const html = contribution(page()).html + block(markup, [{ source: src }]) +
    block('<a href="/_emdash/api/media/file/known-image"><img src="/thumb.jpg" alt="Inline preview"></a>', [], true);
  assert.equal((enhanceResponse(html, base).match(/data-popcase=/g) ?? []).length, 2);
});

test("rewriting a response preserves cache/privacy headers and Astro cookie state but removes stale body validators", async () => {
  const html = contribution(page()).html + block(markup, [source]);
  const response = new Response(html, { headers: {
    "content-type": "text/html", "content-length": "999", "etag": '"old"',
    "cache-control": "private, no-store", "vary": "Cookie", "set-cookie": "test=value; HttpOnly",
    "content-security-policy": "default-src 'self'", "x-emdash-test": "kept",
  } });
  const cookie = Symbol.for("astro.cookies");
  response[cookie] = { pending: true };
  const result = await transformResponse(response, base);
  assert.equal(result[cookie], response[cookie]);
  assert.equal(result.headers.get("cache-control"), "private, no-store");
  assert.equal(result.headers.get("vary"), "Cookie");
  assert.equal(result.headers.get("set-cookie"), "test=value; HttpOnly");
  assert.equal(result.headers.get("x-emdash-test"), "kept");
  assert.equal(result.headers.get("content-security-policy"), "default-src 'self'");
  assert.equal(result.headers.get("content-length"), null);
  assert.equal(result.headers.get("etag"), null);
  assert.ok((await result.text()).includes("data-popcase="));
});

test("non-HTML, partial, redirect and compressed responses pass through untouched", async () => {
  for (const response of [new Response("{}", { headers: { "content-type": "application/json" } }),
    new Response("partial", { status: 206, headers: { "content-type": "text/html" } }),
    new Response(null, { status: 302, headers: { location: "/next" } }),
    new Response("compressed", { headers: { "content-type": "text/html", "content-encoding": "gzip" } })]) {
    assert.equal(await transformResponse(response, base), response);
    assert.equal(response.bodyUsed, false);
  }
});
