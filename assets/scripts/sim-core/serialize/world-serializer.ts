import { SimConfig } from "../config/config-types";
import { createWorld } from "../world/world-factory";
import { WorldState } from "../world/world-types";

export function serializeWorld(world: WorldState): string {
  return JSON.stringify({
    snapshotVersion: 1,
    world,
  });
}

export function loadWorld(snapshot: string, config: SimConfig): WorldState {
  const parsed = JSON.parse(snapshot) as { snapshotVersion?: number; world?: WorldState };
  if (parsed.snapshotVersion !== 1 || !parsed.world) throw new Error("SNAPSHOT_UNSUPPORTED_VERSION");
  const world = parsed.world;
  if (!Array.isArray(world.blockStates) || !Array.isArray(world.edgeStates)) throw new Error("SNAPSHOT_INVALID_WORLD");
  const expected = createWorld(world.seed, config);
  if (world.configVersion !== expected.configVersion || world.worldId !== expected.worldId) throw new Error("SNAPSHOT_CONFIG_MISMATCH");
  return {
    ...world,
    blockStates: world.blockStates.map((block) => ({ ...block })),
    edgeStates: world.edgeStates.map((edge) => ({ ...edge })),
  };
}
