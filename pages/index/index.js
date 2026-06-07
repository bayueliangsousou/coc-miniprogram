// pages/index/index.js
const { loadCharacters, deleteCharacter, calcDerived, pullCharacters } = require('../../utils/character')
const cloud = require('../../utils/cloud')

Page({
  data: {
    characters: [],
    showMineModal: false,
    userInfo: null,
    isLoggedIn: false,
    statusBarHeight: 20,
    navHeight: 44,
    navBarHeight: 0,       // statusBarHeight + navHeight（px），供 WXML 用
    deleteMode: false,
    deleteTargetId: '',
    deleteTargetName: '',
    bgImage: '',
    scrollViewHeight: 0    // scroll-view 精确高度（px）
  },

  onLoad() {
    const sys = wx.getSystemInfoSync()
    const navHeight = sys.platform === 'android' ? 48 : 44
    const statusBarHeight = sys.statusBarHeight
    const navBarHeight = statusBarHeight + navHeight

    this.setData({
      statusBarHeight,
      navHeight,
      navBarHeight
    })
    this.loadList()

    if (cloud.checkLogin()) {
      pullCharacters().then(merged => {
        const characters = merged.map(c => {
          const derived = calcDerived(c.attributes)
          const createdAt = c.createdAt ? this._formatDate(c.createdAt) : ''
          return { ...c, derived, createdAt }
        })
        this.setData({ characters })
      }).catch(() => {})
      const user = wx.getStorageSync('cloud_user')
      if (user) this.setData({ userInfo: user.userInfo || {} })
    }
  },

  onShow() {
    this.setData({ isLoggedIn: cloud.checkLogin() })
    this.loadList()
    this.setData({ deleteMode: false, deleteTargetId: '', deleteTargetName: '' })
  },

  loadList() {
    let list = loadCharacters()
    if (!list || list.length === 0) {
      this.setData({ characters: [] })
      return
    }
    const characters = list.map(c => {
      const derived = calcDerived(c.attributes)
      const createdAt = c.createdAt ? this._formatDate(c.createdAt) : ''
      return { ...c, derived, createdAt }
    })
    this.setData({ characters })
  },

  _formatDate(ts) {
    const d = new Date(ts)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}/${m}/${day}`
  },

  onCreateTap() {
    if (!cloud.checkLogin()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    if (this.data.characters.length >= 5) {
      wx.showToast({ title: '最多创建5个角色卡', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/character-edit/character-edit' })
  },

  // 点击卡片（删除模式下不跳转）
  onCardTap(e) {
    if (this.data.deleteMode) {
      this.setData({ deleteMode: false, deleteTargetId: '', deleteTargetName: '' })
      return
    }
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/character-detail/character-detail?id=${id}` })
  },

  // 点击页面空白区域 → 退出删除模式
  onPageTap() {
    if (this.data.deleteMode) {
      this.setData({ deleteMode: false, deleteTargetId: '', deleteTargetName: '' })
    }
  },

  // 长按卡片 → 进入删除模式
  onCardLongPress(e) {
    const { id } = e.currentTarget.dataset
    const char = this.data.characters.find(c => c.id === id)
    if (!char) return
    wx.vibrateShort({ type: 'medium' })
    this.setData({
      deleteMode: true,
      deleteTargetId: id,
      deleteTargetName: char.name || '未命名调查员'
    })
  },

  // 确认删除
  onDeleteConfirm() {
    const { deleteTargetId, deleteTargetName } = this.data
    if (!deleteTargetId) return
    wx.showModal({
      title: '删除调查员',
      content: `确定要删除「${deleteTargetName}」吗？`,
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          deleteCharacter(deleteTargetId)
          this.setData({ deleteMode: false, deleteTargetId: '', deleteTargetName: '' })
          this.loadList()
        }
      }
    })
  },

  // 取消删除
  onDeleteCancel() {
    this.setData({ deleteMode: false, deleteTargetId: '', deleteTargetName: '' })
  },

  // ── 我的 ──
  onMineTap() {
    if (!cloud.checkLogin()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    const user = wx.getStorageSync('cloud_user')
    if (user) this.setData({ userInfo: user.userInfo || {} })
    this.setData({ showMineModal: true })
  },

  onMineModalClose() {
    this.setData({ showMineModal: false })
  },

  onLogoutTap() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新登录',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          cloud.logout()
          this.setData({ showMineModal: false })
          wx.redirectTo({ url: '/pages/login/login' })
        }
      }
    })
  },

  // ── 骰子组件事件 ──
  onDiceClose(e) {
    // 骰子组件关闭时的回调（预留扩展点）
  }
})
