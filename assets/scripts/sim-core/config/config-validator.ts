import { BlockConfig, EdgeConfig, RawSimConfig, WorldConfig } from "./config-types";

export interface ConfigIssue {
  code: string;
  path: string;
  message: string;
}

export class ConfigValidationError extends Error {
  public readonly issues: ConfigIssue[];

  public constructor(issues: ConfigIssue[]) {
    super(issues.map((issue) => issue.code + ": " + issue.path + " " + issue.message).join("\n"));
    this.name = "ConfigValidationError";
    this.issues = issues;
  }
}

function add(issues: ConfigIssue[], code: string, path: string, message: string): void {
  issues.push({ code, path, message });
}

function validateWorld(world: WorldConfig, issues: ConfigIssue[]): void {
  if (!world || typeof world !== "object") {
    add(issues, "CONFIG_INVALID_OBJECT", "world", "must be an object");
    return;
  }
  if (world.schemaVersion !== 1) add(issues, "CONFIG_UNSUPPORTED_SCHEMA", "world.schemaVersion", "must be 1");
  if (typeof world.worldId !== "string" || world.worldId.length === 0) add(issues, "CONFIG_INVALID_FIELD", "world.worldId", "must be a non-empty string");
  if (world.tickUnit !== "month") add(issues, "CONFIG_INVALID_TICK_UNIT", "world.tickUnit", "must be month");
  if (!Number.isInteger(world.initialYear)) add(issues, "CONFIG_INVALID_FIELD", "world.initialYear", "must be an integer");
  if (!Number.isInteger(world.initialMonth) || world.initialMonth < 1 || world.initialMonth > 12) add(issues, "CONFIG_INVALID_FIELD", "world.initialMonth", "must be an integer from 1 to 12");
  if (!Array.isArray(world.initialBlockIds) || world.initialBlockIds.length === 0) add(issues, "CONFIG_INVALID_FIELD", "world.initialBlockIds", "must be a non-empty array");
}

function validateBlocks(blocks: readonly BlockConfig[], issues: ConfigIssue[]): Map<number, BlockConfig> {
  const byId = new Map<number, BlockConfig>();
  if (!Array.isArray(blocks)) {
    add(issues, "CONFIG_INVALID_FIELD", "blocks", "must be an array");
    return byId;
  }
  blocks.forEach((block, index) => {
    const path = "blocks[" + index + "]";
    if (!block || typeof block !== "object") {
      add(issues, "CONFIG_INVALID_OBJECT", path, "must be an object");
      return;
    }
    if (!Number.isInteger(block.id)) add(issues, "CONFIG_INVALID_FIELD", path + ".id", "must be an integer");
    else if (byId.has(block.id)) add(issues, "CONFIG_DUPLICATE_ID", path + ".id", "duplicates " + block.id);
    else byId.set(block.id, block);
    for (const field of ["gridX", "gridY", "terrainId", "climateId", "resourceProfileId"] as const) {
      if (!Number.isInteger(block[field])) add(issues, "CONFIG_INVALID_FIELD", path + "." + field, "must be an integer");
    }
  });
  return byId;
}

function validateEdges(edges: readonly EdgeConfig[], blockById: ReadonlyMap<number, BlockConfig>, issues: ConfigIssue[]): Map<number, EdgeConfig> {
  const byId = new Map<number, EdgeConfig>();
  if (!Array.isArray(edges)) {
    add(issues, "CONFIG_INVALID_FIELD", "edges", "must be an array");
    return byId;
  }
  edges.forEach((edge, index) => {
    const path = "edges[" + index + "]";
    if (!edge || typeof edge !== "object") {
      add(issues, "CONFIG_INVALID_OBJECT", path, "must be an object");
      return;
    }
    if (!Number.isInteger(edge.id)) add(issues, "CONFIG_INVALID_FIELD", path + ".id", "must be an integer");
    else if (byId.has(edge.id)) add(issues, "CONFIG_DUPLICATE_ID", path + ".id", "duplicates " + edge.id);
    else byId.set(edge.id, edge);
    if (!blockById.has(edge.fromBlockId)) add(issues, "CONFIG_UNKNOWN_BLOCK_REF", path + ".fromBlockId", "references " + edge.fromBlockId);
    if (!blockById.has(edge.toBlockId)) add(issues, "CONFIG_UNKNOWN_BLOCK_REF", path + ".toBlockId", "references " + edge.toBlockId);
    if (typeof edge.kind !== "string" || edge.kind.length === 0) add(issues, "CONFIG_INVALID_FIELD", path + ".kind", "must be a non-empty string");
    if (typeof edge.baseCost !== "number" || !Number.isFinite(edge.baseCost) || edge.baseCost < 0) add(issues, "CONFIG_INVALID_FIELD", path + ".baseCost", "must be a non-negative number");
    if (typeof edge.capacity !== "number" || !Number.isFinite(edge.capacity) || edge.capacity < 0) add(issues, "CONFIG_INVALID_FIELD", path + ".capacity", "must be a non-negative number");
    if (typeof edge.seasonal !== "boolean") add(issues, "CONFIG_INVALID_FIELD", path + ".seasonal", "must be boolean");
  });
  return byId;
}

export function validateRawConfig(raw: RawSimConfig): void {
  const issues: ConfigIssue[] = [];
  if (!raw || typeof raw !== "object") {
    throw new ConfigValidationError([{ code: "CONFIG_INVALID_OBJECT", path: "root", message: "must be an object" }]);
  }
  if (raw.configVersion !== 1) add(issues, "CONFIG_UNSUPPORTED_VERSION", "configVersion", "must be 1");
  validateWorld(raw.world, issues);
  const blockById = validateBlocks(raw.blocks, issues);
  validateEdges(raw.edges, blockById, issues);
  if (raw.world && Array.isArray(raw.world.initialBlockIds)) {
    const seen = new Set<number>();
    raw.world.initialBlockIds.forEach((id, index) => {
      if (seen.has(id)) add(issues, "CONFIG_DUPLICATE_INITIAL_BLOCK", "world.initialBlockIds[" + index + "]", "duplicates " + id);
      seen.add(id);
      if (!blockById.has(id)) add(issues, "CONFIG_UNKNOWN_BLOCK_REF", "world.initialBlockIds[" + index + "]", "references " + id);
    });
  }
  if (issues.length > 0) throw new ConfigValidationError(issues);
}
