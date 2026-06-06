# 开发约定与规范

## Git 提交规范（Conventional Commits）

| 前缀 | 用法 |
|------|------|
| feat: | 新功能 |
| fix: | Bug 修复 |
| refactor: | 重构（不改变功能的代码调整）|
| style: | 样式调整（UI/CSS）|
| docs: | 文档更新 |
| chore: | 杂项（依赖更新、配置调整）|

## 版本号规则

- 小程序：v{MAJOR}.{MINOR}.{PATCH}（当前 v1.4.0）
- PC端：独立版本号（待定格式）
- 发布时自动 bump 版本号

## 部署流程

### 小程序
1. 微信开发者工具 → 构建npm
2. 云函数部署（右键 → 创建并部署）
3. 微信开发者工具上传
4. 微信公众平台提交审核

### PC端
1. cd Desktop/0320
2. pnpm run build（tsc + vite build）
3. cloudbase framework deploy（自动部署 dist/）

## 保存频率
- 每小时自动检查变更并提交
- 手动「保存一下」随时触发

## 备份策略
- 每次发布时完整备份到 ~/.workbuddy/backups/
- 每周自动备份

## 设计原则
- 角色分类：玩家卡(isPlayer=true) vs 人物卡(isPlayer=false)
- 术语统一：禁止 NPC/Enemy，统一用「人物/角色」
- 小程序属性名：大写（STR/CON/SIZ/...）
- PC端属性名：小写（str/con/siz/...）
