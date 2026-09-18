export interface BlockState {
  id: number;
  gridX: number;
  gridY: number;
  terrainId: number;
  climateId: number;
  resourceProfileId: number;
}

export interface EdgeState {
  id: number;
  fromBlockId: number;
  toBlockId: number;
  kind: string;
  baseCost: number;
  capacity: number;
  seasonal: boolean;
}

export interface WorldState {
  schemaVersion: number;
  configVersion: number;
  worldId: string;
  seed: number;
  rngState: number;
  tick: number;
  year: number;
  month: number;
  blockStates: BlockState[];
  edgeStates: EdgeState[];
}
