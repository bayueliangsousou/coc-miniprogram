# 小程序部署检查清单

## 部署前检查

### 1. 项目配置确认
- [x] AppID: `wxe5f7bd1da437419c`
- [x] 云开发环境: `mastermind-5grqnmdu0d3a7d81`
- [x] 自定义 TabBar 已配置
- [x] 所有页面已在 app.json 注册

### 2. 文件完整性检查
- [x] pages/ - 9个页面
- [x] components/ - 组件
- [x] custom-tab-bar/ - 自定义TabBar
- [x] assets/icons/ - 图标资源
- [x] cloudfunctions/ - 6个云函数
- [x] utils/ - 工具函数

### 3. 云开发配置
- [x] 云函数: auth, playerJoin, playerUpdate, kpGetPlayers, kpUpdatePlayer, sync
- [x] 数据库集合: campaigns, players, users, sync_logs

---

## 部署步骤

### 第一步：打开微信开发者工具
1. 打开微信开发者工具
2. 导入项目 `/Users/liuqilong/Desktop/coc-miniprogram`
3. 确认 AppID: `wxe5f7bd1da437419c`

### 第二步：部署云函数（必须）
在微信开发者工具中：
1. 展开 `cloudfunctions/` 文件夹
2. 对以下6个云函数，**右键** → **"创建并部署：云端安装依赖"**：
   - `auth`
   - `playerJoin`
   - `playerUpdate`
   - `kpGetPlayers`
   - `kpUpdatePlayer`
   - `sync`

### 第三步：初始化数据库
在微信开发者工具控制台执行：
```javascript
const db = wx.cloud.database()
db.createCollection('campaigns')
db.createCollection('players')
db.createCollection('users')
db.createCollection('sync_logs')
```

### 第四步：上传代码
1. 点击微信开发者工具右上角 **"上传"** 按钮
2. 填写版本号（如：1.0.0）
3. 填写项目备注
4. 点击 **"上传"**

### 第五步：提交审核
1. 登录 [微信公众平台](https://mp.weixin.qq.com)
2. 进入 **"版本管理"**
3. 找到刚才上传的开发版本
4. 点击 **"提交审核"**
5. 填写小程序信息，提交审核

### 第六步：发布上线
审核通过后，点击 **"发布"** 即可上线

---

## 注意事项

1. **首次部署必须先部署云函数**，否则登录功能无法使用
2. **数据库权限**设置为"仅创建者可读写"
3. 审核通常需要 1-3 个工作日
4. 免费版云开发额度：3000资源点/月

---

## 最近修改汇总

### UI优化
- TabBar 图标统一为 50px 正方形，白色边框
- 选中状态黄色背景，未选中深蓝背景
- 反馈按钮点击弹窗提示"功能暂未开放"

### 字号统一
- 所有主要文字统一为 28rpx
- 属性数字使用 38rpx

### 布局调整
- 调查员名册 HP/SAN/MP 标签在前数字在后
- 九宫格属性英文中文同行显示
- 属性输入框 60×40px
