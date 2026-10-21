import test from "node:test";
import assert from "node:assert/strict";
import { imageSource, isImageDestination, safeImageUrl } from "../dist/images.js";
import { normalizeOptions } from "../dist/options.js";

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
  const publicUrl = (key: string) => `https://cdn.example/${key}`;
  assert.equal(imageSource({ asset: { _ref: "abc", url: "/_emdash/api/media/file/abc.jpg" } }, base, publicUrl), "https://cdn.example/abc.jpg");
  assert.equal(imageSource({ asset: { _ref: "abc" } }, base, publicUrl), "https://blog.example/_emdash/api/media/file/abc");
  assert.equal(imageSource({ asset: { _ref: "abc", url: "https://images.example/original" } }, base), "https://images.example/original");
});

test("provider sources are never guessed from their IDs", () => {
  assert.equal(imageSource({ asset: { _ref: "remote-id", provider: "custom" } }, base), undefined);
  assert.equal(imageSource({ asset: { _ref: "remote-id", provider: "custom", url: "https://images.example/full.jpg" } }, base), "https://images.example/full.jpg");
});

test("viewer defaults and custom label overrides are independent", () => {
  assert.equal("collections" in normalizeOptions(Object.assign({ zoom: true }, { collections: ["posts"] })), false);
  assert.equal(normalizeOptions({ zoom: false }).zoom, false);
  assert.equal(normalizeOptions({ zoom: false }).captions, true);
  assert.deepEqual(normalizeOptions().labels, {});
  assert.deepEqual(normalizeOptions({ labels: { Close: "Close viewer" } }).labels, { Close: "Close viewer" });
});
