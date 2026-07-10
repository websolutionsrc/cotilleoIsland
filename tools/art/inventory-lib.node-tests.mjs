import assert from "node:assert/strict";
import test from "node:test";
import { readPngMetadata, validateInventory } from "./inventory-lib.mjs";

function pngHeader({ width = 16, height = 24, bitDepth = 8, colorType = 6 } = {}) {
  const bytes = Buffer.alloc(29);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes.writeUInt8(bitDepth, 24);
  bytes.writeUInt8(colorType, 25);
  return bytes;
}

function minimalInventory(overrides = {}) {
  return {
    schemaVersion: 1,
    release: "v01.01",
    phase: "F0",
    updated: "2026-07-10",
    assets: [{
      id: "pilot",
      family: "character_master",
      role: "Test pilot",
      path: "pilot.png",
      status: "technically_valid",
      ownerLane: "shared",
      humanDependency: "none",
      technical: { format: "png", width: 16, height: 24, bitDepth: 8, colorType: 6, alpha: true },
    }],
    plannedFamilies: [{
      id: "character-pilot",
      family: "character_master",
      targetSubphase: "v01.01.F0.2",
      ownerLane: "shared",
      humanDependency: "human_approval",
      gate: "Human approves the pilot.",
      deliverables: ["RGBA master"],
    }],
    tools: [],
    ...overrides,
  };
}

function fakeFileApi(buffer = pngHeader()) {
  return { existsSync: () => true, readFileSync: () => buffer };
}

test("reads the PNG IHDR metadata used by the inventory", () => {
  assert.deepEqual(readPngMetadata(pngHeader()), {
    format: "png", width: 16, height: 24, bitDepth: 8, colorType: 6, alpha: true,
  });
});

test("accepts a valid minimal inventory", () => {
  const result = validateInventory(minimalInventory(), { rootDir: ".", fileApi: fakeFileApi() });
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("rejects duplicate asset ids", () => {
  const inventory = minimalInventory();
  inventory.assets.push({ ...inventory.assets[0] });
  const result = validateInventory(inventory, { rootDir: ".", fileApi: fakeFileApi() });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /duplicate id 'pilot'/);
});

test("requires a concrete next action at a human gate", () => {
  const inventory = minimalInventory();
  inventory.assets[0].humanDependency = "human_blocking";
  const result = validateInventory(inventory, { rootDir: ".", fileApi: fakeFileApi() });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /nextHumanAction/);
});

test("rejects declared PNG metadata that does not match the file", () => {
  const result = validateInventory(minimalInventory(), {
    rootDir: ".",
    fileApi: fakeFileApi(pngHeader({ width: 32 })),
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /declares 16, actual value is 32/);
});
