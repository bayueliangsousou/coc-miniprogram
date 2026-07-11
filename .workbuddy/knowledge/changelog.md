# 版本变更日志

## v1.4.0 (2026)
- 角色卡查看页UI优化
- 移除冗余 pages/dice 目录
- 骰子功能抽离为 dice-tool 共享组件
- P0-P4 代码质量优化完成
- P5 角色详情页 UI 细化进行中

## 2026-07-11
- **fix: 角色卡编辑未存档丢失（草稿双写）** — 根因：`character-edit` 页编辑态只存于 `this.data.character`，`saveCharacter` 仅在「跳转子页前」和「点保存」时触发；在主页改了姓名/属性/武器后若 App 被系统回收或划掉（未跳转、未保存），改动全部丢失。修复：`utils/character.js` 新增草稿 API（纯本地、不触发云端）：`saveDraft/loadDraft/clearDraft`（已存档角色，key `coc_draft_<id>`）+ `saveNewDraft/loadNewDraft/clearNewDraft`（尚未首次存档的新角色，固定 key `coc_draft_new`）+ `isDraftNewer`。`character-edit.js` 在 `onHide`/`onUnload` 时 `flushDraft()` 落地草稿；`onShow` 优先用比存档更新的草稿还原并 `toast` 提示「已恢复未保存的草稿」；`onSave` 成功后清草稿。涉及文件：`utils/character.js`、`pages/character-edit/character-edit.js`
