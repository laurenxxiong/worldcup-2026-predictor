import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

test("uses a fresh live-data cache after the match-status parsing fix", () => {
  assert.match(appSource, /const CACHE_KEY = "world-cup-2026-live-cache-v2";/);
});
