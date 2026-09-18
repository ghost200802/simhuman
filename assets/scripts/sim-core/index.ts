import { Command, CommandResult } from "./contract/command";
import { SimConfig } from "./config/config-types";
import { loadConfig } from "./config/config-loader";
import { serializeWorld, loadWorld } from "./serialize/world-serializer";
import { stepWorld, StepResult } from "./tick/step";
import { QueryRequest, QueryResult, queryWorld } from "./world/world-query";
import { createWorld } from "./world/world-factory";
import { WorldState } from "./world/world-types";

export { loadConfig };
export * from "./config/config-types";
export * from "./config/config-validator";
export * from "./contract/command";
export * from "./world/world-types";
export * from "./world/world-query";

export function initWorld(seed: number, config: SimConfig): WorldState {
  return createWorld(seed, config);
}

export function applyCommand(world: WorldState, command: Command): CommandResult {
  if (command.type !== "noop") {
    return { accepted: false, reasonCode: "COMMAND_UNKNOWN_TYPE", worldChanged: false };
  }
  if (command.issuedAtTick !== world.tick) {
    return { accepted: false, reasonCode: "COMMAND_TICK_MISMATCH", worldChanged: false };
  }
  return { accepted: true, worldChanged: false };
}

export function step(world: WorldState, count: number): StepResult {
  return stepWorld(world, count);
}

export function query(world: WorldState, request: QueryRequest): QueryResult {
  return queryWorld(world, request);
}

export function serialize(world: WorldState): string {
  return serializeWorld(world);
}

export function load(snapshot: string, config: SimConfig): WorldState {
  return loadWorld(snapshot, config);
}
