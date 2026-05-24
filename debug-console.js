// 在微信开发者工具控制台执行以下代码（一次执行一行）

// 1. 检查页面是否正常加载
console.log('当前页面实例:', getCurrentPages())

// 2. 直接检查本地存储
console.log('本地存储中的角色列表:', wx.getStorageSync('coc_characters'))

// 3. 如果需要清空存储（重新开始）
wx.removeStorageSync('coc_characters')

// 4. 手动添加一个测试角色
const charList = wx.getStorageSync('coc_characters') || []
charList.push({
  id: 'test_001',
  name: '测试角色',
  occupation: '侦探',
  age: '25',
  gender: '男',
  birthplace: '伦敦',
  attributes: {
    STR: 50, CON: 50, SIZ: 50, DEX: 50,
    APP: 50, INT: 50, POW: 50, EDU: 50, LUK: 50
  },
  skills: {},
  background: {},
  createdAt: Date.now(),
  updatedAt: Date.now()
})
wx.setStorageSync('coc_characters', charList)

// 5. 刷新页面后应该能看到角色卡片
console.log('已添加测试角色，请点击页面右上角的三个点 -> 重新编译')
