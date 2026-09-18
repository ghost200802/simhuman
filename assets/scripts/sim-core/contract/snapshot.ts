import { WorldState } from "../world/world-types";

export interface SnapshotEnvelope {
  snapshotVersion: number;
  world: WorldState;
}
