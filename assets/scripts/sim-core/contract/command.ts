export interface Command {
  type: string;
  issuedAtTick: number;
  payload: Record<string, number | string | boolean>;
}

export interface CommandResult {
  accepted: boolean;
  reasonCode?: string;
  worldChanged: boolean;
}
