// app.js
const cloud = require('./utils/cloud')
const { getDefaultCharacter } = require('./utils/default-character')

App({
  onLaunch() {
    // 初始化云开发
    cloud.initCloud()
    
    // 初始化本地存储
    let characters = wx.getStorageSync('coc_characters')
    if (!characters) {
      // 首次启动：写入默认角色卡
      const amiti = getDefaultCharacter()
      wx.setStorageSync('coc_characters', [amiti])
    }

    // 加载 Special Elite 英文字体
    wx.loadFontFace({
      family: 'Special Elite',
      source: 'url("https://mastermind-5grqnmdu0d3a7d81-1404084982.tcloudbaseapp.com/SpecialElite.ttf")',
      global: true,
      success() { console.log('[Font] Special Elite 加载成功') },
      fail(err) { console.warn('[Font] Special Elite 加载失败', err) }
    })
  },

  globalData: {
    characters: []
  }
})
