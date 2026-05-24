# COC跑团小程序 - 云端同步部署指南

## 环境信息
- **云开发环境ID**: `mastermind-5grqnmdu0d3a7d81`
- **小程序AppID**: `wx99360a82b6a9a584`

## 部署步骤

### 1. 部署云函数

在微信开发者工具中：

1. 找到 `cloudfunctions/auth` 文件夹
2. **右键** → 选择 **"创建并部署：云端安装依赖"**
3. 对其他5个云函数重复上述操作：
   - `playerJoin`
   - `playerUpdate`
   - `kpGetPlayers`
   - `kpUpdatePlayer`
   - `sync`

### 2. 初始化数据库

在微信开发者工具控制台执行：

```javascript
const db = wx.cloud.database()
db.createCollection('campaigns')
db.createCollection('players')
db.createCollection('users')
db.createCollection('sync_logs')
```

或在云开发控制台手动创建这4个集合。

### 3. 配置数据库权限

在云开发控制台 → 数据库中，设置集合权限为 **"仅创建者可读写"**

### 4. 运行小程序

点击微信开发者工具的 **"编译"** 按钮

## 新增功能

### 登录页 (`pages/login/`)
- 微信一键登录
- 输入邀请码加入跑团
- 自动跳转到主页

### 云开发工具 (`utils/cloud.js`)
- 微信登录/注册
- 加入跑团
- 更新角色数据
- 数据同步

### 云函数 (6个)
- `auth` - 登录认证
- `playerJoin` - 加入跑团
- `playerUpdate` - 更新角色
- `kpGetPlayers` - KP获取玩家
- `kpUpdatePlayer` - KP修改玩家
- `sync` - 数据同步

## 注意事项

1. **首次使用需要登录** - 会自动跳转到登录页
2. **需要邀请码** - 向KP索取6位邀请码加入跑团
3. **免费版够用** - 3000资源点/月，预计消耗2600点

## 下一步（KP工作台对接）

待KP工作台项目准备好后，需要：
1. 对接微信扫码登录
2. 调用云函数获取玩家数据
3. 实现数据同步机制
