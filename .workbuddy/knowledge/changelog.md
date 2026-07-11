# 版本变更日志

## v1.4.0 (2026)
- 角色卡查看页UI优化
- 移除冗余 pages/dice 目录
- 骰子功能抽离为 dice-tool 共享组件
- P0-P4 代码质量优化完成
- P5 角色详情页 UI 细化进行中

## 2026-07-11
- **fix: 角色卡编辑未存档丢失（草稿双写）** — 根因：`character-edit` 页编辑态只存于 `this.data.character`，`saveCharacter` 仅在「跳转子页前」和「点保存」时触发；在主页改了姓名/属性/武器后若 App 被系统回收或划掉（未跳转、未保存），改动全部丢失。修复：`utils/character.js` 新增草稿 API（纯本地、不触发云端）：`saveDraft/loadDraft/clearDraft`（已存档角色，key `coc_draft_<id>`）+ `saveNewDraft/loadNewDraft/clearNewDraft`（尚未首次存档的新角色，固定 key `coc_draft_new`）+ `isDraftNewer`。`character-edit.js` 在 `onHide`/`onUnload` 时 `flushDraft()` 落地草稿；`onShow` 优先用比存档更新的草稿还原并 `toast` 提示「已恢复未保存的草稿」；`onSave` 成功后清草稿。涉及文件：`utils/character.js`、`pages/character-edit/character-edit.js`
- **fix: 草稿双写扩展到 skills/background/occupation 三个编辑子页** — 用户实测编辑技能→后台切出切回→技能回归基础数值。根因：①草稿双写仅挂 character-edit 主页，子页未接；②`skills.js` `onShow`→`initSkills` 无条件 `getCharacterById` 重建覆盖编辑态；③编辑动作只改 `skillCategories.current` 不回写 `character.skills`（展示态/数据态断层，落草稿也存不到真值）；④此前误判"子页已有自动保存"（子页 `saveCharacter` 仅 `onSave`/删自定义技能/信用评级 blur 时调用，无 `onHide` 自动保存）。修复：`saveDraft` 改**合并式**（基于已有草稿或存档 merge，避免三子页共用 `coc_draft_<id>` 互相覆盖）；`skills.js` `initSkills` 开头 `loadDraft` 优先合并草稿 skills、`onHide` 经 `collectSkills()` 收集技能值落草稿、`_doSave` 成功 `clearDraft`；`background.js`/`occupation.js` `onLoad` 优先合并草稿对应字段、`onHide` 落草稿、保存成功 `clearDraft`。涉及文件：`utils/character.js`、`pages/skills/skills.js`、`pages/background/background.js`、`pages/occupation/occupation.js`
- **feat: 新角色属性编辑区增加「总和」与「幸运单独投掷」** — 仅 `isNew`（新建角色）时显示，与现有「随机」按钮同标题行。①「总和：X」行：X = STR+CON+SIZ+DEX+APP+INT+POW+EDU 共8项之和（不含幸运），由 `recalcAttrSum()` 在 `onAttrInput`/`onRollAll`/`restoreCharacterData` 后实时重算 `attrSum`；②幸运格右侧「投」按钮（`onRollLuck`）：点击直接算 `3d6×5`（复用 `coc-data.rollDice`），写进 `character.attributes.LUK`，无动画无过程。编辑已有角色时不显示（沿用「随机」按钮 isNew 逻辑）。涉及文件：`pages/character-edit/character-edit.js`、`.wxml`、`.wxss`
- **fix: 角色详情页状态选择弹窗已选项无选中标记** — 现象：已给角色挂上「重伤」等状态后，再次打开「选择状态」弹窗，已选项前没有清晰的对号/点，无法识别当前选中了哪些。根因：原代码用 `character.status.includes(item.value)` 判断选中，并用 `.radio-check` 小圆点做标记；由于小圆点颜色依赖 CSS 变量 `--status-color` 且样式与未选项差异过小，导致选中标记不明显/在某些情况下看不清。修复：在 `character-detail.js` 增加 `selectedStatusMap`（从 `character.status` 预计算映射），在 `onShow`/`onShowStatusPicker` 及状态变更后同步刷新；`wxml` 改用 `selectedStatusMap[item.value]` 判断；`wxss` 选中项 radio 改为实心圆 + 白色「✓」，标签加粗并使用状态色。涉及文件：`pages/character-detail/character-detail.js`、`.wxml`、`.wxss`
