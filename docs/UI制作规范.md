# SimHuman UI 制作规范

**适用：** 任何创建、修改、调整 UI 的任务。
**边界：** 本规范不含具体界面内容、美术风格、布局数值与数值公式。

---

## 一、硬性禁止

1. 不得用文本编辑、脚本写入或 shell 重定向创建、修改、修复 `.prefab`、`.scene`、`.anim`、`.meta`。
2. 不得手写 prefab 序列化内容，不得维护 `__id__` 索引、`cc.PrefabInfo`、`cc.CompPrefabInfo`、`fileId`。
3. spec 中不得出现裸字面量——颜色、字号、行高、间距、圆角、层级一律引用 token。
4. 不得手工编写或镜像 TS 绑定常量，绑定必须由工具从 spec 生成。
5. 不得引入第二种 `slots` 或组件声明写法。方言只允许一种。
6. 不得把校验逻辑复制成两份。扩展与命令行必须共用同一模块。
7. 不得把只支持「spec → prefab」、不支持「prefab → spec」的组件类型收进白名单。
8. 不得并行对同一 asset 发起写操作。
9. 不得在未获确认时越过确认门继续下一步。
10. 不得把「计划投递成功」当作「prefab 生成成功」。
11. UI 代码不得直接读写模拟核心状态、不得判定规则、不得访问平台全局对象。
12. 模拟核心目录不得出现 `cc`、引擎 API 或任何 IO。
13. 不得做逐屏像素稿。
14. 不得在简化 UI 阶段遗留结构决策。

---

## 二、唯一允许的资产写入路径

`.prefab`、`.scene`、`.anim`、`.meta` 的创建与修改只能经以下三条路径之一：

1. Creator 编辑器手工操作；
2. Cocos MCP；
3. 项目内 Creator 扩展 `simhuman-creator-tools`。

推荐路径为第 3 条。批量生成一律走这条，不堆叠单节点命令。

写操作必须满足全部条件才会落盘：

- 计划根节点显式 `"dryRun": false`；
- 单条操作显式 `"requiresWrite": true`；
- 先经计划校验器通过，再投递队列；
- Creator 已打开且扩展已加载；
- 同一 asset 无并发写操作。

---

## 三、三个基本产物

全部设计工作只能落在以下三个产物上。prefab 是它们的输出，不是工作对象。

### 3.1 tokens —— 视觉常量的唯一来源

文件位置：`assets/config/ui/ui-tokens.json`。

必须覆盖：`color`、`font`（含 size 与 lineHeight）、`space`、`nineSlice`、`layer`。

引用写法：

```json
{ "type": "cc.Label",
  "properties": { "fontSize": "@font.body.size", "color": "@color.textMain" } }
```

规则：

- spec 落盘时保留 token 引用，展开只发生在工具内存态。
- 新增视觉常量必须先进 tokens，再引用。不得在 spec 中就地写值。
- token 名一旦被引用即不得重命名或删除，除非同步全量重新生成。

### 3.2 组件库 —— 重复结构的唯一来源

位置：`assets/ui/prefabs/widgets/`。

首批范围（实际以屏幕清单为准，按需增删）：

| 组件 | 用途 |
| --- | --- |
| `PanelBase` | 面板底 + 标题栏 + 关闭按钮（九宫格） |
| `ButtonPrimary` / `ButtonIcon` | 三态 + 禁用态 + 按压反馈 |
| `ListRow` | 通用行：图标 + 主文本 + 副文本 + 右侧数值 |
| `ValueBar` | 生产、探索等进度条 |
| `IconSlot` | 建筑格、资源格 |
| `TooltipPanel` | 悬浮说明 |
| `TabBar` | 页签 |
| `SimpleTable` | 表头 + 行 |

规则：

- 子组件必须用 `prefabRef` 引用，不得展开为节点树。
- 同一视觉结构出现第二次时，必须抽回组件库，不得就地复制。
- 组件库先做屏幕清单确认需要的部分，其余按需追加。不得预先批量制造通用组件。

### 3.3 屏幕契约 —— 交互与数据的唯一来源

位置：`assets/config/ui/screens/<screen>.json`。每屏一份，必须含四项：

| 项 | 内容 |
| --- | --- |
| 展示字段 | 该屏显示哪些数据 |
| 数据来源 | 每个字段来自哪次查询或哪份快照 |
| 派发命令 | 每个交互对应哪条 `Command` |
| 槽位 | 需要哪些 slot |

规则：

- 跳转逻辑与数据排版必须同时从模拟核心的查询与快照结构反推，不得分开设计。
- 交互的产物是命令清单，不是按钮回调列表。
- 跳转关系（谁打开谁、返回与关闭路径、叠加时的界面状态）写入契约，不得散落在代码注释中。
- 界面所需字段若核心查询给不出，先改核心契约，不得在视图层自行推导。

---

## 四、spec 规范

### 4.1 位置与命名

`*.prefab-spec.json` 与 `*.prefab` 必须同目录同名：

```
assets/ui/prefabs/ui/<screen>/Xxx.prefab
assets/ui/prefabs/ui/<screen>/Xxx.prefab-spec.json
```

### 4.2 基本字段

`version` 固定 `1`，`kind` 固定 `CreatorPrefabSpec`。

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `target` | 是 | 生成目标，必须以 `db://assets/` 开头 |
| `root` | 是 | 根节点，递归描述 `children` |
| `ui.size` / `ui.anchor` | 是 | `UITransform` 尺寸与锚点 |
| `layer` | 是 | 节点层，必须显式写出 |
| `components` | 否 | Creator 内置组件 |
| `prefabRef` | 否 | 嵌套 prefab 引用 |
| `bindings.slots` | 否 | 槽位声明 |
| `metadata` | 否 | 备注 |

### 4.3 引用

- `assetRefs` / `prefabRef` 只写唯一短文件名，不得写 uuid，不得写 `url`，不得写 `resolvedUuid`。
- 图片资源文件名必须全工程唯一。需要消歧时先改名，不得依赖目录猜。
- 短文件名只能是文件名，不得含目录分隔符。缩小范围时用 `scope`，且 `scope` 必须是 `db://assets/...`。
- `nodeRefs` 表示组件指向节点，`componentRefs` 表示组件指向组件。两者是行为语义，不得静默丢弃。
- 生成时必须先建一次全工程文件名索引再解析。0 个匹配或 1 个以上匹配都必须报错。

### 4.4 绑定

- `bindings.slots` 固定用 `{ 槽位名: 节点路径 }` 映射写法，不得使用数组写法。
- 槽位名与路径是唯一来源，TS 绑定常量由工具生成，不得手写。
- 每次修改 spec 的槽位后，必须重新生成绑定并提交。

### 4.5 组件白名单

初始范围：

```
cc.UITransform  cc.Widget        cc.Label        cc.Sprite
cc.Button       cc.Layout        cc.ScrollView   cc.Mask
cc.RichText     cc.Toggle        cc.ToggleContainer  cc.EditBox
cc.ProgressBar  cc.PageView      cc.Slider       cc.BlockInputEvents
```

规则：

- 扩名单前必须先补齐该类型的解码能力，做到双向可往返。
- 只支持生成不支持解码的类型不得进入白名单。
- 业务视图脚本不得写入 spec。脚本挂载在 prefab 生成后单独执行。

### 4.6 覆盖已有 prefab

- 覆盖必须显式声明 `"overwrite": true`，否则报错。
- 覆盖必须保留 asset uuid，覆盖前后校验一致。
- 覆盖必须按节点路径与组件归属复用旧内部 id。
- 禁止删除旧 prefab 再创建同名新 prefab。

---

## 五、执行顺序

必须按序执行，且每道确认门通过后才可继续。

```
① 契约包      屏幕清单 / 跳转图 / 数据映射 / 命令清单 / tokens 草案
                          ↓   ← 确认门 1
② tokens + 组件库
                          ↓
③ 简化 UI     由 spec 生成占位版：结构正式，视觉用占位色块
                          ↓   ← 确认门 2（看截图）
④ 截图迭代    预览 → 对比 → 改 spec → 再预览
                          ↓
⑤ 正式生成    validate → enqueue → Creator 扩展 → .prefab
                          ↓
⑥ 绑定 + 校验 由 spec 生成绑定常量
```

规则：

- 屏幕清单必须先于组件库产出。顺序不得颠倒。
- 简化 UI 必须由 spec 生成，不得手工搭建。原型与成品是同一份 spec 的两种保真度。
- 步骤 ④ 未通过前不得落 prefab。
- 组件库自身也走同一条流程，作为首次端到端验证。

**步骤 ③ 必须已确定（不得延后）：**

- 滚动 / 分页 / 列表虚拟化
- 弹窗层级与叠加关系
- 列表项的复用方式
- 屏与屏的宿主关系

**允许延后到成品阶段：**

- 配色、贴图、字号、圆角、间距

---

## 六、校验

每项必须在指定时机执行，未通过不得进入下一步。

| 校验 | 时机 | 判据 |
| --- | --- | --- |
| spec schema | 提交前，不需要 Creator | 字段、类型、引用格式、组件白名单 |
| token 引用 | 提交前 | spec 中无裸字面量，无未定义 token 名 |
| 绑定可复现 | 提交前 | 重新生成的绑定文件与已提交版本无差异 |
| 模拟核心边界 | 提交前 | 核心目录无 `cc`、引擎 API、IO |
| 视图边界 | 提交前 | 视图代码不直接读写核心状态，不判定规则 |
| 语义对比 | 生成后 | 组件集合、节点层、节点状态、组件属性、内部引用五类一致 |
| 截图回归 | 生成后 | 与基线感知对比，差异需逐条确认 |

规则：

- 生成后必须读 `.report.json` 的 `ok` 字段判定成败，不得只看投递结果。
- 失败任务必须读 `results[]` 的 `error` 定位，不得重投了事。
- 覆盖已有 prefab 后必须跑语义对比，证明结构无丢失。

---

## 七、目录结构

```
assets/
  scripts/
    sim-core/              # 禁止 import cc 或任何引擎、平台 API
    view/
      core/                # 界面服务：注册、打开、关闭、资源归属
      base/                # 视图与组件基类
      ui/<screen>/         # 视图脚本 + 生成的绑定常量
      widgets/             # 组件库脚本
  ui/
    prefabs/ui/<screen>/   # Xxx.prefab 与 Xxx.prefab-spec.json
    prefabs/widgets/       # 组件库 prefab
    textures/
    fonts/
  config/ui/
    ui-tokens.json
    screens/<screen>.json
tools/
  creator-ops/             # 队列、计划校验、语义对比
  checks/                  # 绑定可复现、token、边界检查
extensions/simhuman-creator-tools/
```

规则：

- 新增界面只在 `assets/ui/prefabs/ui/<screen>/` 下建立新目录，不得平铺。
- 不得新增集中存放 spec 的目录，spec 必须与 prefab 同目录。

---

## 八、执行环境

- 写操作要求 Creator 已打开且扩展已加载。只有导出与校验可脱机执行。
- 队列目录：`queue/inbox` 待执行、`queue/processing` 执行中、`queue/done` 成功、`queue/failed` 失败，回执为同名 `.report.json`。
- 队列产物不提交版本库。
- 批量任务必须显式调大超时，默认值偏短。
- 投递后若超时，首先确认 Creator 是否已打开、扩展是否已加载。
