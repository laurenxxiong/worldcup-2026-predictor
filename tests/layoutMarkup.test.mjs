import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("does not render the best third-place summary strip in the bracket panel", () => {
  assert.doesNotMatch(html, /third-place-strip/);
  assert.doesNotMatch(html, /当前最佳第三名/);
});

test("renders a mobile tab bar for switching between groups and bracket", () => {
  assert.match(html, /role="tablist"/);
  assert.match(html, /class="mobile-tabbar"/);
  assert.match(html, /data-mobile-tab="groups"/);
  assert.match(html, /data-mobile-tab="bracket"/);
  assert.match(html, /aria-controls="groups-panel"/);
  assert.match(html, /aria-controls="bracket-panel"/);
});
