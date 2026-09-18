import { SimConfig } from "../config/config-types";
import { normalizeSeed } from "../rng/deterministic-rng";
import { BlockState, EdgeState, WorldState } from "./world-types";

export function createWorld(seed: number, config: SimConfig): WorldState {
  const blocks: BlockState[] = config.world.initialBlockIds
    .slice()
    .sort((a, b) => a - b)
    .map((id) => {
      const block = config.blockById.get(id);
      if (!block) throw new Error("WORLD_UNKNOWN_BLOCK: " + id);
      return { ...block };
    });
  const edges: EdgeState[] = config.edges
    .slice()
    .sort((a, b) => a.id - b.id)
    .filter((edge) => config.blockById.has(edge.fromBlockId) && config.blockById.has(edge.toBlockId))
    .map((edge) => ({ ...edge }));
  return {
    schemaVersion: 1,
    configVersion: config.configVersion,
    worldId: config.world.worldId,
    seed: seed >>> 0,
    rngState: normalizeSeed(seed),
    tick: 0,
    year: config.world.initialYear,
    month: config.world.initialMonth,
    blockStates: blocks,
    edgeStates: edges,
  };
}
