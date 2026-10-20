import test from "node:test";
import assert from "node:assert/strict";
import { imageSource, isImageDestination, safeImageUrl } from "../src/images.js";
import { normalizeOptions, resolveLabels } from "../src/options.js";

const base = "https://blog.example/posts/story";

test("image destinations preserve navigation for pages, unsafe schemes and ambiguous URLs", () => {
  for (const href of ["/posts/another", "#section", "javascript:alert(1)", "data:image/png;base64,abc", "https://images.example/render?id=1", "/_emdash/api/media/file/unknown"]) {
    assert.equal(isImageDestination(href, base), false, href);
  }
  assert.equal(isImageDestination("/photos/full.JPG?version=2#detail", base), true);
  assert.equal(isImageDestination("/_emdash/api/media/file/known", base, ["/_emdash/api/media/file/known"]), true);
  assert.equal(safeImageUrl("https://user:password@example.org/image.jpg", base), undefined);
});

test("local images use public storage URLs while bare IDs remain on the media route", () => {
  const publicUrl = (key) => `https://cdn.example/${key}`;
  assert.equal(imageSource({ asset: { _ref: "abc", url: "/_emdash/api/media/file/abc.jpg" } }, base, publicUrl), "https://cdn.example/abc.jpg");
  assert.equal(imageSource({ asset: { _ref: "abc" } }, base, publicUrl), "https://blog.example/_emdash/api/media/file/abc");
  assert.equal(imageSource({ asset: { _ref: "abc", url: "https://images.example/original" } }, base), "https://images.example/original");
});

test("provider sources are never guessed from their IDs", () => {
  assert.equal(imageSource({ asset: { _ref: "remote-id", provider: "custom" } }, base), undefined);
  assert.equal(imageSource({ asset: { _ref: "remote-id", provider: "custom", url: "https://images.example/full.jpg" } }, base), "https://images.example/full.jpg");
});

test("defaults, explicit exclusions and translated label overrides are independent", () => {
  assert.deepEqual(normalizeOptions().collections, ["posts", "pages"]);
  assert.deepEqual(normalizeOptions({ collections: [] }).collections, []);
  assert.equal(normalizeOptions({ zoom: false }).zoom, false);
  assert.equal(normalizeOptions({ zoom: false }).captions, true);
  assert.equal(resolveLabels("zh-CN").Close, "关闭");
  assert.equal(resolveLabels("zh-TW", { Close: "關閉" }).Close, "關閉");
  assert.equal(resolveLabels("fr").Close, undefined);
});
