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
