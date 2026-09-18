import { WorldState } from "./world-types";
import { QueryRequest } from "../contract/query";

export type { QueryRequest } from "../contract/query";

export type QueryResult = Record<string, unknown>;

export function queryWorld(world: WorldState, request: QueryRequest): QueryResult {
  if (request.type === "world_summary") {
    return {
      worldId: world.worldId,
      tick: world.tick,
      year: world.year,
      month: world.month,
      blockCount: world.blockStates.length,
      edgeCount: world.edgeStates.length,
    };
  }
  if (request.type === "blocks") return { blocks: world.blockStates.map((block) => ({ ...block })) };
  if (request.type === "edges") return { edges: world.edgeStates.map((edge) => ({ ...edge })) };
  throw new Error("QUERY_UNKNOWN_TYPE: " + (request as { type: string }).type);
}
