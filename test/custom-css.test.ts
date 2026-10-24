import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { encodeMarker, decodeMarker } from "../dist/markers.js";
import { normalizeConfig } from "../dist/config.js";
import { enhanceResponse } from "../dist/server.js";
import { validateCustomCss } from "../dist/settings.js";
import { mountCustomCss } from "../dist/client/custom-css.js";

test("CSS validation accepts native nesting and at-rules without a feature allowlist", () => {
  for (const css of [
    "",
    " ",
    "--accent: red; color: var(--accent);",
    "&::backdrop { background: #222; }",
    "button, .yarl__toolbar { color: red; &:hover { color: blue; } }",
    "@media (width < 600px) { button { padding: 4px; } }",
    "@supports (display: grid) { @container (width > 200px) { button { color: red; } } }",
    '@import url("https://example.org/styles.css");',
    '@font-face { font-family: Custom; src: url("/font.woff2"); }',
    "@property --accent { syntax: '<color>'; inherits: true; initial-value: red; }",
    "@keyframes custom { to { opacity: 0; } }",
    "@future-rule { future: syntax; }",
    "& + * { display: none; }",
    'button { background: url("/image.svg"); content: "</style><script>alert(1)</script>"; }',
    `/*${"a".repeat(100000)}*/`,
    `/*${"中".repeat(32769)}*/`,
  ])
    assert.equal(validateCustomCss(css), undefined, css);
  assert.match(validateCustomCss("button {\n color red;\n}")!, /line 2/);
});

test("custom CSS is transported once as inert encoded text and mounted after default styles", () => {
  const css = 'button { color: red; content: "</style><script>alert(1)</script>"; }';
  const page = `<template data-popcase-page>${encodeMarker({ ...normalizeConfig(), customCss: css })}</template>`;
  const block = `<!--popcase:${encodeMarker({ nodes: [{ source: "https://example.org/a.jpg" }] })}--><figure class="emdash-image"><img src="/a.jpg"></figure><!--/popcase-->`;
  const html = enhanceResponse(
    `<!doctype html><html><head>${page}<link rel="stylesheet" data-popcase-style href="/default.css"></head><body>${block}${block}<a href="/a.mp4">Video</a></body></html>`,
    "https://example.org/",
  );
  const { document } = parseHTML(html);
  const template = document.querySelector<HTMLTemplateElement>(
    "template[data-popcase-custom-css]",
  )!;
  assert.equal(document.querySelectorAll("template[data-popcase-custom-css]").length, 1);
  assert.equal(decodeMarker(template.content.firstChild!.textContent!), css);
  assert.equal(document.querySelector("style"), null);
  assert.equal(document.querySelector("script"), null);
  const anchors = document.querySelectorAll<HTMLAnchorElement>("a[data-popcase]");
  assert.equal(anchors.length, 3);
  for (const anchor of anchors)
    assert.equal("customCss" in JSON.parse(anchor.dataset.popcaseConfig!), false);
  const style = mountCustomCss(document)!;
  assert.equal(style.textContent, `.popcase-dialog[data-popcase-root] {\n${css}\n}`);
  assert.equal(document.head.lastElementChild, style);
  assert.equal(document.querySelectorAll("[data-popcase-custom-style]").length, 1);
  assert.equal(document.querySelector("script"), null);
  style.remove();
  assert.equal(document.querySelector("[data-popcase-custom-style]"), null);
});

test("empty or absent custom CSS does not create a stylesheet", () => {
  for (const content of [
    "",
    `<template data-popcase-custom-css>${encodeMarker(" \n")}</template>`,
  ]) {
    const { document } = parseHTML(`<html><head>${content}</head><body></body></html>`);
    assert.equal(mountCustomCss(document), undefined);
    assert.equal(document.querySelector("style"), null);
  }
});
