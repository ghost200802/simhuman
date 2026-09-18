export type QueryRequest =
  | { type: "world_summary" }
  | { type: "blocks" }
  | { type: "edges" };
