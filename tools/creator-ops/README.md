# Cocos 资源生成入口

SimHuman 的 Cocos 场景与 prefab 规格先写入 `assets/specs/*.prefab-spec.json`，再通过生成脚本产出 Creator 资源。

本 Demo 的生成命令：

```powershell
node tools/creator-ops/generate-sim-human-demo-prefab.mjs
node tools/creator-ops/apply-sim-human-demo-scene-spec.mjs
```

生成后重新打开 Cocos Creator，让 Asset DB 为生成的 prefab 创建或更新 `.meta`。

禁止直接手写 `*.scene`、`*.prefab` 和 `*.meta` 作为设计源文件；这些文件只接受 Cocos 导入或生成脚本产物。
