import { RawSimConfig, SimConfig } from "./config-types";
import { validateRawConfig } from "./config-validator";

function freezeArray<T>(items: readonly T[]): readonly T[] {
  return Object.freeze(items.slice());
}

export function loadConfig(raw: RawSimConfig): SimConfig {
  validateRawConfig(raw);
  const blocks = freezeArray(raw.blocks);
  const edges = freezeArray(raw.edges);
  return Object.freeze({
    configVersion: raw.configVersion,
    world: Object.freeze({ ...raw.world, initialBlockIds: freezeArray(raw.world.initialBlockIds) }),
    blocks,
    edges,
    blockById: new Map(blocks.map((block) => [block.id, block])),
    edgeById: new Map(edges.map((edge) => [edge.id, edge])),
  });
}
