import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { focusElement } from "../dist/exif/focus.js";

function target() {
  const { document, Event } = parseHTML('<a href="/photo.jpg">Photo</a>');
  const element = document.querySelector("a")!;
  let focused = false;
  element.focus = (options) => {
    assert.deepEqual(options, { preventScroll: true });
    focused = true;
  };
  return { element, Event, focused: () => focused };
}

test("pointer focus keeps the destination focused while suppressing only its focus ring", () => {
  const { element, focused } = target();
  focusElement(element, false);
  assert.equal(focused(), true);
  assert.equal(element.hasAttribute("data-popcase-pointer-focus"), true);
});

test("keyboard interaction restores the ring without requiring focus to move", () => {
  const { element, Event } = target();
  focusElement(element, false);
  element.dispatchEvent(new Event("keydown"));
  assert.equal(element.hasAttribute("data-popcase-pointer-focus"), false);
});

test("pointer ring suppression does not survive blur or subsequent keyboard focus", () => {
  const { element, Event } = target();
  focusElement(element, false);
  element.dispatchEvent(new Event("blur"));
  assert.equal(element.hasAttribute("data-popcase-pointer-focus"), false);
  focusElement(element, false);
  focusElement(element, true);
  assert.equal(element.hasAttribute("data-popcase-pointer-focus"), false);
});
