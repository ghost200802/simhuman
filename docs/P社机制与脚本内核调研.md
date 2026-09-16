# P社（Paradox）机制与脚本内核调研

**调研目的：** 弄清 P 社策略游戏（重点《维多利亚 3》Victoria 3、《欧陆风云》EU4 为代表的 Clausewitz/Jomini 系）的**核心系统与脚本写法**——包括但不限于 events、modifier、tag——作为我方"数据驱动模拟内核（TS→Rust）"的范本依据。
**边界：** 本文是外部机制调研，不是 SimHuman 的架构文档；与 SimHuman 的对应关系见 §8。
**阅读方式：** 可独立阅读。凡引用均有来源；置信度按本节约定标注。

## 0. 置信度约定（先读）

- **【公开】**：P 社官方 dev diary / 访谈 / 随游戏分发的脚本与文档 / 能由原版文件直引者。
- **【社区】**：Paradox wiki（官方域名、社区维护）、mod 工具社区整理的官方文档。
- **【待证/推测】**：玩家或作者推断，无官方背书。
- 注意：本调研经检索摘录完成，部分 wiki 页面未逐字打开复核；**关键语法上线前请用原版 `game/` 文件抽检核对**。EU4 与 V3 分属两代脚本语法（§1.4），勿混用。

---

## 1. 引擎与"数据驱动"的世界观

### 1.1 引擎族谱【社区】
Europa（EU2 时代）→ **Clausewitz**（EU3 起，自研 C++，EU4/CK2/HOI4/V2 同代）→ **Clausewitz + Jomini**（自 Imperator: Rome 起；V3/CK3/EU5 同代）。官方引擎负责人 John Wordsworth（2018 访谈）：*"Jomini isn't taking over, and Clausewitz isn't going anywhere; the pair are two halves of the same engine."*【公开】Jomini 带来 64 位、DX11、可运行时热改的 mod 工具、modder 可自定义 GUI；老 Clausewitz 世代被社区普遍诟病单线程瓶颈。

### 1.2 一条主线：数据与代码的分层【公开+社区】
脚本层（.txt）**本质是"对引擎内建命令集的数据化调用"**：
- 引擎提供：实体/作用域类型、触发与效果命令集（trigger/effect）、modifier 数值键、求值器（作用域解析 + 短路 + 解释执行）。
- 数据提供：实体实例与规则实例（国家/法律/建筑/事件…），以及用**有限命令集拼装的任意复杂逻辑**（scripted effects/triggers、事件、journal）。
- **分界规则：能"加键/加命令"的是引擎代码；数据层只能组合既有键。** V3 控制台 `script_docs` 可导出全部 effect/trigger/modifier/scope 清单；CWTools、clausewitz-mcp 等工具都建立在这份内建命令集上【社区】。
- 脚本比 C++ 慢，因为"每行都要被转成一条代码指令并做 scope 检查"（Stellaris DD#182）【公开】——热路径要避免脚本解释。

### 1.3 文件组织：目录决定类型，顶层键是名字【公开】
- 内容是 `key = { 子块… }` 的纯文本，无类型标记；**目录语义决定顶层键的类型**（`common/laws/` 里顶层键=法律；`common/on_actions/` 里顶层键=时机名）。
- 每个内容条目可带 `modifier = {}`、`trigger/possible/potential`、`effect/immediate/option` 等**通用子块**。
- **本地化**：玩家可见文本一律走 key 映射（事件 title/desc/option、国家 tag、modifier、理念名…），脚本文件里不出现非 ASCII 文本。
- 目录差异：EU4 把 `events/ decisions/ missions/ localisation/ history/ map/` 放**顶层**；V3/CK3/EU5 把多数放进 `common/` 之下【公开】。EU4 的 `common/` 含 `countries/ country_tags/ cultures/ religions/ ideas/ policies/ disasters/ event_modifiers/ static_modifiers/ on_actions/ governments/ government_reforms/ estates/ estates_privileges/ buildings/ tradegoods/ …`。

### 1.4 两代脚本语法（复刻须选边）
| 维度 | 老一代（EU4/CK2/HOI4） | 新一代（CK3/V3/EU5） |
|---|---|---|
| 事件容器 | `country_event = { id = ns.1 … }`（外层类型包装） | `ns.1 = { type = country_event … }`（具名 define，块内 type） |
| 随机触发 | MTTH（mean_time_to_happen + factor 修正） | on_action 脉冲 + 权重抽样为主；CK3 DD#30 官方**废除 MTTH**【公开】 |
| defines | Lua `NDefines.X.Y = …` | txt 分节 `NName = { … }` |
| 旗帜效果 | `set_country_flag`（字符串） | `add_country_flag`（带子块） |
| 地图/region 归属文件 | EU4 在 `map/area.txt、region.txt…` | 新作多在 `common/…` |

SimHuman 按 V3（Victoria-like）取向建议以**新一代语法为蓝本**，同时吸收 EU4 的灾难/理念等概念。

---

## 2. 实体、作用域 scope 与 tag 身份系统

### 2.1 scope：脚本永远在某个实体语境里求值【公开+社区】
- 脚本在某个"当前作用域"（current scope）上执行；相对引用构成作用域链：`ROOT`（事件根）、`FROM`（发起方）、`PREV`（链上一级）、`THIS`。
- 一个内容脚本块总落在某 scope 上（`country_event`→国家；`province_event`→省份）。
- **scope 移动/链式**：`owner`（省→所有国）、`controller`、`capital_scope`（国→首都省）、`country.capital`；新代可链式点取（`k_france.holder = {…}`），可 `save_scope_as = name` + `scope:name = {…}` 存命名作用域。
- **直接写对象引用**：EU4 `FRA = {…}`（国家 tag 即 scope 块）、`110 = {…}`（省 id 即 scope 块）、`event_target:xxx = {…}`；V3 用字面量引用 `c:GBR`、`s:STATE_X`、`ig:ig_industrialists`、`law_type:law_x`、`cu:british`、`define:NPop|KEY`。
- 作用域 = 类型化实体集合；trigger/effect 按 scope 类型约束（`has_trait` 仅 character scope 等）。

### 2.2 遍历与逻辑形态：all/any/every/random/count + limit【公开】
EU4（[A]）：
- **效果型**：`every_X = { limit = {触发} <effects> }`、`random_X = { limit = … }`（随机挑一个执行）；`every_country / every_owned_province / every_enemy_country…`
- **条件型（触发器，返回布尔）**：`all_X`（全部满足）、`any_X`（任一满足），如 `all_country = { NOT = { government = daimyo } }`。
- 新一代 V3 增加了带过滤/计数的 `any_X = { filter = {…} }`、`count = N`【社区】。
- 通用块：`if = { limit = {} … else_if = {} … else = {} }`、`random = { chance = N … }`、`random_list = { 50 = {} 30 = {} }`（**权重和不必为 100，余量=无事发生**，`0` 可占位）、`hidden_effect`（不给 tooltip）、`while`。
- 块内并列多行 trigger 默认 AND；显式组合 `AND/OR/NOT` 可任意嵌套。**条件效果必须包在 `if = { limit = {} }` 里**。

### 2.3 tag / 身份作为内容开关【公开+社区】
- **国家 tag**：`common/country_tags/00_countries.txt` 左 3 字母 tag、右国家文件路径（`ENG = "countries/England.txt"`）；`common/countries/England.txt` 存颜色 + 历史理念组；`history/countries/ENG - England.txt` 给初始政府/文化/宗教/首都（可带日期子块 `1500.1.1 = {…}`）。动态 tag（殖民国家 C00-C99）由引擎运行时分配，modder 不手工声明。
- **文化/宗教**：文化组包文化（`common/cultures/`，`primary = <TAG>` 标母国）；宗教组包宗教（`common/religions/`）。组名/名本身即可做 trigger（`culture_group = iberian`、`religion = catholic`）。
- **区域**：area/region/superregion 是省的集合（EU4 在 `map/`），集合名可直接当 scope/trigger 用。
- **身份判断**：`tag = ENG / exists = SCO / has_country_flag / primary_culture = … / government = monarchy / has_reform = …` 等；事件/决议/任务/理念都以此开闭。
- 理念分配 EU4 按文件字母序，**先匹配者生效**（`00_` 前缀抢先，`zzz_default` 兜底）——不是后载覆盖。

---

## 3. Modifier：全系统的"数值总线"

### 3.1 两层定义【公开（V3）】
- **modifier type = "有哪些数值键"**。V3 1.7 起集中在 `common/modifier_type_definitions/*.txt`：
```
country_bureaucracy_add = { decimals = 0 color = good game_data = { ai_value = 20 } }
interest_group_ig_landowners_pol_str_mult = { decimals = 0 color = neutral percent = yes … }
```
键名带单位语义（`_add` 绝对量 / `_mult` 百分比 / `_share` 份额）。**键的前缀决定它在作用域树上的流向**（官方 modifier_types.md 逐字）：`country_*` 从 Power Bloc → 成员国即停；`state_*` 沿 country→state 下钻；`building_*`/`building_group_*`、`pop_*`、`character_*`、`interest_group_*` 各止于对应层。大量**自动展开键族**：`goods_output_<good>_add`、`goods_input_<good>_add`、`building_employment_<pop>_add`、`building_<pop>_shares_add`（按 good/pop_type 动态生成，无需逐条注册）【推断】。
- **static modifier = "一个命名的 buff 块"**（`common/static_modifiers/`）：
```
government_conflict = { icon = gfx/… country_authority_mult = -0.25 }
```

### 3.2 施加/移除：add_modifier 的完整参数【公开】
```
add_modifier = {
	name = modifier_failed_to_meet_petition
	days = long_modifier_time      # 或 weeks/months/years；不写/负数 = 永久
	is_decaying = yes               # 随时间线性衰减到 0
	multiplier = { add = 1.5 divide = { add = 1 add = ROOT.enactment_phase } }  # 数值块，可放大/取反
}
```
短写法 `add_modifier = some_static` = 永久、倍率 1、不衰减。`remove_modifier`、trigger `has_modifier`。作用域列表：building/character/country/institution/interest_group/journal_entry/political_movement/power_bloc/state【社区】。
- EU4 侧对应 `add_country_modifier = { name = X duration = 3600 }`（单位天）/ `add_province_modifier` / `add_permanent_province_modifier`，定义分 `common/event_modifiers`（可增删）与 `common/static_modifiers`（只读，游戏机制施加）两目录【社区】。

### 3.3 运行数值如何引用 modifier 值【公开（V3）】
modifier 不只是显示 buff，它**参与运行时计算**——脚本可直接读它：
```
multiply = { value = 1 add = scope:interest_group.modifier:interest_group_in_government_attraction_mult min = 0 }
modifier:country_voting_power_base_add > 0        # 在 scripted trigger 里当数值条件
```

### 3.4 系统的统一写法：一切"长期效果"都是 modifier 容器【公开（V3）】
- **法律** = 常驻国家 modifier 容器：
```
law_worker_protections = { group = lawgroup_labor_rights … modifier = {
	building_group_bg_agriculture_throughput_add = 0.1
	state_expected_sol_mult = -0.1
	country_private_construction_allocation_mult = 0.5 … } }
```
- **生产方法（PM）** = "一组数值键的模板"，经济全部退化为 modifier 条目，并按 0..level 在岗率/等级缩放：
```
pm_bakery = { building_modifiers = {
	workforce_scaled = { goods_input_grain_add = 40  goods_output_groceries_add = 45 }
	level_scaled    = { building_employment_shopkeepers_add = 500  building_employment_laborers_add = 4500 } } }
pm_manor_house_privately_owned = { building_modifiers = {
	level_scaled = { … }  unscaled = { building_aristocrats_shares_add = 10 } } }   # 股份/分红归属
```
  `workforce_scaled`（按 0..level 实际在岗比例）、`level_scaled`（按等级）、`unscaled`；另有 `timed_modifiers`、`unlocking_laws/technologies/production_methods/…`、`is_default`、`pollution_generation`。
- **科技/人物特质/政体/事件 modifier**同理：`character_traits` 可带 `character_modifier / command_modifier / country_modifier / interest_group_modifier / agitator_modifier` 多层【公开】。
- 1.7 起 PM/建筑拆分 + `ownership_type = no_ownership/self/other`，所有权靠 `building_<pop>_shares_add` 决定分红归属。

---

## 4. 事件与"长线系统"（events / on_action / journal / disaster）

### 4.1 老式事件（EU4 逐字，[A] 原版）【公开】
```
namespace = flavor_jap
country_event = {
	id = flavor_jap.1   title = "…EVTNAME1"   desc = "…EVTDESC1"   picture = BATTLE_eventPicture
	trigger = { OR = { AND = { tag = JAP … } … } }
	mean_time_to_happen = { months = 200 }     # MTTH 随机
	option = { name = "…EVTOPTA1"  add_ruler_modifier = { name = jap_sengoku_jidai } }
}
```
字段：`fire_only_once = yes`、`immediate = {}`（发放即执行、与选项无关）、`option = { name … ai_chance = { factor = N } <effects> }`。EU4 **无 effect 块**，效果放 immediate/option；无 option 内 trigger 证据【待证】。

### 4.2 触发三机制【公开】
1. **显式 effect**：`country_event = { id = ns.1 days = 400 random = 400 }`（可延迟/随机延迟；目标事件的 trigger 满足才真正发出）。
2. **on_action 时机列表**（EU4）：
```
on_four_year_pulse = { random_events = { 100 = colonial_nation.1 1000 = 0 } }   # 权重抽一，0=空转
```
V3 提供细粒度脉冲：`on_weekly_pulse / on_monthly_pulse / on_yearly_pulse` 及 `…_pulse_country/state/character`、`on_decade_pulse_country`、选举/事件型（`on_building_built / on_acquired_technology / on_diplomatic_play_started / on_character_creation / on_new_ruler …`）。同 on_action 可跨文件续写事件列表，但**不可有两个 trigger 或两个 effect 块**；追加自定义效果用"让官方 on_action 调你自己的 on_action"。
3. **MTTH**：概率 ≈ `1 - 2^(-t/MTTH)`，EU4 检查间隔 `EVENT_PROCESS_OFFSET = 20` 天；内部逐日滚 `1-exp(log(0.5)/MTTH)`【公开/社区】。CK3 已废除【公开】。

### 4.3 V3 的事件写法（新一代）【公开】
```
namespace = decree_events
decree_events.100 = {
	type = country_event
	title = decree_events.100.t   desc = decree_events.100.d
	cooldown = { days = … }   duration = 3
	trigger = { … }
	immediate = { random_scope_state = { limit = { … } save_scope_as = decree_manufacturing_industry } }
	option = { … }
}
```

### 4.4 Journal Entry：V3 的"长线状态机"（复刻重点）【公开】
JE = 激活触发器 + 若干终局触发器 + 对应效果 + 可选进度条 + 脉冲钩子。字段：
`is_shown_when_inactive / possible / immediate / scripted_button / complete+on_complete / fail+on_fail / invalid+on_invalid / timeout+on_timeout / modifiers_while_active / on_weekly/monthly/yearly_pulse / current_value+goal_add_value（进度）/ progressbar / weight / transferable`。
真实骨架（`00_ig_agendas.txt` 等逐字）：`immediate` 里 `save_scope_as` + `add_journal_entry = { type = je_x target = … }`；激活期间可 `add_modifier{… is_decaying = yes}`、`add_loyalists = { value = medium_radicals interest_group = scope:… }`；完成靠 `scope:journal_entry = { is_goal_complete = yes }`，完成后 `set_variable` 防重入。
**启示**：政权周期、压力/危机、改革、时代任务这类"进行中、多终局、可推进"的东西，V3 用 JE 而非散事件表达。

### 4.5 EU4 灾难（disaster）——"压力爆发"范本【公开】
```
influenza_epidemic = {
	potential  = { … }      # 满足 → 可能发生（在稳定界面可见）
	can_start  = { … }      # 满足 → 激活"迫近"警报并开始涨 progress
	progress   = { … modifier = { factor = 2 <条件> } }   # 每月推进，可用 factor 加速
	modifier   = { global_unrest = 5 }                    # 进行中国家修正
	can_end    = { … }
	on_start / on_end / on_monthly = { events = {}  random_events = { 1000 = 0 … } }
}
```
**启示**：这几乎就是"马尔萨斯压力→危机→乱世/朝代周期"的现成形状：`potential→can_start→progress(factor)→modifier(国家惩罚)→on_start/on_end/on_monthly`。

---

## 5. 系统层写法速览（V3 为主，作为"数据驱动系统"范本）

### 5.1 Law / enactment / ideology【公开】
- **law group**（`common/law_groups/`）：`law_group_category = power_structure/economy/human_rights`、`base_enactment_days`（覆盖默认 100）、`enactment_approval_mult`、`change_allowed_trigger`。
- **law**：`group = lawgroup_x`、`progressiveness = 50`、`unlocking_technologies`、`institution = … + institution_modifier`、`modifier = {…}`（常驻国家 buff）、`can_enact/can_impose/ai_will_do`、`disallowing_laws`。制度等级 clamp[1,5]（`common/institutions/` 有 `institution_x = { modifier = {…} }` 基础效果；等级缩放系数在引擎侧【推断】）。
- **ideology**（立场矩阵）：每个 ideology 对每个 lawgroup 内每条 law 表态 `strongly_approve/approve/neutral/disapprove/strongly_disapprove`。
- **enactment 引擎机制**（公开 defines）：`LAW_ENACTMENT_MAX_PHASES=3` 个 checkpoint、每 checkpoint 默认 100 天、失败后 `LAW_ENACTMENT_COOLDOWN_DAYS=730` 内不能重试、`LAW_ENACTMENT_IG_CLOUT_STALL_EFFECT` 等。legitimacy<25 政府无法正常立法。脚本可介入（`add_enactment_phase/success_chance/setback` 类 effect【社区，待复核】）。
- **政体**：`common/government_types/`，`possible = { has_law = law_x }` + `on_government_type_change` 钩子 —— "法 → 政体 possible → 政体切换效果"。

### 5.2 Interest Groups / 政治 / 人物【公开】
- IG 文件 = `enable/on_enable/pop_potential（谁能入团）/pop_weight（吸引力，可引用 SoL、modifier 值）/monarch_weight/agitator_weight/…`；IG clout = 引擎按 pop 政治权重聚合。
- Party 是 IG+意识形态的选举容器；character 的意识形态绑定在 `character_ideologies`。
- 人物/特质：`character_traits`（personality/condition/skill 三类）可带多层 modifier；角色生成/死亡挂 `on_character_creation / on_character_death / on_new_ruler`。

### 5.3 Pop / 需求 / SoL【公开（defines）+社区】
- pop 结构 = **pop_type（职业规则）+ 文化/宗教（身份）+ 运行时 wealth/SoL/literacy（引擎态）**，无集中大表。
- pop_type 字段（官方注释）：`working_adult_ratio`、`start_quality_of_life`、`wage_weight`、`paid_private_wage`、`literacy_target`、`consumption_mult`、`dependent_wage`、`unemployment_wealth`、`political_engagement_base/literacy_factor`、`qualifications`（晋升资格脚本值）。
- 需求 = 一组可替换商品 + 权重（`pop_needs`：`entry = { goods = grain weight = 0.75 … }`），即**需求替代**机制。
- 关键节拍常数（公开 defines `NPops`）：wealth 1–99；`SOL_STARVING_THRESHOLD=5 / STRUGGLING=10`；低收入每月转 radical（`RADICALS_MONTHLY_FROM_LOW_SOL=0.002`，饥饿更重）；`ASSIMILATION_RATE/CONVERSION_RATE=0.002`（每月）；`WORKING_ADULT_RATIO_BASE=0.25`。
- 收入/支出周结；工资（`paid_private_wage`）与分红区分；SoL 按买到需求满足度打分。

### 5.4 商品与市场【公开（defines）+社区】
- goods：`cost`（基价）、`category`、`local = yes`、`tradeable/fixed_price`、`traded_quantity`、`prestige_factor`。
- 价格：`base × f(buy/sell 比)`，幅 `[base×(1−0.75), base×(1+0.75)]`；供需失衡惩罚**逐日朝目标逼近**而非跳变。1.7 起有"世界市场中心"与贸易中心。
- 产出惩罚/经济规模/拖欠由 `NEconomy` defines 在引擎侧乘到 throughput。

### 5.5 EU4 特有数据驱动对象【公开/社区】
- **决议**：`country_decisions = { my_decision = { potential/allow/effect/ai_will_do } }`（顶层必须复数 `country_decisions`）。
- **任务树 missions**：series = { slot/potential/generic/ai }，mission = { icon/required_missions/provinces_to_highlight/trigger(完成条件)/effect(完成效果) }；换 tag 重算 `swap_non_generic_missions`。
- **理念 ideas**：国家理念组 `start(传统) + 7×单理念 + bonus`；`free = yes` 标记。
- **阶层特权 estates/privileges**：`on_granted/on_revoked/benefits/penalties/max_absolutism`…。
- **政体改革 government_reforms**：`potential/trigger/modifiers/government_abilities/ai`。
- **数值配置 defines**：EU4 Lua vs V3 txt 分节（见 §1.4），脚本内用 `define:NPops|KEY` 引用。

---

## 6. 引擎实现层（tick、性能、确定性——公开部分）

### 6.1 tick 粒度与分层【公开】
- V3：**1 tick = 6 小时（1/4 日）**；CK3/EU4 = 1 天；HoI4 = 1 小时。
- V3 以 **tick tasks** 组织：每 task 声明"多久跑一次（yearly/monthly/weekly/daily/regular）+ 依赖哪些 task"，控制台 `TickTask.Graph` 可看全图。
- 最贵任务集中在 **weekly**：employment update、pop need cache update、modifier update（DD#76 实测前三）。
- **分时/摊薄（throttling）**：V3 pop growth 每 tick 只处理全图 1/120 的 pop；CK3 把昂贵月任务**分摊到每天处理 ~1/30**（人、建造、流行病），多数系统每月一次、每日只跑极少数（AI 移动等）。
- EU4：引擎 tick=1 天，经济按"月初更新"，MTTH 事件 20 天一个检查点。

### 6.2 modifier 聚合与失效 = 头号性能判据【公开】
- V3 用与 Stellaris 类似的 **modifier nodes**："本质是依赖管理——modifier 变脏只重算它 + 依赖它的下游，而不是全量重算"（DD#76）。
- 官方定量（V3 DD#120）：**modifier nodes 的数量 + 失效事件数，与 pop 数量并列是最差性能因素**。1.7 把计算并行化：依赖已知 → 按依赖分层分批跑 `RecalculateModifierNodes`；mod 自定义 modifier type 失去传播目标声明会向整棵树扩散（性能事故），官方一度建议不要新增类型。
- 结构：modifier 从来源（科技/命令/法律…）**沿对象树传播**（technology → country → state → building）。**目标实体与"是否向下传播"是按键名/声明的静态规则，不是运行时图搜索**。
- Stellaris 4.0 把逐 pop 改为 **Pop Group（~100 pop 一组）、每星球只算一次**，减少 node 密度。

### 6.3 scope 运行时与确定性【公开（行为学）+推测】
- 脚本在运行时被解释为命令流并逐条做 scope 类型检查；触发器**短路求值**（官方建议便宜 flag 检查放前面）。
- 脚本**只能跑在串行段**（脚本可能创建/销毁全局对象）；并行段之间/之前用 **sorting step 固定实体处理顺序**，以防多人失步——即**执行顺序确定、显式排序**。UI 读数据用锁间断保证不读到半更新状态。
- **RNG/种子**：P 社公开只说"同状态+同执行顺序⇒同结果"（多人同步要求），**种子来源/是否持久化无官方说明**【待证】。玩家实测：事件弹窗后重载选项结果不变（结果在触发时由状态派生）【社区】。

### 6.4 性能对策汇总【公开】
脏标记增量重算 · 降频分层任务 · 分摊（throttling）· 缓存聚合值让脚本读缓存（`num_assigned_jobs`）而非重扫 · AI 决策按层级调检查频率 · 确定性并行（并行预计算+串行提交+sorting）· 聚合粒度（pop 合组）。

---

## 7. 对 SimHuman 的设计启示（映射）

| P社做法 | SimHuman 对应 | 建议落地 |
|---|---|---|
| tag 身份系统 | 政权 tag、文化/族属（本族/蛮族/异族）、区域身份 | 每个政权/聚落/区块有稳定字符串 id；文化=身份键 + 开化/融合是数值 |
| modifier = 数值总线；一切长期效果都是 modifier 容器 | 政策/法律、科技、政权 buff、事件效果、开化/融合/好感 | **Modifier 键集中定义（前缀决定作用域流向），静态命名块 + add/remove/duration/decay/stacking**；建筑/设施/生产全部"键模板化" |
| PM = 一组数值键模板（level/workforce_scaled） | 建筑格槽位 + 资源设施 | 建筑的投入/产出/人工需求用"数值键模板"描述，等级/在位率驱动 |
| pop（pop_type+文化+wealth/SoL/literacy） | 人口实体：族属/蛮族/开化/臣服 + 职位适合 + 出生/死亡 | 臣服≈能否进玩家建筑工作（employment 资格）；蛮族→职业/资质 modifier；开化→文化接受/幸福；需求替代表 |
| law+ideology+enactment | 政体/政策（分封↔集权），政策的推行/阻力 | "每组激活一条"的枚举 + stance 矩阵 + 分阶段 enactment（3 checkpoint + cooldown） |
| journal entry（多终局长线状态机） | 政权周期、时代任务、制度改革、探索/臣服/开化进度 | 用"激活条件 + complete/fail/timeout + 进度条 + 脉冲 + modifiers_while_active"表达长线进行项 |
| EU4 disaster（potential/can_start/progress/on_*） | 马尔萨斯压力→危机→乱世/朝代周期（需求第七、八章） | 压力=progress(factor)，危机=can_start，爆发期间 modifier，on_end=新政权重置 |
| on_action 脉冲 + 分频 | tick 分层 | 日/周/月/年/十年 pulse 接事件与 JE；昂贵系统降频+分摊（如 1/120） |
| effect/trigger + scripted_* + scope | Command=Effect 入口；核心 JSON 规则 | 保留 scope 栈（Root/Prev/This + save_scope_as），脚本化内容数据化 |
| 键=引擎，组合=数据 | L0 JSON 是"组合层" | 数值键、trigger/effect 原语由核心提供；JSON 只能组合，不得发明键（否则需进核心） |
| defines | L0 JSON 数值表 | 全局限额/节拍/公式集中一处，脚本可引用 |
| modifier nodes 依赖图 + dirty 失效 | Rust 迁移期热路径 | 按"节点数+失效事件数"做第一性能指标；按依赖分层批并行 |
| 确定性排序 + 并行预计算 | tick+种子确定性 | 同态同序同果；显式 sorting step；RNG 可用"状态哈希 + 可替换流"，但种子持久化需自定【待证→自行设计】 |

**一句话结论**：P 社把"数值、内容、规则"都收进"具名数据 + modifier + 有限命令集"；凡持续效果必先落成 modifier，凡长线/进行中必先落成 JE/disaster 形态的状态机，事件只做瞬时与触发；**内容节奏由 tick 分层与脉冲接缝驱动，不自己写循环**。这套分层与 SimHuman 已定架构（核心唯一权威 + tick 确定性 + Command 在入口折成效果 + L0 JSON 数据源）完全同构，可直接对齐实现。

---

## 8. 复刻清单与待证项

**最小系统集（V3 取向）**：modifier_type_definitions / static_modifiers / scripted_modifiers（数值）· laws/law_groups/institutions/ideologies（政治）· pop_types/pop_needs/goods（人口-消费）· buildings/production_methods（生产）· journal_entries + events + on_actions + scripted_effects/triggers/values（长线事件）· defines（调参）· localisation（文案）。

**自定规则（P社无统一背书，必须自己定并文档化）**：加载/覆盖顺序（00_ 前缀是否后者覆盖、先匹配 vs 后载）；"后载覆盖"与"先匹配生效"的取舍；版本化 schema 与旧存档迁移。

**待证/需实机抽检**：EU4 option 内 trigger / 事件 after；MTTH 检查间隔与 EVENT_PROCESS_OFFSET 数值；`add_modifier` 省略 duration 是否永久；改国教/省教的 effect 名；estates 特权 effect 名；scripted_* 目录官方文档正文；本地化是否支持语言子目录（视版本）；RNG 种子持久化策略（无官方，自行设计）；modifier node 内部粒度（每实体每来源 vs 每属性）【推测】。

---

## 9. 主要来源

**官方（dev diary / 访谈 / Steam 公告）**
- V3 DD#76 Performance：paradoxinteractive.com/games/victoria-3/news/dev-diary-76-performance
- V3 DD#120 Modding Features in 1.7（modifier 系统重写）：eprison.de/spiele/victoria-3/steam-news/…；store.steampowered.com/news/posts/…（片段）
- V3 DD#123 Post-Release：forum.paradoxplaza.com/forum/developer-diary/…123…
- CK3 DD#187 Performance & Optimization：forum.paradoxplaza.com/forum/developer-diary/dev-diary-187-performance-optimization.1861437/
- CK3 DD#30 Event Scripting（废除 MTTH）
- Stellaris DD#182 The Perils of Scripting：devtrackers.gg/stellaris/p/2cbc93b9-…
- Stellaris DD#404（modifier/threading 架构）：forum.strategyturk.com/printthread.php?tid=26312
- Stellaris 4.0 DD#366/#370/#372（Pop Group）：forum.paradoxplaza.com/forum/developer-diary/…
- Wordsworth 访谈（Jomini/工具/DX11）：web.archive.org/web/20190725075054/https://venturebeat.com/2018/10/14/…

**原版脚本镜像 / 直引源**
- Victoria-3-files（原版 game/ 目录镜像）：github.com/tjysdsg/Victoria-3-files
- vawser/EU4-Documentation（EU4 内建文档抽取）：github.com/vawser/EU4-Documentation
- 日文 EU4 wiki（直引原文件）：eu4.paradoxwiki.org

**Wiki（官方域名、社区维护）**
- vic3.paradoxwikis.com/{Modifier_modding, Modifier_types, Journal_modding, Laws, Pop, Standard_of_living, Market, Trade, Modding, Scope}
- eu4.paradoxwikis.com/{Modding, Mod_structure, Triggers, Effects, Scopes, Event_modding, Decision_modding, Mission_modding, Modifier_modding, Disaster_modding, Localisation, Variables, Economy}
- ck3/hoi4/stellaris/ck2.paradoxwikis.com（相应脚本页）

**社区/工具**
- Victoria-3-Modding-Co-op/Modding-Digests（每版 breaking changes）：github.com/Victoria-3-Modding-Co-op/Modding-Digests
- CWTools：github.com/KadenHimself/cwtools-vscode；clausewitz-mcp：github.com/jacklenzotti/clausewitz-mcp
- 引擎族谱：mycplus.com/game-development/game-engines/clausewitz-game-engine-cplusplus/；de.wikipedia.org Clausewitz Engine

> 可靠度提示：§6、§3 主体有官方 dev diary 支撑；各 paradoxwikis 链接系检索核实（未逐字打开），关键语法请以原版 `game/` 文件为准；标【待证/推测】处请勿当作 P 社实现证据使用。
