# CloudBase 部署指南

## 环境信息
- **环境ID**: `mastermind-5grqnmdu0d3a7d81`
- **环境名称**: mastermind

## 部署步骤

### 1. 安装 CloudBase CLI

```bash
npm install -g @cloudbase/cli
```

### 2. 登录 CloudBase

```bash
tcb login
```

会弹出二维码，用微信扫描登录。

### 3. 部署云函数

在项目根目录执行：

```bash
cd /Users/liuqilong/Desktop/coc-miniprogram

# 部署 auth 函数
tcb fn deploy auth --env mastermind-5grqnmdu0d3a7d81

# 部署 playerJoin 函数
tcb fn deploy playerJoin --env mastermind-5grqnmdu0d3a7d81

# 部署 playerUpdate 函数
tcb fn deploy playerUpdate --env mastermind-5grqnmdu0d3a7d81

# 部署 kpGetPlayers 函数
tcb fn deploy kpGetPlayers --env mastermind-5grqnmdu0d3a7d81

# 部署 kpUpdatePlayer 函数
tcb fn deploy kpUpdatePlayer --env mastermind-5grqnmdu0d3a7d81

# 部署 sync 函数
tcb fn deploy sync --env mastermind-5grqnmdu0d3a7d81
```

### 4. 初始化数据库

在 CloudBase 控制台执行：

1. 访问 https://console.cloud.tencent.com/tcb
2. 进入 `mastermind` 环境
3. 点击左侧菜单 **"数据库"**
4. 创建以下集合：
   - `users` - 用户表
   - `campaigns` - 战役表
   - `players` - 玩家表
   - `sync_logs` - 同步日志表

### 5. 配置云函数触发器（可选）

如果需要 HTTP 访问云函数，需要在控制台配置 HTTP 触发器。

## 本地开发

在部署到云端之前，代码会使用**本地模拟模式**，可以正常预览和测试页面。

部署到云端后，会自动切换到真实的 CloudBase 调用。

## 测试步骤

1. 在微信开发者工具中编译运行
2. 点击"微信一键登录"测试登录功能
3. 输入邀请码测试加入跑团功能
4. 进入首页测试角色列表

## 常见问题

### Q: 登录提示"请求失败"
A: 检查是否已部署云函数，或网络连接是否正常

### Q: 云函数部署失败
A: 检查是否已经登录 CloudBase CLI (`tcb login`)

### Q: 数据库操作失败
A: 检查是否已创建对应的集合

## 联系

如有问题，请检查 CloudBase 控制台日志或联系开发者。
