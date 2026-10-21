import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { enhanceHtml } from "../dist/server.js";
import { normalizeOptions } from "../dist/options.js";
import { collectGroup } from "../src/client/group.ts";

const options = { base: "https://blog.example/posts/story", config: normalizeOptions() };
const node = { asset: { _ref: "source", url: "/full.jpg" }, width: 2400, height: 1600, alt: "A diagram", caption: "An explanation" };
const markup = '<figure class="emdash-image custom" style="margin:0"><img src="/preview.webp" width="600" height="400" alt="A diagram"><figcaption>An explanation</figcaption></figure>';
const documentOf = (html: string) => parseHTML(`<html><body>${html}</body></html>`).document;

test("SSR adds a keyboard-accessible fallback while retaining figure layout and original dimensions", () => {
  const document = documentOf(enhanceHtml(markup, { ...options, nodes: [node] }));
  const figure = document.querySelector("figure");
  assert.ok(figure);
  const anchor = figure.querySelector("a");
  assert.ok(anchor);
  assert.equal(figure.className, "emdash-image custom");
  assert.equal(figure.getAttribute("style"), "margin:0");
  assert.equal(anchor.href, "https://blog.example/full.jpg");
  assert.equal(anchor.querySelector("img")!.getAttribute("width"), "600");
  assert.equal(anchor.getAttribute("aria-haspopup"), null);
  assert.deepEqual(JSON.parse(anchor.dataset.popcase!), { src: "https://blog.example/full.jpg", alt: "A diagram", description: "An explanation", width: 2400, height: 1600 });
});

test("separate viewer images do not inherit the preview image's dimensions", () => {
  const linked = markup.replace('<img ', '<a href="/other.png" target="_blank"><img ').replace('><figcaption', '></a><figcaption');
  const document = documentOf(enhanceHtml(linked, { ...options, nodes: [node] }));
  const anchor = document.querySelector("a");
  assert.ok(anchor);
  const image = JSON.parse(anchor.dataset.popcase!);
  assert.equal(image.src, "https://blog.example/other.png");
  assert.equal(image.width, undefined);
  assert.equal(image.height, undefined);
  assert.equal(anchor.getAttribute("target"), "_blank");
});

test("navigation links are excluded without losing their destination or target", () => {
  const html = '<figure class="emdash-image"><a href="/shop" target="_blank"><img src="/preview.jpg"></a></figure>';
  const document = documentOf(enhanceHtml(html, { ...options, nodes: [node] }));
  assert.equal(document.querySelector("[data-popcase]"), null);
  assert.equal(document.querySelector("a")!.getAttribute("href"), "/shop");
  assert.equal(document.querySelector("a")!.getAttribute("target"), "_blank");
});

test("inline HTML enhances only image destination links and treats captions as text", () => {
  const html = '<figure><a href="/full.png"><img src="/thumb.jpg" alt="Different"></a><figcaption>A &amp; B &lt;script&gt;</figcaption></figure><a href="/page"><img src="/nav.png"></a><img src="/unlinked.png">';
  const document = documentOf(enhanceHtml(html, { ...options, inline: true }));
  const entries = collectGroup(document);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].slide.description, "A & B <script>");
  assert.notEqual(entries[0].slide.type, "video");
  if (entries[0].slide.type === "video") throw new Error("Expected an image slide.");
  assert.equal(entries[0].slide.width, undefined);
});

test("viewing groups preserve body order and repeated sources across images and galleries", () => {
  const first = enhanceHtml(markup, { ...options, nodes: [node] });
  const gallery = enhanceHtml('<div class="emdash-gallery"><figure class="emdash-gallery-item"><img src="/thumb2.jpg"></figure></div>', { ...options, nodes: [{ asset: { _ref: "second", url: "/second.jpg" } }] });
  const last = enhanceHtml(markup, { ...options, nodes: [node] });
  const entries = collectGroup(documentOf(first + gallery + last));
  assert.deepEqual(entries.map((entry) => entry.slide.src), ["https://blog.example/full.jpg", "https://blog.example/second.jpg", "https://blog.example/full.jpg"]);
  assert.notEqual(entries[0].anchor, entries[2].anchor);
});

test("editable surfaces do not become viewer entry points", () => {
  const html = enhanceHtml(markup, { ...options, nodes: [node] });
  const document = documentOf(`<div contenteditable="true">${html}</div><div class="emdash-inline-editor">${html}</div>${html}`);
  assert.equal(collectGroup(document).length, 1);
});
