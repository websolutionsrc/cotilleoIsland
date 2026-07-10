const REQUIRED_FAMILIES = new Set(["character", "environment", "building", "icon", "scene"]);
const FAMILY_STATUSES = new Set(["frozen", "pending_human", "blocked_by_dependency"]);

function error(errors, location, message) {
  errors.push(`${location}: ${message}`);
}

export function validateVisualContracts(document) {
  const errors = [];
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    return { valid: false, errors: ["document: must be an object"], summary: null };
  }
  if (document.schemaVersion !== 1) error(errors, "schemaVersion", "must be 1");
  if (document.release !== "v01.01") error(errors, "release", "must be 'v01.01'");
  if (document.phase !== "F0.1") error(errors, "phase", "must be 'F0.1'");

  const globalTokens = document.globalTokens;
  if (!globalTokens || typeof globalTokens !== "object") {
    error(errors, "globalTokens", "must be an object");
  } else {
    if (globalTokens.styleId !== "storybook-with-volume-v1") error(errors, "globalTokens.styleId", "must use the approved style id");
    if (globalTokens.alphaRequired !== true) error(errors, "globalTokens.alphaRequired", "must be true");
    if (globalTokens.lighting?.direction !== "top_left" || globalTokens.lighting?.angleDegrees !== 30) {
      error(errors, "globalTokens.lighting", "must preserve the approved top-left 30 degree light");
    }
  }

  const families = Array.isArray(document.families) ? document.families : [];
  if (!Array.isArray(document.families)) error(errors, "families", "must be an array");
  const familyIds = new Set();
  for (const [index, family] of families.entries()) {
    const location = `families[${index}]`;
    if (!family || typeof family !== "object" || Array.isArray(family)) {
      error(errors, location, "must be an object");
      continue;
    }
    if (!REQUIRED_FAMILIES.has(family.id)) error(errors, `${location}.id`, "is not a required family");
    if (familyIds.has(family.id)) error(errors, `${location}.id`, `duplicate family '${family.id}'`);
    familyIds.add(family.id);
    if (!FAMILY_STATUSES.has(family.status)) error(errors, `${location}.status`, "has an unsupported value");
    if (!Array.isArray(family.blockedBy)) error(errors, `${location}.blockedBy`, "must be an array");
    if (family.status === "frozen" && family.blockedBy?.length > 0) {
      error(errors, `${location}.blockedBy`, "a frozen contract cannot have blockers");
    }
    if (family.status !== "frozen" && (!family.blockedBy || family.blockedBy.length === 0)) {
      error(errors, `${location}.blockedBy`, "a non-frozen contract must name at least one blocker");
    }
    if (!family.contract || typeof family.contract !== "object" || Array.isArray(family.contract)) {
      error(errors, `${location}.contract`, "must be an object");
    }
  }
  for (const id of REQUIRED_FAMILIES) {
    if (!familyIds.has(id)) error(errors, "families", `missing required family '${id}'`);
  }

  const gates = Array.isArray(document.humanGates) ? document.humanGates : [];
  if (!Array.isArray(document.humanGates)) error(errors, "humanGates", "must be an array");
  const gateIds = new Set();
  for (const [index, gate] of gates.entries()) {
    const location = `humanGates[${index}]`;
    if (!gate?.id) error(errors, `${location}.id`, "is required");
    if (gateIds.has(gate?.id)) error(errors, `${location}.id`, `duplicate gate '${gate.id}'`);
    gateIds.add(gate?.id);
    if (gate?.owner !== "human") error(errors, `${location}.owner`, "must be 'human'");
    if (!Array.isArray(gate?.blocks) || gate.blocks.length === 0) error(errors, `${location}.blocks`, "must contain at least one family");
  }
  for (const [index, family] of families.entries()) {
    for (const blocker of family?.blockedBy ?? []) {
      if (!gateIds.has(blocker)) error(errors, `families[${index}].blockedBy`, `references unknown gate '${blocker}'`);
    }
  }

  const pendingFamilies = families.filter((family) => family?.status !== "frozen").map((family) => family.id);
  return {
    valid: errors.length === 0,
    errors,
    summary: { families: families.length, frozenFamilies: families.length - pendingFamilies.length, pendingFamilies, humanGates: gates.length },
  };
}
