export interface WorldConfig {
  schemaVersion: number;
  worldId: string;
  tickUnit: "month";
  initialYear: number;
  initialMonth: number;
  initialBlockIds: readonly number[];
}

export interface BlockConfig {
  id: number;
  gridX: number;
  gridY: number;
  terrainId: number;
  climateId: number;
  resourceProfileId: number;
}

export interface EdgeConfig {
  id: number;
  fromBlockId: number;
  toBlockId: number;
  kind: string;
  baseCost: number;
  capacity: number;
  seasonal: boolean;
}

export interface RawSimConfig {
  configVersion: number;
  world: WorldConfig;
  blocks: readonly BlockConfig[];
  edges: readonly EdgeConfig[];
}

export interface SimConfig extends RawSimConfig {
  blockById: ReadonlyMap<number, BlockConfig>;
  edgeById: ReadonlyMap<number, EdgeConfig>;
}
