# 打开小程序项目

## 方法一：用微信开发者工具（推荐）

1. 打开微信开发者工具
2. 点击「导入项目」
3. 项目目录选择：
   ```
   /Users/liuqilong/Desktop/coc-miniprogram
   ```
4. 填写项目名称：`克苏鲁调查员车卡`
5. AppID 可以选择「测试号」或填你自己的 AppID
6. 点击「导入」

## 方法二：命令行自动打开

如果你的系统安装了微信开发者工具，可以尝试用命令行直接打开：

```bash
# macOS
open -a "wechatwebdevtools" /Users/liuqilong/Desktop/coc-miniprogram

# 如果上面命令不行，用这个
/Applications/wechatwebdevtools.app/Contents/MacOS/cli import /Users/liuqilong/Desktop/coc-miniprogram
```

## 注意事项

- 这是纯原生微信小程序项目，不需要构建步骤
- 所有页面路由已在 `app.json` 中配置好
- 工具文件 `utils/character.js` 和 `utils/coc-data.js` 包含完整的 CoC 七版数据
- 数据存储使用 `wx.storage`，本地离线可用
