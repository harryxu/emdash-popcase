import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { youtubeSource, youtubeEmbedUrl } from "../dist/youtube.js";
import { enhanceResponse } from "../dist/server.js";
import { collectGroup } from "../src/client/group.ts";
import { encodeMarker } from "../dist/markers.js";
import { contribution } from "./helpers.ts";

const base = "https://blog.example/posts/story";
const id = "M7lc1UVf-VE";
async function enhance(body: string) {
  const marker = (await contribution({ kind: "content", content: { collection: "posts" } }))!.html;
  return parseHTML(
    enhanceResponse(`<!doctype html><html><head>${marker}</head><body>${body}</body></html>`, base),
  ).document;
}

test("YouTube classification accepts only supported single-video URLs on exact hosts", () => {
  for (const href of [
    `https://youtube.com/watch?v=${id}`,
    `https://www.youtube.com/watch?v=${id}&list=ignored`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}?si=ignored`,
    `https://www.youtube.com/shorts/${id}`,
  ]) {
    const result = youtubeSource(href, base)!;
    assert.equal(result.videoId, id);
    assert.equal(result.src, href);
    assert.equal(result.shorts, href.includes("/shorts/"));
  }
  for (const href of [
    `https://youtube.com.evil.example/watch?v=${id}`,
    `https://evil.example/youtu.be/${id}`,
    `https://youtube.com:8443/watch?v=${id}`,
    `https://user:pass@youtube.com/watch?v=${id}`,
    `https://youtube.com/embed/${id}`,
    `https://youtube.com/live/${id}`,
    "https://youtube.com/@channel/live",
    "https://youtube.com/playlist?list=abc",
    "https://youtube.com/watch?v=invalid",
    `https://youtu.be/${id}/extra`,
    "javascript:alert(1)",
    "#watch",
    "/watch?v=M7lc1UVf-VE",
  ]) {
    assert.equal(youtubeSource(href, base), undefined, href);
  }
});

test("YouTube start times support seconds and h/m/s in query strings and fragments", () => {
  for (const [suffix, seconds] of [
    ["&t=90", 90],
    ["&t=1h2m3s", 3723],
    ["&start=45", 45],
    ["#t=1m30s", 90],
    ["&t=bad&start=12", 12],
    ["&t=0&start=12", 0],
    ["&t=-1", 0],
    ["&t=1.5", 0],
    ["&t=999999999999999999999", 0],
  ]) {
    assert.equal(youtubeSource(`https://youtube.com/watch?v=${id}${suffix}`, base)?.start, seconds);
  }
  const result = youtubeSource(
    `https://youtube.com/watch?v=${id}&t=90&autoplay=0&loop=1&list=abc`,
    base,
  )!;
  const embed = new URL(youtubeEmbedUrl(result));
  assert.equal(embed.origin, "https://www.youtube-nocookie.com");
  assert.equal(embed.pathname, `/embed/${id}`);
  assert.deepEqual(Object.fromEntries(embed.searchParams), {
    autoplay: "1",
    playsinline: "1",
    controls: "1",
    fs: "0",
    hl: "en",
    start: "90",
  });
  const manual = new URL(youtubeEmbedUrl(result, false));
  assert.equal(manual.searchParams.get("autoplay"), "0");
  assert.equal(manual.searchParams.get("controls"), "1");
  assert.equal(manual.searchParams.get("start"), "90");
});

test("YouTube text and image links retain fallback, markup, layout, poster and caption", async () => {
  const href = `https://youtu.be/${id}?t=30&si=original`;
  const document = await enhance(
    `<header><a href="${href}" target="_blank" rel="noopener"><strong>Watch</strong> the demo</a></header>` +
      `<figure class="emdash-image"><a href="https://youtube.com/shorts/${id}"><img src="/poster.jpg" alt="Preview" width="480" height="320" srcset="/poster.jpg 480w"></a><figcaption>A &amp; B</figcaption></figure>`,
  );
  const [text, image] = collectGroup(document);
  assert.equal(text.anchor.getAttribute("href"), href);
  assert.equal(text.anchor.getAttribute("target"), "_blank");
  assert.equal(text.anchor.getAttribute("rel"), "noopener");
  assert.equal(text.anchor.querySelector("strong")?.textContent, "Watch");
  assert.equal(text.anchor.getAttribute("aria-label"), "Open video: Watch the demo");
  assert.deepEqual(text.slide, {
    type: "youtube",
    src: href,
    videoId: id,
    start: 30,
    shorts: false,
    alt: "Watch the demo",
    description: "",
  });
  assert.equal(image.slide.type, "youtube");
  if (image.slide.type !== "youtube") throw new Error("Expected a YouTube slide.");
  assert.equal(image.slide.poster, "https://blog.example/poster.jpg");
  assert.equal(image.slide.description, "A & B");
  assert.equal(image.slide.shorts, true);
  assert.equal(document.querySelector("img")?.getAttribute("srcset"), "/poster.jpg 480w");
  assert.equal(document.querySelector("img")?.getAttribute("width"), "480");
  assert.equal(
    document.querySelectorAll("iframe, script[src*=youtube], link[href*=youtube]").length,
    0,
  );
});

test("YouTube occurrences mix with images and direct videos without deduplication", async () => {
  const link = `<a href="https://youtu.be/${id}">Watch</a>`;
  const image = `<!--popcase:${encodeMarker({ nodes: [{ source: "https://blog.example/image.jpg" }] })}--><figure class="emdash-image"><img src="/image.jpg"></figure><!--/popcase-->`;
  const group = collectGroup(await enhance(`${link}${image}<a href="/movie.mp4">File</a>${link}`));
  assert.deepEqual(
    group.map(({ slide }) => slide.type ?? "image"),
    ["youtube", "image", "video", "youtube"],
  );
  assert.notEqual(group[0].anchor, group[3].anchor);
});

test("YouTube downloads, editor surfaces, existing embeds and ineligible pages remain unchanged", async () => {
  const href = `https://youtu.be/${id}`;
  const body =
    `<a href="${href}" download>Download</a><div contenteditable="true"><a href="${href}">Edit</a></div>` +
    `<div class="emdash-inline-editor"><a href="${href}">Edit</a></div><figure class="emdash-video"><a href="${href}">Native</a></figure>` +
    `<iframe src="https://youtube.com/embed/${id}"></iframe>`;
  assert.equal(collectGroup(await enhance(body)).length, 0);
  const html = `<!doctype html><html><body><a href="${href}">Watch</a></body></html>`;
  assert.equal(enhanceResponse(html, base), html);
});
