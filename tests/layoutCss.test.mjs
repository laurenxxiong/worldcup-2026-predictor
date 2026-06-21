import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

test("keeps the app header compact so the two core panels dominate the viewport", () => {
  assert.match(css, /\.topbar\s*{[^}]*min-height:\s*44px/s);
  assert.match(css, /h1\s*{[^}]*font-size:\s*1rem/s);
  assert.match(css, /\.status-panel\s*{[^}]*display:\s*none/s);
});

test("keeps desktop groups and bracket content scrolling inside their panels", () => {
  assert.match(css, /@media\s*\(min-width:\s*1100px\)/);
  assert.match(css, /\.layout\s*{[^}]*height:\s*100%/s);
  assert.match(css, /\.groups-section,\s*\.bracket-section\s*{[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.groups-grid,\s*\.bracket-scroll\s*{[^}]*overflow:\s*auto/s);
  assert.match(css, /\.groups-grid\s*{[^}]*align-content:\s*start/s);
  assert.match(css, /\.groups-grid\s*{[^}]*grid-auto-rows:\s*max-content/s);
});

test("shows a fixed two-tab switcher on phone layouts", () => {
  assert.match(css, /\.mobile-tabbar\s*{[^}]*display:\s*none/s);
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*\.mobile-tabbar\s*{[^}]*display:\s*grid/s);
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*\.mobile-tabbar\s*{[^}]*position:\s*fixed/s);
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*#app\[data-mobile-panel="groups"\]\s+\.bracket-section\s*{[^}]*display:\s*none/s);
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*#app\[data-mobile-panel="bracket"\]\s+\.groups-section\s*{[^}]*display:\s*none/s);
});
