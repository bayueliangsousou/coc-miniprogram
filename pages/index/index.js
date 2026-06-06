// pages/index/index.js
const { loadCharacters, deleteCharacter, calcDerived, pullCharacters } = require('../../utils/character')
const cloud = require('../../utils/cloud')

Page({
  data: {
    characters: [],
    swipeId: '',
    showMineModal: false,
    userInfo: null,
    isLoggedIn: false,
    statusBarHeight: 20,
    navHeight: 44
  },

  _touchStartX: 0,
  _touchStartY: 0,
  _isSwiping: false,

  onLoad() {
    const sys = wx.getSystemInfoSync()
    const navHeight = sys.platform === 'android' ? 48 : 44
    this.setData({ statusBarHeight: sys.statusBarHeight, navHeight })
    this.loadList()
    // 静默拉取云端角色卡并合并（仅已登录时）
    if (cloud.checkLogin()) {
      pullCharacters().then(merged => {
        const characters = merged.map(c => {
          const derived = calcDerived(c.attributes)
          const createdAt = c.createdAt ? this._formatDate(c.createdAt) : ''
          return { ...c, derived, createdAt }
        })
        this.setData({ characters })
      }).catch(() => {})
      // 加载用户信息
      const user = wx.getStorageSync('cloud_user')
      if (user) this.setData({ userInfo: user.userInfo || {} })
    }
  },

  onShow() {
    this.setData({ isLoggedIn: cloud.checkLogin() })
    this.loadList()
    this.setData({ swipeId: '' })
  },

  loadList() {
    let list = loadCharacters()
    // 无角色时展示空状态（默认卡在首次启动时已写入 Storage，删了就没了）
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
    const maxChars = 5
    if (this.data.characters.length >= maxChars) {
      wx.showToast({ title: '最多创建5个角色卡', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/character-edit/character-edit' })
  },

  // 点击卡片跳转（若已滑开则先收起）
  onCardTap(e) {
    const { id } = e.currentTarget.dataset
    if (this.data.swipeId === id) {
      this.setData({ swipeId: '' })
      return
    }
    if (this.data.swipeId) {
      this.setData({ swipeId: '' })
      return
    }
    wx.navigateTo({ url: `/pages/character-detail/character-detail?id=${id}` })
  },

  // 点击页面空白区域收起
  onPageTap() {
    if (this.data.swipeId) {
      this.setData({ swipeId: '' })
    }
  },

  // ── touch 事件 ──
  onTouchStart(e) {
    this._touchStartX = e.touches[0].clientX
    this._touchStartY = e.touches[0].clientY
    this._isSwiping = false
  },

  onTouchMove(e) {
    const dx = e.touches[0].clientX - this._touchStartX
    const dy = e.touches[0].clientY - this._touchStartY

    // 判断是水平滑动
    if (!this._isSwiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      this._isSwiping = true
    }

    if (!this._isSwiping) return

    const { id } = e.currentTarget.dataset
    // 向左滑动超过 40rpx 触发展开
    if (dx < -20) {
      if (this.data.swipeId !== id) {
        this.setData({ swipeId: id })
      }
    } else if (dx > 20) {
      // 向右滑动收起
      if (this.data.swipeId === id) {
        this.setData({ swipeId: '' })
      }
    }
  },

  onTouchEnd(e) {
    this._isSwiping = false
  },

  // 滑动删除
  onDeleteTap(e) {
    const { id } = e.currentTarget.dataset
    const char = this.data.characters.find(c => c.id === id)
    if (!char) return
    wx.showModal({
      title: '删除调查员',
      content: `确定要删除「${char.name || '未命名调查员'}」吗？`,
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          deleteCharacter(id)
          this.setData({ swipeId: '' })
          this.loadList()
        }
      }
    })
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
