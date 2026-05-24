# 小程序字号整理

## 字号统计概览

| 字号 | 使用次数 | 用途 |
|------|---------|------|
| 28rpx | 59次 | 主要正文、标签、按钮文字 |
| 24rpx | 38次 | 次要文字、提示信息、小标签 |
| 36rpx | 10次 | 大标题、重要数字 |
| 32rpx | 10次 | 标题、卡片标题 |
| 20rpx | 8次 | 最小文字、标签 |
| 40rpx | 5次 | 页面标题、大数字 |
| 34rpx | 5次 | 中等标题 |
| 30rpx | 5次 | 副标题 |
| 48rpx | 3次 | 大标题、Logo文字 |
| 22rpx | 2次 | 小标签 |
| 64rpx | 1次 | TabBar图标 |
| 50rpx | 1次 | 骰子结果大数字 |
| 42rpx | 1次 | 技能成功大文字 |
| 26rpx | 1次 | 表单标签 |
| 12rpx | 1次 | 极小文字 |
| 120rpx | 1次 | 首页大数字 |

---

## 各文件详细字号列表

### 1. app.wxss (全局样式)

| 行号 | 字号 | 选择器/用途 |
|------|------|------------|
| 22 | 28rpx | 页面标题 .page-title |
| 50 | 30rpx | 区块标题 .section-title |
| 78 | 24rpx | 区块副标题 .section-subtitle |
| 90 | 28rpx | 卡片标题 .card-title |
| 107 | 30rpx | 卡片副标题 .card-subtitle |
| 155 | 36rpx | 大数字 .big-number |
| 162 | 24rpx | 小标签 .small-tag |
| 194 | 26rpx | 表单标签 .form-label |
| 221 | 50rpx | 骰子结果 .dice-result |
| 231 | 24rpx | 提示文字 .hint-text |

### 2. components/custom-picker/custom-picker.wxss

| 行号 | 字号 | 选择器/用途 |
|------|------|------------|
| 48 | 28rpx | 选择器标题 .picker-title |
| 54 | 32rpx | 选中项 .picker-selected |
| 60 | 28rpx | 选项文字 .picker-item |
| 88 | 28rpx | 按钮文字 .picker-btn |

### 3. custom-tab-bar/index.wxss

| 行号 | 字号 | 选择器/用途 |
|------|------|------------|
| 35 | 24rpx | Tab文字 .tab-text |
| 70 | 64rpx | 中间大按钮 .center-btn |

### 4. pages/character-edit/character-edit.wxss

| 行号 | 字号 | 选择器/用途 |
|------|------|------------|
| 23 | 28rpx | 信息标签 .info-label |
| 32 | 28rpx | 信息输入框 .info-input |
| 45 | 28rpx | 信息选择器 .info-picker |
| 58 | 28rpx | 属性标签 .attr-label |
| 65 | 28rpx | 属性值 .attr-value |
| 78 | 28rpx | 技能名称 .skill-name |
| 85 | 28rpx | 技能值 .skill-value |
| 98 | 28rpx | 武器名称 .weapon-name |
| 105 | 28rpx | 武器伤害 .weapon-damage |
| 118 | 28rpx | 按钮文字 .btn-text |

### 5. pages/skills/skills.wxss

| 行号 | 字号 | 选择器/用途 |
|------|------|------------|
| 20 | 28rpx | 页面标题 .page-title |
| 26 | 24rpx | 搜索提示 .search-hint |
| 45 | 32rpx | 分类标题 .category-title |
| 52 | 22rpx | 技能数量 .skill-count |
| 82 | 24rpx | 技能名称 .skill-name |
| 88 | 20rpx | 技能基础值 .skill-base |
| 103 | 42rpx | 成功文字 .success-text |
| 113 | 28rpx | 技能点标签 .points-label |
| 118 | 28rpx | 技能点数值 .points-value |
| 143 | 20rpx | 提示文字 .tip-text |
| 168 | 28rpx | 搜索图标 .search-icon |
| 173 | 28rpx | 搜索输入 .search-input |
| 178 | 24rpx | 搜索提示 .search-placeholder |
| 202 | 24rpx | 职业点数 .occupation-points |
| 208 | 20rpx | 兴趣点数 .interest-points |
| 214 | 24rpx | 总点数 .total-points |
| 240 | 20rpx | 技能标签 .skill-tag |
| 244 | 24rpx | 技能值 .skill-value |
| 249 | 20rpx | 成功率 .success-rate |
| 266 | 30rpx | 弹窗标题 .modal-title |
| 301 | 24rpx | 表单标签 .form-label |
| 308 | 20rpx | 表单提示 .form-hint |
| 316 | 24rpx | 输入框 .form-input |
| 348 | 24rpx | 按钮 .form-btn |

### 6. pages/character-detail/character-detail.wxss

| 行号 | 字号 | 选择器/用途 |
|------|------|------------|
| 27 | 40rpx | 角色名 .character-name |
| 128 | 28rpx | 信息项 .info-item |
| 135 | 28rpx | 信息值 .info-value |
| 149 | 20rpx | 小标签 .mini-tag |
| 166 | 28rpx | 属性标签 .attr-label |
| 219 | 28rpx | 技能名称 .skill-name |
| 226 | 28rpx | 技能值 .skill-value |
| 239 | 40rpx | 大数字 .big-number |
| 253 | 20rpx | 小提示 .small-hint |
| 259 | 22rpx | 标签 .tag |
| 283 | 36rpx | 区块标题 .section-title |
| 290 | 28rpx | 武器名称 .weapon-name |
| 313 | 30rpx | 背景标题 .background-title |
| 320 | 24rpx | 背景内容 .background-content |
| 334 | 24rpx | 物品名称 .item-name |
| 342 | 24rpx | 物品描述 .item-desc |
| 360 | 24rpx | 法术名称 .spell-name |
| 367 | 24rpx | 法术消耗 .spell-cost |
| 374 | 28rpx | 按钮 .btn |
| 390 | 28rpx | 操作按钮 .action-btn |
| 396 | 36rpx | 主要按钮 .primary-btn |
| 403 | 28rpx | 次要按钮 .secondary-btn |
| 422 | 40rpx | 骰子按钮 .dice-btn |

### 7. pages/index/index.wxss

| 行号 | 字号 | 选择器/用途 |
|------|------|------------|
| 52 | 28rpx | 菜单文字 .menu-text |
| 76 | 34rpx | 卡片标题 .card-title |
| 82 | 24rpx | 卡片描述 .card-desc |
| 86 | 24rpx | 卡片时间 .card-time |
| 107 | 32rpx | 弹窗标题 .modal-title |
| 114 | 24rpx | 弹窗内容 .modal-content |
| 129 | 120rpx | 大数字 .big-number |
| 135 | 36rpx | 统计标题 .stat-title |
| 142 | 24rpx | 统计描述 .stat-desc |

### 8. pages/occupation/occupation.wxss

| 行号 | 字号 | 选择器/用途 |
|------|------|------------|
| 15 | 28rpx | 职业名称 .occupation-name |
| 22 | 28rpx | 职业描述 .occupation-desc |
| 56 | 32rpx | 标题 .title |
| 63 | 24rpx | 描述 .description |
| 75 | 24rpx | 技能标签 .skill-tag |
| 89 | 24rpx | 属性标签 .attr-tag |
| 105 | 24rpx | 提示文字 .hint |

### 9. pages/background/background.wxss

| 行号 | 字号 | 选择器/用途 |
|------|------|------------|
| 12 | 24rpx | 背景类型 .bg-type |
| 20 | 28rpx | 背景标题 .bg-title |
| 36 | 24rpx | 背景内容 .bg-content |

### 10. pages/about/about.wxss

| 行号 | 字号 | 选择器/用途 |
|------|------|------------|
| 25 | 48rpx | Logo文字 .logo-text |
| 32 | 28rpx | 版本号 .version |
| 44 | 32rpx | 区块标题 .section-title |
| 51 | 28rpx | 内容文字 .content |
| 66 | 32rpx | 按钮 .btn |
| 84 | 24rpx | 版权信息 .copyright |

### 11. pages/login/login.wxss

| 行号 | 字号 | 选择器/用途 |
|------|------|------------|
| 19 | 48rpx | Logo .logo |
| 26 | 28rpx | 标题 .title |
| 43 | 34rpx | 输入框 .input |
| 65 | 34rpx | 按钮文字 .btn-text |
| 82 | 36rpx | 主按钮 .primary-btn |
| 92 | 30rpx | 次按钮 .secondary-btn |
| 101 | 34rpx | 链接 .link |
| 120 | 36rpx | 大标题 .big-title |
| 127 | 24rpx | 小提示 .small-hint |
| 137 | 34rpx | 表单按钮 .form-btn |
| 150 | 28rpx | 底部文字 .footer-text |

---

## 建议统一规范

根据你的要求，建议统一为以下规范：

| 用途 | 建议字号 |
|------|---------|
| 正文/标签/按钮 | 28rpx |
| 标题 | 32rpx |
| 大标题 | 36rpx |
| 次要文字/提示 | 24rpx |
| 极小标签 | 20rpx |

**需要修改的地方：**
1. 所有非28rpx的正文字号统一改为28rpx
2. 技能名称统一为28rpx
3. 高度问题需要检查行高和padding
