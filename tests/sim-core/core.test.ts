import {
  ConfigValidationError,
  RawSimConfig,
  applyCommand,
  initWorld,
  load,
  loadConfig,
  query,
  serialize,
  step,
} from "../../assets/scripts/sim-core";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error("ASSERTION_FAILED: " + message);
}

function createTestConfig(): RawSimConfig {
  return {
    configVersion: 1,
    world: {
      schemaVersion: 1,
      worldId: "test-world",
      tickUnit: "month",
      initialYear: 1,
      initialMonth: 1,
      initialBlockIds: [1, 2, 3, 4],
    },
    blocks: [
      { id: 1, gridX: 0, gridY: 0, terrainId: 1, climateId: 1, resourceProfileId: 1 },
      { id: 2, gridX: 1, gridY: 0, terrainId: 1, climateId: 1, resourceProfileId: 1 },
      { id: 3, gridX: 0, gridY: 1, terrainId: 1, climateId: 1, resourceProfileId: 1 },
      { id: 4, gridX: 1, gridY: 1, terrainId: 1, climateId: 1, resourceProfileId: 1 },
    ],
    edges: [
      { id: 1, fromBlockId: 1, toBlockId: 2, kind: "land", baseCost: 1, capacity: 1, seasonal: false },
      { id: 2, fromBlockId: 2, toBlockId: 1, kind: "land", baseCost: 1, capacity: 1, seasonal: false },
    ],
  };
}

function run(): void {
  const config = loadConfig(createTestConfig());
  const world = initWorld(7, config);
  const sameSeedWorld = initWorld(7, config);
  assert(world.blockStates.length === 4, "initial block count");
  assert(world.edgeStates.length === 2, "initial edge count");
  assert(world.tick === 0 && world.year === 1 && world.month === 1, "initial time");

  const commandResult = applyCommand(world, { type: "noop", issuedAtTick: 0, payload: {} });
  assert(commandResult.accepted && !commandResult.worldChanged, "noop command contract");
  step(world, 12);
  step(sameSeedWorld, 12);
  assert(world.year === 2 && world.month === 1 && world.tick === 12, "year rollover");
  assert(serialize(world) === serialize(sameSeedWorld), "deterministic empty tick");

  const restored = load(serialize(world), config);
  assert(serialize(restored) === serialize(world), "snapshot round trip");
  const summary = query(restored, { type: "world_summary" });
  assert(summary.blockCount === 4 && summary.edgeCount === 2, "summary query");

  let rejected = false;
  try {
    loadConfig({ ...createTestConfig(), world: { ...createTestConfig().world, initialBlockIds: [99] } });
  } catch (error) {
    rejected = error instanceof ConfigValidationError;
  }
  assert(rejected, "unknown initial block rejected");
  console.log("sim-core smoke tests passed");
}

run();
