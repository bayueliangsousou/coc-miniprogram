// app.js
const cloud = require('./utils/cloud')

App({
  onLaunch() {
    // 初始化云开发
    cloud.initCloud()
    
    // 初始化本地存储
    const characters = wx.getStorageSync('coc_characters')
    if (!characters) {
      wx.setStorageSync('coc_characters', [])
    }
  },

  globalData: {
    characters: []
  }
})
