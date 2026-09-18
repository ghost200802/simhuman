import { JsonAsset, resources } from "cc";
import { RawSimConfig, SimConfig } from "../../sim-core/config/config-types";
import { loadConfig } from "../../sim-core/config/config-loader";

export type SimConfigResourceCallback = (error: Error | null, config?: SimConfig) => void;

interface LoadedJsonAssets {
  world?: JsonAsset;
  blocks?: JsonAsset;
  edges?: JsonAsset;
}

function loadJsonAsset(path: string, callback: (error: Error | null, asset?: JsonAsset) => void): void {
  resources.load(path, JsonAsset, (error, asset) => {
    if (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
      return;
    }
    callback(null, asset);
  });
}

/**
 * Loads the three Cocos JsonAsset resources and hands plain data to the pure core.
 * The resource layer owns Cocos APIs; the simulation core never imports `cc`.
 */
export function loadSimConfigFromResources(callback: SimConfigResourceCallback): void {
  const loaded: LoadedJsonAssets = {};
  let remaining = 3;
  let firstError: Error | null = null;

  const finish = (): void => {
    if (firstError) {
      callback(firstError);
      return;
    }
    if (!loaded.world || !loaded.blocks || !loaded.edges) {
      callback(new Error("SIM_CONFIG_RESOURCE_INCOMPLETE"));
      return;
    }
    try {
      const raw: RawSimConfig = {
        configVersion: 1,
        world: loaded.world.json as RawSimConfig["world"],
        blocks: loaded.blocks.json as RawSimConfig["blocks"],
        edges: loaded.edges.json as RawSimConfig["edges"],
      };
      callback(null, loadConfig(raw));
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  };

  const receive = (key: keyof LoadedJsonAssets) => (error: Error | null, asset?: JsonAsset): void => {
    if (error && !firstError) firstError = error;
    if (asset) loaded[key] = asset;
    remaining -= 1;
    if (remaining === 0) finish();
  };

  loadJsonAsset("sim-core/world", receive("world"));
  loadJsonAsset("sim-core/blocks", receive("blocks"));
  loadJsonAsset("sim-core/edges", receive("edges"));
}
