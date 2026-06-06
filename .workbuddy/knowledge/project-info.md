# coc-miniprogram 项目基石

## 基本信息
- 项目名：帷幕之主-coc版
- AppID：wx99360a82b6a9a584
- 版本号：v1.4.0
- 框架：微信原生小程序（WXML/WXSS/JS）
- 路径：/Users/liuqilong/Projects/coc-miniprogram/
- GitHub：bayueliangsousou/coc-miniprogram
- CloudBase 环境：mastermind-5grqnmdu0d3a7d81

## 技术栈
- 微信原生小程序（基础库 3.15.0）
- threejs-miniprogram ^0.0.8（3D骰子）
- cannon-es ^0.20.0（物理引擎）

## 页面结构
- pages/index/ - 首页（调查员名册）
- pages/login/ - 登录
- pages/character-edit/ - 角色卡编辑
- pages/character-detail/ - 角色卡查看/详情
- pages/occupation/ - 职业选择
- pages/skills/ - 技能编辑
- pages/background/ - 背景编辑
- pages/join-room/ - 加入房间
- packageDice/pages/dice/ - 3D骰子页面（分包）

## 组件
- custom-picker - 通用底部选择器
- dice-tool - 骰子工具（3D物理引擎）

## 云函数
auth, characterSync, createRoom, joinRoom, closeRoom, getRoomPlayers, playerJoin, playerUpdate, kpGetPlayers, kpUpdatePlayer, pushEvent, syncPull, sync, initDb

## 数据库集合
users, campaigns, players, rooms, room_players, events, sync_logs

## 开发阶段
- ✅ P0/P1: Bug修复、代码审计
- ✅ P2: CSS/Console/死代码清理
- ✅ P3: 去重/抽象/N+1优化
- ✅ P4: pages/dice 目录清理
- 🔄 P5: 角色详情页 UI 细化中
