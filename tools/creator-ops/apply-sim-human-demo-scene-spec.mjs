import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const specPath = path.join(projectRoot, "assets", "specs", "sim-human-demo.scene-spec.json");
const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));

if (spec.schemaVersion !== 1 || spec.assetType !== "scene-settings") {
  throw new Error("SIM_HUMAN_DEMO_SCENE_SPEC_INVALID");
}

const scenePath = path.join(projectRoot, spec.scenePath);
const scene = JSON.parse(fs.readFileSync(scenePath, "utf8"));
const sceneIndex = scene.findIndex((item) => item.__type__ === "cc.Scene");
const canvasIndex = scene.findIndex((item) => item.__type__ === "cc.Node" && item._name === "Canvas");
const cameraNodeIndex = scene.findIndex((item) => item.__type__ === "cc.Node" && item._name === "Camera");
const cameraIndex = scene.findIndex((item) => item.__type__ === "cc.Camera");
const scriptComponentIndex = scene.findIndex(
  (item) =>
    (item.__type__ === "cc.Component" && item._scriptUuid) ||
    item.__type__ === spec.script.serializedType,
);

if (sceneIndex < 0 || canvasIndex < 0 || cameraNodeIndex < 0 || cameraIndex < 0 || scriptComponentIndex < 0) {
  throw new Error("SIM_HUMAN_DEMO_SCENE_OBJECTS_MISSING");
}

const sceneObject = scene[sceneIndex];
const canvas = scene[canvasIndex];
const cameraNode = scene[cameraNodeIndex];
const camera = scene[cameraIndex];
const demoNode = scene.find((item) => item.__type__ === "cc.Node" && item._name === "SimHumanDemo");

if (!demoNode) {
  throw new Error("SIM_HUMAN_DEMO_NODE_MISSING");
}

canvas._lpos = {
  __type__: "cc.Vec3",
  x: spec.canvas.position.x,
  y: spec.canvas.position.y,
  z: spec.canvas.position.z,
};

sceneObject._children = [{ __id__: canvasIndex }];
canvas._parent = { __id__: sceneIndex };
canvas._children = [
  { __id__: cameraNodeIndex },
  ...canvas._children.filter((child) => child.__id__ !== cameraNodeIndex),
];
canvas._layer = spec.canvas.layer;
demoNode._layer = spec.canvas.layer;

cameraNode._parent = { __id__: canvasIndex };
cameraNode._lpos = {
  __type__: "cc.Vec3",
  x: spec.camera.position.x,
  y: spec.camera.position.y,
  z: spec.camera.position.z,
};
cameraNode._layer = spec.camera.layer;

camera._projection = 0;
camera._orthoHeight = spec.camera.orthoHeight;
camera._near = spec.camera.near;
camera._far = spec.camera.far;
camera._priority = spec.camera.priority;
camera._clearFlags = spec.camera.clearFlags;
camera._visibility = spec.camera.visibility;
camera._color = { __type__: "cc.Color", r: 0, g: 0, b: 0, a: 0 };

const scriptComponent = scene[scriptComponentIndex];
scriptComponent.__type__ = spec.script.serializedType;
delete scriptComponent._scriptUuid;

fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2) + "\n", "utf8");
console.log(`generated ${path.relative(projectRoot, scenePath)}`);
