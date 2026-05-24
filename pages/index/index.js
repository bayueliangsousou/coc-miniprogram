// pages/index/index.js
const { loadCharacters, deleteCharacter, calcDerived, pullCharacters } = require('../../utils/character')
const cloud = require('../../utils/cloud')
const dice = require('../../utils/dice-engine')

Page({
  data: {
    characters: [],
    swipeId: '',
    // 骰子模式
    diceMode: false,
    diceCounts: {},
    diceHasDice: false,
    diceResults: [],
    diceTotalSum: 0,
    fabRight: 30,
    fabBottom: 200,
    diceTypes: [
      { type: 'D3', label: 'D3' }, { type: 'D4', label: 'D4' },
      { type: 'D6', label: 'D6' }, { type: 'D8', label: 'D8' },
      { type: 'D10', label: 'D10' }, { type: 'D12', label: 'D12' },
      { type: 'D20', label: 'D20' }, { type: 'D100', label: 'D100' }
    ],
    showMineModal: false,
    userInfo: null
  },

  _touchStartX: 0,
  _touchStartY: 0,
  _isSwiping: false,

  onLoad() {
    if (!cloud.checkLogin()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.loadList()
    // 静默拉取云端角色卡并合并
    pullCharacters().then(merged => {
      const characters = merged.map(c => {
        const derived = calcDerived(c.attributes)
        return { ...c, derived }
      })
      this.setData({ characters })
    })
    // 加载用户信息
    const user = wx.getStorageSync('cloud_user')
    if (user) this.setData({ userInfo: user.userInfo || {} })
    // 加载浮球保存位置
    try {
      const saved = wx.getStorageSync('diceFabPos')
      if (saved) this.setData({ fabRight: saved.right || 30, fabBottom: saved.bottom || 200 })
    } catch(e) {}
  },

  onShow() {
    this.loadList()
    this.setData({ swipeId: '' })
  },

  loadList() {
    const list = loadCharacters()
    const characters = list.map(c => {
      const derived = calcDerived(c.attributes)
      return { ...c, derived }
    })
    this.setData({ characters })
  },

  onCreateTap() {
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

  // ── 骰子模式 ──
  _diceReady: false,
  _diceInit() {
    if (this._diceReady) return
    const query = this.createSelectorQuery()
    query.select('#dice-canvas').node().exec(res => {
      if (res && res[0] && res[0].node) {
        const sys = wx.getSystemInfoSync()
        dice.init(res[0].node, sys.windowWidth, sys.windowHeight)
        dice.startRenderLoop()
        this._diceReady = true
      } else {
        setTimeout(() => this._diceInit(), 300)
      }
    })
  },

  onDiceModeToggle() {
    if (this.data.diceMode) {
      // 关闭骰子模式
      dice.clearAllDice()
      this.setData({
        diceMode: false,
        diceCounts: {},
        diceHasDice: false,
        diceResults: [],
        diceTotalSum: 0
      })
    } else {
      // 打开骰子模式
      this.setData({ diceMode: true }, () => {
        this._diceInit()
      })
    }
  },

  onDiceBtnTap(e) {
    const type = e.currentTarget.dataset.type
    const counts = { ...this.data.diceCounts }
    counts[type] = (counts[type] || 0) + 1
    this.setData({ diceCounts: counts, diceHasDice: true })
  },

  async onDiceThrow() {
    if (dice.getIsAnimating()) return
    const counts = this.data.diceCounts
    dice.clearAllDice()
    this.setData({ diceResults: [], diceTotalSum: 0 })

    let hasAny = false
    for (const t in counts) {
      for (let i = 0; i < (counts[t] || 0); i++) {
        dice.addDiceToScene(t)
      }
      if (counts[t] > 0) hasAny = true
    }
    if (!hasAny) return

    this.setData({ diceCounts: {}, diceHasDice: false })
    await dice.startThrowAnimation()
    const r = dice.calculateResults()
    this.setData({ diceResults: r.results, diceTotalSum: r.totalSum })
  },

  // ── 浮球拖拽 ──
  _fabTouchStartX: 0,
  _fabTouchStartY: 0,
  _fabStartRight: 0,
  _fabStartBottom: 0,
  _fabIsDrag: false,

  onFabTouchStart(e) {
    this._fabTouchStartX = e.touches[0].clientX
    this._fabTouchStartY = e.touches[0].clientY
    this._fabStartRight = this.data.fabRight || 30
    this._fabStartBottom = this.data.fabBottom || 200
    this._fabIsDrag = false
  },

  onFabTouchMove(e) {
    const sys = wx.getSystemInfoSync()
    const dx = this._fabTouchStartX - e.touches[0].clientX
    const dy = this._fabTouchStartY - e.touches[0].clientY
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) this._fabIsDrag = true
    if (!this._fabIsDrag) return
    // 转换为 rpx
    const ratio = 750 / sys.windowWidth
    const right = Math.max(10, Math.min(sys.windowWidth - 60, this._fabStartRight + dx * ratio))
    const bottom = Math.max(80, Math.min(sys.windowHeight - 150, this._fabStartBottom + dy * ratio))
    this.setData({ fabRight: right, fabBottom: bottom })
  },

  onFabTouchEnd() {
    if (this._fabIsDrag) {
      wx.setStorage({ key: 'diceFabPos', data: { right: this.data.fabRight, bottom: this.data.fabBottom } })
    }
    this._fabIsDrag = false
  }
})
