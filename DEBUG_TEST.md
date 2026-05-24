# 调试测试步骤

## 在微信开发者工具控制台执行以下命令测试

### 1. 检查页面数据
```javascript
// 获取当前页面实例
const pages = getCurrentPages()
const currentPage = pages[pages.length - 1]
console.log('当前页面数据:', currentPage.data)
console.log('角色列表:', currentPage.data.characters)
console.log('角色数量:', currentPage.data.characters.length)
```

### 2. 手动设置测试数据
```javascript
// 手动添加一个测试角色
const testCharacter = {
  id: 'test_001',
  name: '测试调查员',
  occupation: '侦探',
  age: '25',
  attributes: {
    STR: 50, CON: 50, SIZ: 50, DEX: 50,
    APP: 50, INT: 50, POW: 50, EDU: 50, LUK: 50
  },
  skills: {},
  background: {}
}

// 保存到本地存储
const list = wx.getStorageSync('coc_characters') || []
list.unshift(testCharacter)
wx.setStorageSync('coc_characters', list)

// 触发页面刷新
const pages = getCurrentPages()
const currentPage = pages[pages.length - 1]
currentPage.loadList()
```

### 3. 清空本地存储
```javascript
wx.removeStorageSync('coc_characters')
const pages = getCurrentPages()
const currentPage = pages[pages.length - 1]
currentPage.loadList()
```

### 4. 检查 DOM 元素
```javascript
// 检查 FAB 按钮是否存在
console.log('FAB 按钮应该显示在右下角')
```
