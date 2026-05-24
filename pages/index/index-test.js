// pages/index/index-test.js
const { loadCharacters, saveCharacter } = require('../../utils/character')

Page({
  data: {
    characters: []
  },

  onLoad() {
    console.log('=== 页面加载 ===')
    this.loadCharacters()
  },

  onShow() {
    // 页面显示时刷新列表
    this.loadCharacters()
  },

  loadCharacters() {
    const list = loadCharacters()
    console.log('加载到的角色列表:', list)
    this.setData({ characters: list })
  },

  // 点击角色卡片，进入角色编辑页
  onCardTap(e) {
    const { id } = e.currentTarget.dataset
    console.log('点击角色:', id)
    wx.navigateTo({
      url: `/pages/character-edit/character-edit?id=${id}`
    })
  },

  // 创建新角色
  onAdd() {
    wx.navigateTo({
      url: '/pages/character-edit/character-edit'
    })
  }
})
