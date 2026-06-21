import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

test("requires a deliberate hold before pointer sorting starts", () => {
  assert.match(appSource, /const LONG_PRESS_DRAG_DELAY_MS = 450;/);
  assert.match(appSource, /longPressTimer:\s*null/);
  assert.match(appSource, /setTimeout\(\(\) => activatePointerDrag\(event\.pointerId\), LONG_PRESS_DRAG_DELAY_MS\)/);
  assert.match(appSource, /function activatePointerDrag\(pointerId\)/);
  assert.match(appSource, /drag\.activated = true/);
  assert.match(appSource, /if \(!drag\.activated\) return;/);
});

test("cancels pending row sorting when the user scrolls before the hold finishes", () => {
  assert.match(appSource, /const LONG_PRESS_CANCEL_DISTANCE_PX = 10;/);
  assert.match(appSource, /function cancelPendingPointerDrag\(\)/);
  assert.match(appSource, /clearTimeout\(state\.longPressTimer\)/);
  assert.match(appSource, /distance > LONG_PRESS_CANCEL_DISTANCE_PX/);
  assert.match(appSource, /cancelPendingPointerDrag\(\)/);
});

test("prevents mouse native drag from bypassing the long-press gate", () => {
  assert.match(appSource, /row\.draggable = false;/);
  assert.match(appSource, /row\.addEventListener\("dragstart", \(event\) => event\.preventDefault\(\)\)/);
});

test("lets touch screens scroll vertically until the row is armed for dragging", () => {
  assert.match(css, /\.team-row\s*{[^}]*touch-action:\s*pan-y/s);
  assert.match(css, /\.team-row\.is-arming-drag\s*{[^}]*border-color/s);
});
