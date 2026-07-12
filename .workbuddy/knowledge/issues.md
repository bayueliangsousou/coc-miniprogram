# 踩坑纪录 & 已知问题

## 踩坑

### init_expert.py 生成 .codebuddy-plugin/ 而非 .workbuddy-plugin/
- 现象：注册脚本优先读取 .codebuddy-plugin/plugin.json
- 解决：两端目录都需要写入，优先确认 .codebuddy-plugin/

### README.md 残留 [TODO] 导致注册失败
- 现象：plugin.json 和 agent MD 都正确但注册报 [TODO] 错误
- 解决：init 生成的 README.md 也需清除 [TODO]

### 燃运消耗用「投掷值−技能值」且常规难度 ×1
- 规则依据：COC 7版燃运 = 失败后消耗幸运值把失败转为成功，消耗 = 失败差值（投掷值−技能值）× 难度系数。
- 本 app 的「鉴定投掷」（`dice-tool.doD100Check` + `calcSkillCheckResult`）只有常规难度入口（roll≤技能值），无困难/极难选择，故系数固定 ×1。
- 大失败（skill≥50 时 roll===100；skill<50 时 roll≥95）禁止燃运（规则常见约定 + 用户确认）。
- `character.attributes.LUK` 是幸运池，燃运后真实扣减并存盘，不可透支（不足时按钮置灰）。

### 燃运后属性区幸运值不刷新（显示层快照滞后）
- 现象：燃运成功后 `character.attributes.LUK` 已正确扣减并存盘，但属性区显示的幸运值仍是旧数，直到下次进页面才更新，用户以为燃运没生效。
- 根因：属性区幸运值读 `attrWithThresholds[item].value`（进页面 `onShow` 时由 `recalcAttrThresholds` 算一次的快照）；燃运 `onBurnLuck` 仅 `setData({ character })` 没动快照，关闭弹窗也未重算 → 数据层新、显示层旧。
- 修复：`character-detail.js` 抽 `recalcAttrThresholds(character)` 复用阈值算法；`onBurnLuck` 成功后与关闭弹窗（`onCloseSkillCheckModal`/`onDiceToolClose`）时均从 `getCharacterById(id)` 重读最新角色并 `setData({ character, attrWithThresholds })`。
- 通用教训：凡"显示值依赖进页面时算一次的快照"的，任何会改底层数据的操作都必须同步重算快照并 setData，否则显示与数据不一致。

### Git remote add 被 sandbox 阻止
- 现象：git remote add origin 报 Operation not permitted
- 解决：手动编辑 .git/config 文件添加 remote 段

### 角色卡编辑态未存档丢失（草稿双写）
- 现象：在 character-edit 主页改了姓名/属性/武器，未跳转子页也未点保存，App 被系统回收/划掉后改动全丢。
- 根因：编辑态只活在 `this.data.character`，`saveCharacter`（本地+云端）仅在「跳转子页前」和「点保存」触发；主页直接编辑的字段在这两个动作之前遇退出即无落地。
- 解决：`utils/character.js` 加草稿 API（`coc_draft_<id>` 已存档角色 / `coc_draft_new` 新角色，纯本地不触发云端同步），`onHide`/`onUnload` 落地、`onShow` 优先还原较新草稿、`onSave` 清草稿。
- 模式：小程序编辑页凡「编辑态仅存页面 data、显式保存才落地」的，都应加本地草稿双写防退出丢失；`onShow` 重载 committed 时务必用 `savedAt > updatedAt` 严格比较，避免时间戳相等误恢复/重复 toast。
- **PAT-016（2026-07-11 修正）：状态选择弹窗已选项无选中对号** — 现象：角色详情页已挂上「重伤」等状态后（顶部徽标可见），再次打开「选择状态」弹窗，已选项前无对号，无法识别哪些已生效。根因（非样式问题）：弹窗选中判断依赖 `character.status` 与 `availableStatuses[].value`（英文 key 如 `seriouslyInjured`）精确匹配；当 `character.status` 实际存的是**中文 label**（历史数据 / PC 端同步 / 其他入口写入）时，`includes('seriouslyInjured')` 与 `selectedStatusMap['seriouslyInjured']` 永远查不到 → 无对号；且顶部徽标用 `statusLabels[item]`（英文→中文，无回退），只在 status 为英文 key 时才显示中文，故"顶部显示重伤"并非判断依据。另：若 `this.data.character` 与存档在"再次打开"时刻不同步（如 onShow 重载后内存引用滞后），从 `this.data.character` 构建的 map 也可能命中失败。修复：①页面加载时 `normalizeStatusList` + 反向映射 `REVERSE_STATUS_LABEL`（中文→英文）把 `character.status` 规范化为英文 key 存回；②`refreshSelectedStatusMap` 改为直接 `getCharacterById(id)` 读最新存档，且对每项同时建 `原值 / 英文key` 两个 map 入口以兼容中英文；③`onSelectStatus` 的已选判断 `includes` 同时兼容中文 label。涉及文件：`pages/character-detail/character-detail.js`（新增常量+函数、改 onShow、改 refreshSelectedStatusMap、改 onSelectStatus）、`.wxml`、`.wxss` 已在上一轮加选中态样式。

## 已知问题
- PC端存在两套 CloudBase 连接代码（cloudRoom.ts 代理版 + cloudRoomSDK.ts 直连版）
- GitHub CLI (gh) 无法在本地环境安装（下载域名被墙）

## 架构决策记录

### ADR-001：双端实时同步方案选型（2026-06-06）

**背景**：PC 端通过 `.watch()` 实时监听 `room_players` 集合，小程序端因历史原因使用 `pushEvent` + `syncPull` 异步轮询（1~3s 延迟）。

**调研结论**：
- 微信小程序基础库 ≥ 2.8.1 已支持 `db.collection.watch()`，本项目基础库 3.15.0 ✅ 支持
- CloudBase 个人版实时推送连接数上限 **10 个**
- 标准版 500 连接，月费 ¥199

**连接数测算（一间房）**：
| 角色 | watch 连接数 |
|------|--------------|
| PC 端 KP（已有） | 1 |
| 小程序玩家 × 4 | 4 |
| 合计 | 5 |

两间房同时开 = 10 连接，打满个人版配额。

**备选方案对比**：

| 方案 | 成本 | 延迟 | 复杂度 | 推荐度 |
|------|------|------|--------|--------|
| A. 全量上 `.watch()` + 升级标准版 | ¥199/月 | 毫秒级 | 低 | ⭐⭐⭐⭐⭐ |
| B. 混合同步（进出房实时 + 属性异步） | ¥0 | 进出实时/属性 1~3s | 中 | ⭐⭐⭐⭐ |
| C. 优化轮询间隔到 500ms~1s | ¥0（增加读次数） | 0.5~1s | 低 | ⭐⭐⭐ |
| D. 小程序原生 WebSocket 自建服务 | 服务器成本 | 毫秒级 | 高 | ⭐⭐ |
| E. 每个玩家只 watch 自己的 events | ¥0 | 毫秒级 | 中 | ⭐⭐⭐ |

**结论**：保持现状（方案B混合同步），10间房同时在线绰绰有余。

---

### ADR-002：职业技能★模型定义（2026-07-12）

**背景**：职业技能编辑页的★（金色样式 + `displayAsOcc`）标识"该技能被识别为本职业的职业技能，可占用职业点池上限（85）"。重构前存在三套实现（`mutualExclusion` / `categoryLimits` / `listLimits`）且语义分裂，导致「社交·1」被实现成"进去不★、到50才挣星"，被用户判定为逻辑错误。

**★ 的核心语义（用户确认）**：
- ★ = 该技能被识别为本职业的"职业技能候选"，即用户**有权把它加到 50+ 并占用职业点上限**。
- **名单型选多候选（职业精确点名的技能集合，如互斥 A/B、罪犯下列选四的7个）进入编辑页时必须全部标★**——让用户一眼识别"这些是我能加职业点的技能"。
- **分类型选多候选（从某技能分类里挑 N 个，如社交四选一/二、艺术任一、科学选二）回归以前逻辑：进入不标★，用户加到 50+ 才挣星**——用户 2026-07-12 明确"社交四选一回归以前交互逻辑"。

**统一交互模型（重构目标，按选多候选的两种形态拆分）**：
| 机制 | 进入时★ | 加点后 |
|---|---|---|
| 固定锁定（baseline） | ★ | 恒★ |
| 名单型选多（chooseFrom：互斥精确对 / 罪犯下列选四等职业精确列出的名单） | **全部★** | 超50降序前 M 个留星，其余摘星 |
| 分类型选多（categoryLimits：社交四选一/二、艺术任一、科学选二） | **不标（回归以前加法模型）** | 超50降序前 M 个留星（加到50才挣星） |
| 全选多（chooseAny：点X门技能/自选X技能） | 不标（旧逻辑） | 超50降序前 N 个留星 |

- 名单型选多 = 职业精确点名的技能集合，进入即全★（职业认可），加满后超名额者摘星。**前台统一显示进度标签** `(可选职业技能X/N)` 挂在每个候选技能名后：X = 当前组内 `current>50` 的技能数（封顶 N），初始 X=0 显示 `0/N`，某技能加到>50 后整组同步更新为 `1/N`，直至 `N/N`。★ 与标签是两个独立装饰：★ 表达"职业认可"，标签表达"名额占用进度"。
- 分类型选多 = 从某技能分类里挑 N 个，回归以前"进入不★、加到50才挣星、标题需选N"的加法模型。
- 互斥（二选一）= 名单型选多 `chooseFrom{count:1}` 特例：进入双★，给一方加到50另一方摘星。

**当前代码错误（待重构修复）**：
- `listLimits`（按名单，如罪犯「下列选四」）走"加法模型"+ 逐技能丑标签「（下列选N）」：候选初始不★、到50才挣星、且每个候选技能名后挂丑标签。应改减法模型（进入全★、超名额摘星），并去掉丑标签改为统一进度标签 `(可选职业技能X/N)`（X=组内 current>50 数，封顶 N），与互斥体验一致且补充名额进度提示。
- `categoryLimits`（按分类名，如社交/艺术/科学）本就是加法模型（进入不★、加到50才挣星），**此为用户确认保留的旧逻辑，不是 bug**；仅需注意按分类名覆盖全分类（范围略宽）的历史行为保持不变。
- 重构方案 B 收敛为 `chooseFrom`（名单型减法）+ `categoryLimits`（分类型加法，保留）+ `chooseAny`（全选多加法，保留）+ baseline 固定锁定。职业数据改为纯声明式。

**实现补充约束（2026-07-12 用户复核标星集合后）**：
- **`艺术与手艺（任一）` 不是真实技能名**，而是「从艺术分类选 N」的占位符表达。在 `skillSpec` 中应写成 `categoryLimits:{艺术:N}`；而**特定艺术技能**（工程师→设计图纸、艺人→表演、农民→农事、记者→摄影、音乐家→乐器、作家→写作）应放进 `locked` 恒★。该假技能已从 SKILLS 库删除，职业统一改用 `categoryLimits:{艺术:1}`（传教士/艺术家/业余艺术爱好者/古文物学家）。
- **`chooseFrom` 摘星修正**：名额已满（`occupied.length >= count`）时组内未入选成员一律摘星，即便其 `current <= 50`——等价「选 N 选多」逻辑。保证士兵「急救/机械维修/其他语言 3选2」前两个>50 后第三个摘星；罪犯 7选4「进入全★、超名额摘星」行为不变（名额未满时候选全★）。
- 互斥（`mutualExclusion`）保持「进入双★、加满一方摘另一方」语义；若两方同时 >50 则两方都摘星（防御性，正常增量加点不会触发）。

**范围边界（用户 2026-07-12 最终确认）**：
- **名单型选多（互斥 / 职业精确名单如罪犯下列选四）走减法模型**：进入全★，加满后超名额的摘星。互斥与名单型选多体验一致。罪犯"下列选四"去掉逐技能丑标签「（下列选N）」，改为在候选技能名后显示统一进度标签 `(可选职业技能X/N)`（X=组内 current>50 数，封顶 N），既有★表现又有名额进度提示。
- **分类型选多（社交四选一/二、艺术任一、科学选二）回归以前逻辑（categoryLimits 加法模型）**：进入不标★、用户加到50+才★、分类标题显示「（需选N）」。用户 2026-07-12 明确"社交四选一回归以前交互逻辑"。
- **chooseAny（全技能选N）保持旧逻辑不变**：进入不标★、加到50+才★。
- 重构范围收窄为：仅把 `listLimits`（名单型选多，如罪犯下列选四）从加法改减法并入 chooseFrom、并去掉逐技能丑标签；`categoryLimits`（分类型选多）与 `optionalCount`（全选多）机制与显示完全不动。

**重构完成状态（2026-07-12）**：
- 职业数据已从中文串 `skills:[...]` 全部迁移为纯声明式 `skillSpec:{locked, chooseFrom, mutualExclusion, categoryLimits, chooseAny}`（43 个职业）。`utils/coc-data.js` 新增 `getOccupationSkillNames(spec)` 共享导出，供 `skills.js` 与 `character.js` 提取职业候选名（等价旧 `occ.skills` 前缀匹配行为）。
- `parseOccupationConfig` 改为直读 `skillSpec`（删 `parseChineseNum` 中文数字解析、`listLimits`/`optionalCount` 旧字段）。
- `updateSkillDisplayState` 统一字段：`chooseFrom`（减法，原 `listLimits`）、`mutualExclusion`（独立减法）、`categoryLimits`（加法）、`chooseAny`（加法，原 `optionalCount`）、`locked`。**`mutualExclusion` 保留为独立第 4 机制而非并入 `chooseFrom`**——关键语义差异：互斥要求"一方 current>50 即强制摘除另一方★（即使另一方 <50）"，而 `chooseFrom` 只摘除"current>50 且超出名额的候选"；二者进入时皆双★。互斥候选初始★由 `mutualMembers` 集合驱动。
- `character.js` `calcSkillPoints` 的 `occSkillNames` 改用 `getOccupationSkillNames(spec)`（社交仍走 `extraOccSkills` 动态；分类占位串 `艺术与手艺（任一）`/`科学（专业，两种）`/`一项社交技能（...）` 保持前缀匹配等价）。
- `occupation.js` 新增 `buildSkillChips(spec)` 把 `skillSpec` 转友好标签（`二选一：A / B` / `下列选N：…` / `社交选N` / `自选N项技能`），`occupation.wxml` 渲染 `item.skillChips`。
- 校验：临时脚本扫描全部 43 职业 `skillSpec`，`locked`/`chooseFrom`/`mutualExclusion` 成员均能在 `SKILLS` 命中（精确或基础名前缀，兼容「射击」裸名），并捕获修复护士 `locked` 悬空名「听觉」→「聆听」。所有改动文件 `node --check` 通过。**未 commit，待微信开发者工具重编译验证。**

**加点上限（85）判定约束（2026-07-12 修复）**：
- 职业技能编辑页输入上限 85（职业技能）vs 50（兴趣技能）由 `isOcc` 决定，原实现只按 `chooseAny` 单一剩余名额判断（`remainingSlots = chooseAny - 所有★技能数`），导致**社交分类占用被错误扣减自由选 N 名额**——例如律师「社交选2 + 自由选2」：选满社交2后 `occupiedExcludingThis` 把社交2计入，使 `chooseAny` 剩余变 0，自由选的技能加到>50 时被判为兴趣技能（上限50），即"社交覆盖自由选2"。
- **修复**：`pages/skills/skills.js` 删除单一 `remainingSlots` 判定，改为"假设本技能加到 finalValue 后重跑 `updateSkillDisplayState`，取该技能在本机制下是否成为★（`displayAsOcc`）"作为 `isOcc` 判定。四类机制各自独立：锁定恒★；名单型/互斥减法进全★（超名额/对方>50 才摘星）；分类型（社交/艺术/科学）与全选多（chooseAny）加法按各自剩余名额。各机制★占用互不串味。临时脚本加载真实代码验证：律师社交选2+自由选2 四个技能独立获得★且均上限85，互不覆盖。
- 同步修复分类提示文案被覆盖：`updateSkillDisplayState` 中原 `categoryLimits` 提示「（需选N）」会被 `chooseAny` 提示「（所有技能里选N个作为职业技能）」整体覆盖；改为 `（{分类}技能需选N）` 与 `（所有技能里另选N个作为职业技能）` 二选一、互不覆盖。

---

## 双端实时互通数据清单（2026-06-06 确认）

### Player→KP（玩家在小程序操作，KP实时看到）

| 数据类别 | 具体内容 | KP看到延迟 | 技术通道 |
|----------|----------|-----------|----------|
| 💚 HP | 当前值 + 最大值 | 实时 | pushEvent + room_players `.watch()` |
| 💙 SAN | 当前值 + 起始值 | 实时 | pushEvent + room_players `.watch()` |
| 💜 MP | 当前值 + 上限 | 实时 | pushEvent + room_players `.watch()` |
| 🏷️ 状态标签 | 昏迷/疯狂/倒地/束缚/中毒等 | 实时 | pushEvent(type: `status_replace`) |
| ⚔️ 武器数据 | 武器添加/删除/更新 | 实时 | pushEvent(`weapon_add/remove/update`) |
| 📝 背景信息 | 角色背景故事/描述 | 实时 | pushEvent(`background_update`) |
| 🧬 基础属性 | STR/DEX/INT/CON/APP/POW/SIZ/EDU | 实时 | room_players 文档 `.watch()` |
| 📐 派生属性 | MOV/BUILD/DB/Luck | 实时 | room_players 文档 `.watch()` |
| 🚪 进出房间 | 玩家加入/退出 | 实时 | room_players 文档 `.watch()` |

### KP→Player（KP在PC端操作，玩家看到）

| 数据类别 | 具体内容 | 玩家看到延迟 | 技术通道 |
|----------|----------|------------|----------|
| 💚 HP | KP修改玩家HP | 1~3秒 | events → syncPull |
| 💙 SAN | KP修改玩家SAN | 1~3秒 | events → syncPull |
| 💜 MP | KP修改玩家MP | 1~3秒 | events → syncPull |
| 🏷️ 状态标签 | KP添加/移除/替换玩家状态 | 1~3秒 | events → syncPull |
| ⚔️ 武器数据 | KP修改玩家武器 | 1~3秒 | events → syncPull |
| 📝 背景信息 | KP修改玩家背景 | 1~3秒 | events → syncPull |
| 🔌 房间关闭 | KP关房 | 1~3秒 | events → syncPull |

### 连接数分析

- 现状（混合同步）：**1个房间 = 1个连接**（仅KP的PC端 `.watch()`），个人版10连接 = 同时支持10间房
- 全实时方案：1个房间 = 1+玩家数 个连接，需升级标准版（¥199/月，500连接）
