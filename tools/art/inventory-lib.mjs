import fs from "node:fs";
import path from "node:path";

export const ASSET_STATUSES = new Set([
  "draft",
  "rejected",
  "technically_valid",
  "runtime_valid",
  "human_approved",
  "production",
]);

const OWNER_LANES = new Set(["human", "claude", "codex", "shared"]);
const HUMAN_DEPENDENCIES = new Set(["none", "human_blocking", "human_approval"]);
const TOOL_STATUSES = new Set(["ad_hoc", "active", "fallback", "planned"]);
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function addError(errors, location, message) {
  errors.push(`${location}: ${message}`);
}

function requireString(value, location, errors) {
  if (typeof value !== "string" || value.length === 0) {
    addError(errors, location, "must be a non-empty string");
    return false;
  }
  return true;
}

function validateUniqueIds(items, location, errors) {
  const ids = new Set();
  for (const [index, item] of items.entries()) {
    const itemLocation = `${location}[${index}]`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      addError(errors, itemLocation, "must be an object");
      continue;
    }
    if (!requireString(item.id, `${itemLocation}.id`, errors)) continue;
    if (ids.has(item.id)) addError(errors, `${itemLocation}.id`, `duplicate id '${item.id}'`);
    ids.add(item.id);
  }
}

export function readPngMetadata(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 29) {
    throw new Error("file is too short to be a PNG");
  }
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("invalid PNG signature");
  }
  if (buffer.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("PNG does not start with an IHDR chunk");
  }

  const colorType = buffer.readUInt8(25);
  return {
    format: "png",
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer.readUInt8(24),
    colorType,
    alpha: colorType === 4 || colorType === 6,
  };
}

function validateDeclaredPng(asset, fileBuffer, location, errors) {
  let actual;
  try {
    actual = readPngMetadata(fileBuffer);
  } catch (error) {
    addError(errors, `${location}.path`, error instanceof Error ? error.message : String(error));
    return;
  }

  if (!asset.technical) return;
  for (const field of ["format", "width", "height", "bitDepth", "colorType", "alpha"]) {
    if (asset.technical[field] !== actual[field]) {
      addError(
        errors,
        `${location}.technical.${field}`,
        `declares ${JSON.stringify(asset.technical[field])}, actual value is ${JSON.stringify(actual[field])}`,
      );
    }
  }
}

function validateAsset(asset, index, context) {
  const { errors, rootDir, fileApi } = context;
  const location = `assets[${index}]`;
  if (!asset || typeof asset !== "object" || Array.isArray(asset)) return;

  requireString(asset.family, `${location}.family`, errors);
  requireString(asset.role, `${location}.role`, errors);
  const hasPath = requireString(asset.path, `${location}.path`, errors);
  if (!ASSET_STATUSES.has(asset.status)) addError(errors, `${location}.status`, "has an unsupported value");
  if (!OWNER_LANES.has(asset.ownerLane)) addError(errors, `${location}.ownerLane`, "has an unsupported value");
  if (!HUMAN_DEPENDENCIES.has(asset.humanDependency)) {
    addError(errors, `${location}.humanDependency`, "has an unsupported value");
  }
  if (
    (asset.humanDependency === "human_blocking" || asset.humanDependency === "human_approval") &&
    (typeof asset.nextHumanAction !== "string" || asset.nextHumanAction.length === 0)
  ) {
    addError(errors, `${location}.nextHumanAction`, "is required for a human dependency");
  }

  if (!hasPath) return;
  if (asset.path.includes("\\")) {
    addError(errors, `${location}.path`, "must use forward slashes");
    return;
  }

  const absolutePath = path.resolve(rootDir, asset.path);
  if (!fileApi.existsSync(absolutePath)) {
    addError(errors, `${location}.path`, `file does not exist: ${asset.path}`);
    return;
  }
  if (path.extname(asset.path).toLowerCase() === ".png") {
    validateDeclaredPng(asset, fileApi.readFileSync(absolutePath), location, errors);
  }
}

export function validateInventory(inventory, options = {}) {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const fileApi = options.fileApi ?? fs;
  const errors = [];

  if (!inventory || typeof inventory !== "object" || Array.isArray(inventory)) {
    return { valid: false, errors: ["inventory: must be an object"], summary: null };
  }
  if (inventory.schemaVersion !== 1) addError(errors, "schemaVersion", "must be 1");
  if (inventory.release !== "v01.01") addError(errors, "release", "must be 'v01.01'");
  if (inventory.phase !== "F0") addError(errors, "phase", "must be 'F0'");
  requireString(inventory.updated, "updated", errors);

  for (const field of ["assets", "plannedFamilies", "tools"]) {
    if (!Array.isArray(inventory[field])) addError(errors, field, "must be an array");
  }

  const assets = Array.isArray(inventory.assets) ? inventory.assets : [];
  const plannedFamilies = Array.isArray(inventory.plannedFamilies) ? inventory.plannedFamilies : [];
  const tools = Array.isArray(inventory.tools) ? inventory.tools : [];

  validateUniqueIds(assets, "assets", errors);
  validateUniqueIds(plannedFamilies, "plannedFamilies", errors);
  validateUniqueIds(tools, "tools", errors);
  assets.forEach((asset, index) => validateAsset(asset, index, { errors, rootDir, fileApi }));

  for (const [index, family] of plannedFamilies.entries()) {
    if (!family || typeof family !== "object" || Array.isArray(family)) continue;
    const location = `plannedFamilies[${index}]`;
    requireString(family.family, `${location}.family`, errors);
    if (!/^v01\.01\.F0\.[0-7]$/.test(family.targetSubphase ?? "")) {
      addError(errors, `${location}.targetSubphase`, "must match v01.01.F0.0 through v01.01.F0.7");
    }
    if (!OWNER_LANES.has(family.ownerLane)) addError(errors, `${location}.ownerLane`, "has an unsupported value");
    if (!HUMAN_DEPENDENCIES.has(family.humanDependency)) {
      addError(errors, `${location}.humanDependency`, "has an unsupported value");
    }
    requireString(family.gate, `${location}.gate`, errors);
    if (!Array.isArray(family.deliverables) || family.deliverables.length === 0) {
      addError(errors, `${location}.deliverables`, "must contain at least one deliverable");
    }
  }

  for (const [index, tool] of tools.entries()) {
    if (!tool || typeof tool !== "object" || Array.isArray(tool)) continue;
    const location = `tools[${index}]`;
    const hasPath = requireString(tool.path, `${location}.path`, errors);
    requireString(tool.role, `${location}.role`, errors);
    if (!OWNER_LANES.has(tool.ownerLane)) addError(errors, `${location}.ownerLane`, "has an unsupported value");
    if (!TOOL_STATUSES.has(tool.status)) addError(errors, `${location}.status`, "has an unsupported value");
    if (hasPath && tool.path.includes("\\")) addError(errors, `${location}.path`, "must use forward slashes");
    if (hasPath && tool.status !== "planned" && !fileApi.existsSync(path.resolve(rootDir, tool.path))) {
      addError(errors, `${location}.path`, `file does not exist: ${tool.path}`);
    }
  }

  const statusCounts = Object.fromEntries(
    [...ASSET_STATUSES].map((status) => [status, assets.filter((asset) => asset?.status === status).length]),
  );
  const humanBlockers = assets
    .filter((asset) => asset?.humanDependency === "human_blocking")
    .map((asset) => ({ id: asset.id, nextHumanAction: asset.nextHumanAction }));

  return {
    valid: errors.length === 0,
    errors,
    summary: {
      assets: assets.length,
      plannedFamilies: plannedFamilies.length,
      tools: tools.length,
      statusCounts,
      humanBlockers,
    },
  };
}
