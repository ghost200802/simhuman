import { WorldState } from "../world/world-types";

export interface StepResult {
  tick: number;
  year: number;
  month: number;
}

export function stepWorld(world: WorldState, count: number): StepResult {
  if (!Number.isInteger(count) || count < 0) throw new Error("STEP_INVALID_COUNT");
  for (let index = 0; index < count; index += 1) {
    world.tick += 1;
    world.month += 1;
    if (world.month > 12) {
      world.month = 1;
      world.year += 1;
    }
  }
  return { tick: world.tick, year: world.year, month: world.month };
}
