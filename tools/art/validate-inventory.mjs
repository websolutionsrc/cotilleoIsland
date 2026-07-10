#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { validateInventory } from "./inventory-lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const inventoryPath = path.join(rootDir, "docs/art/visual_asset_inventory.json");

let inventory;
try {
  inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
} catch (error) {
  console.error(`Art inventory could not be read: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
  process.exit();
}

const result = validateInventory(inventory, { rootDir });
if (!result.valid) {
  console.error(`Art inventory failed with ${result.errors.length} error(s):`);
  for (const error of result.errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const { summary } = result;
  console.log(
    `Art inventory valid: ${summary.assets} assets, ${summary.plannedFamilies} planned families, ${summary.tools} tools.`,
  );
  console.log(`Asset status counts: ${JSON.stringify(summary.statusCounts)}`);
  if (summary.humanBlockers.length > 0) {
    console.log("Human-blocking gates:");
    for (const blocker of summary.humanBlockers) {
      console.log(`- ${blocker.id}: ${blocker.nextHumanAction}`);
    }
  }
}
