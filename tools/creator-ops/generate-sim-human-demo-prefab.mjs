import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const specPath = path.join(projectRoot, "assets", "specs", "sim-human-demo.prefab-spec.json");
const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));

if (spec.schemaVersion !== 1 || spec.assetType !== "prefab") {
  throw new Error("SIM_HUMAN_DEMO_PREFAB_SPEC_INVALID");
}

const scriptPath = path.join(projectRoot, spec.root.script.assetPath);
const scriptMetaPath = scriptPath + ".meta";
const scriptMeta = JSON.parse(fs.readFileSync(scriptMetaPath, "utf8"));
if (scriptMeta.uuid !== spec.root.script.uuid) {
  throw new Error("SIM_HUMAN_DEMO_SCRIPT_UUID_MISMATCH");
}
if (typeof spec.root.script.serializedType !== "string" || spec.root.script.serializedType.length === 0) {
  throw new Error("SIM_HUMAN_DEMO_SCRIPT_SERIALIZED_TYPE_MISSING");
}

const prefab = [
  {
    __type__: "cc.Prefab",
    _name: spec.prefabId,
    _objFlags: 0,
    _native: "",
    data: { __id__: 1 },
    optimizationPolicy: 0,
    asyncLoadAssets: false,
    persistent: false,
  },
  {
    __type__: "cc.Node",
    _name: spec.root.name,
    _objFlags: 0,
    _parent: null,
    _children: [],
    _active: true,
    _components: [{ __id__: 3 }],
    _prefab: { __id__: 2 },
    _lpos: { __type__: "cc.Vec3", x: 0, y: 0, z: 0 },
    _lrot: { __type__: "cc.Quat", x: 0, y: 0, z: 0, w: 1 },
    _lscale: { __type__: "cc.Vec3", x: 1, y: 1, z: 1 },
    _layer: 524288,
    _euler: { __type__: "cc.Vec3", x: 0, y: 0, z: 0 },
    _id: "",
  },
  {
    __type__: "cc.PrefabInfo",
    root: { __id__: 1 },
    asset: { __id__: 0 },
    fileId: "sim-human-demo-root",
  },
  {
    __type__: spec.root.script.serializedType,
    _name: "",
    _objFlags: 0,
    node: { __id__: 1 },
    _enabled: true,
    __prefab: null,
    _id: "",
  },
];

const outputPath = path.join(projectRoot, spec.generation.target);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(prefab, null, 2) + "\n", "utf8");
console.log(`generated ${path.relative(projectRoot, outputPath)}`);
