import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { contribution } from "./helpers.ts";
import { videoSource } from "../dist/videos.js";
import { enhanceResponse } from "../dist/server.js";
import { collectGroup } from "../src/client/group.ts";
import { encodeMarker } from "../dist/markers.js";

const base = "https://blog.example/posts/story";
const page = { kind: "content" as const, content: { collection: "posts" } };
const documentOf = (html: string) => parseHTML(html).document;
async function enhance(body: string) {
  const marker = (await contribution(page))!.html;
  return enhanceResponse(
    `<!doctype html><html><head>${marker}</head><body>${body}</body></html>`,
    base,
  );
}

test("video direct links use pathname extensions and retain query strings and fragments", () => {
  for (const [path, type] of [
    ["/movie.MP4?token=abc#t=10", "video/mp4"],
    ["../movie.webm", "video/webm"],
    ["https://cdn.example/movie.ogv", "video/ogg"],
  ]) {
    assert.deepEqual(videoSource(path, base), { src: new URL(path, base).href, type });
  }
  for (const path of [
    "/watch?v=movie.mp4",
    "/movie.mp4/index.html",
    "#movie.mp4",
    "javascript:movie.mp4",
    "data:video/mp4,test",
    "https://user:password@example.com/movie.mp4",
    "https://youtube.com/watch?v=123",
    "https://vimeo.com/123",
    "/_emdash/api/media/file/unknown",
    "/movie.m3u8",
  ]) {
    assert.equal(videoSource(path, base), undefined, path);
  }
});

test("text-only content gets video metadata and retains fallback URLs and formatted link text", async () => {
  const document = documentOf(
    await enhance(
      '<p><a href="/movie.mp4?token=abc" target="_blank" rel="noopener"><strong>Watch</strong> the demo</a></p>',
    ),
  );
  const [{ anchor, slide }] = collectGroup(document);
  assert.equal(anchor.getAttribute("href"), "/movie.mp4?token=abc");
  assert.equal(anchor.getAttribute("target"), "_blank");
  assert.equal(anchor.getAttribute("rel"), "noopener");
  assert.equal(anchor.querySelector("strong")?.textContent, "Watch");
  assert.equal(anchor.getAttribute("aria-label"), "Open video: Watch the demo");
  assert.deepEqual(slide, {
    type: "video",
    src: "https://blog.example/movie.mp4?token=abc",
    sources: [{ src: "https://blog.example/movie.mp4?token=abc", type: "video/mp4" }],
    alt: "Watch the demo",
    description: "",
  });
});

test("linked images supply posters and placement captions without assuming video dimensions", async () => {
  const document = documentOf(
    await enhance(
      '<figure class="emdash-image"><a href="https://cdn.example/movie.webm"><img src="/poster.jpg" width="480" height="320" alt="Demo preview"></a><figcaption>A &amp; B</figcaption></figure>',
    ),
  );
  const [{ slide }] = collectGroup(document);
  assert.equal(slide.type, "video");
  if (slide.type !== "video") throw new Error("Expected a video slide.");
  assert.equal(slide.poster, "https://blog.example/poster.jpg");
  assert.equal(slide.description, "A & B");
  assert.ok(!("width" in slide) && !("height" in slide));
  assert.equal(document.querySelector("img")?.getAttribute("width"), "480");
});

test("mixed groups retain document order and repeated video link occurrences", async () => {
  const image = `<!--popcase:${encodeMarker({ nodes: [{ source: "https://blog.example/image.jpg" }] })}--><figure class="emdash-image"><img src="/image.jpg"></figure><!--/popcase-->`;
  const document = documentOf(
    await enhance('<a href="/movie.mp4">First</a>' + image + '<a href="/movie.mp4">Second</a>'),
  );
  const entries = collectGroup(document);
  assert.deepEqual(
    entries.map(({ slide }) => slide.src),
    [
      "https://blog.example/movie.mp4",
      "https://blog.example/image.jpg",
      "https://blog.example/movie.mp4",
    ],
  );
  assert.notEqual(entries[0].anchor, entries[2].anchor);
});

test("native players, embeds, downloads, editing surfaces and ordinary links stay unchanged", async () => {
  const body =
    '<figure class="emdash-video"><video src="/movie.mp4" controls><a href="/fallback.mp4">Download</a></video></figure>' +
    '<iframe src="https://youtube.com/embed/123"></iframe><a href="https://vimeo.com/123">Vimeo</a>' +
    '<a href="/download.mp4" download>Download</a><a href="/watch?id=123">Watch page</a>' +
    '<div contenteditable="true"><a href="/edit.mp4">Edit</a></div><div class="emdash-inline-editor"><a href="/inline.mp4">Edit</a></div>';
  const html = await enhance(body);
  assert.equal(html, `<!doctype html><html><head></head><body>${body}</body></html>`);
  assert.equal(collectGroup(documentOf(html)).length, 0);
});

test("excluded pages do not enhance direct video links", () => {
  const html = '<!doctype html><html><body><a href="/movie.mp4">Watch</a></body></html>';
  assert.equal(enhanceResponse(html, base), html);
});
