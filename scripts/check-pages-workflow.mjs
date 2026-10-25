import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8");

for (const expected of [
  "branches: [main]",
  "workflow_dispatch:",
  "pages: write",
  "id-token: write",
  "actions/configure-pages@v5",
  "npm ci",
  "npm run build",
  "actions/upload-pages-artifact@v3",
  "path: ./dist",
  "actions/deploy-pages@v4",
]) {
  assert.match(workflow, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
