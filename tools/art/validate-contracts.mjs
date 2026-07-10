#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { validateVisualContracts } from "./contract-lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const contractPath = path.join(rootDir, "docs/art/contracts/visual-contracts.json");

const document = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const result = validateVisualContracts(document);
if (!result.valid) {
  console.error(`Visual contracts failed with ${result.errors.length} error(s):`);
  for (const item of result.errors) console.error(`- ${item}`);
  process.exitCode = 1;
} else {
  console.log(`Visual contracts valid: ${result.summary.families} families, ${result.summary.frozenFamilies} frozen.`);
  console.log(`Pending families: ${result.summary.pendingFamilies.join(", ") || "none"}.`);
  console.log(`Human gates: ${result.summary.humanGates}.`);
}
