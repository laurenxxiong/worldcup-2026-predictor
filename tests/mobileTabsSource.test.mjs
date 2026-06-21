import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

test("wires mobile tab buttons to a shared active panel state", () => {
  assert.match(appSource, /mobileTabs:\s*\[...document\.querySelectorAll\("\[data-mobile-tab\]"\)\]/);
  assert.match(appSource, /function activateMobilePanel\(panel\)/);
  assert.match(appSource, /dataset\.mobilePanel\s*=\s*panel/);
  assert.match(appSource, /setAttribute\("aria-selected",\s*String\(isActive\)\)/);
});

test("keeps phone tab switches anchored to the active panel", () => {
  assert.match(appSource, /function scrollMobilePanelIntoView\(panel\)/);
  assert.match(appSource, /matchMedia\("\(max-width:\s*760px\)"\)/);
  assert.match(appSource, /scrollIntoView\(\{[\s\S]*block:\s*"start"/);
});
