// components/dice-tool/dice-tool.js
const dice = require('../../utils/dice-engine')

Component({
  properties: {
    fabBottomDefault: {
      type: Number,
      value: 200
    },
    fabBg: {
      type: String,
      value: '#f5f5f0'
    },
    throwBtnBg: {
      type: String,
      value: 'linear-gradient(135deg, #e8b830, #c89a20)'
    },
    bottomLimit: {
      type: Number,
      value: 150
    },
    showOverlay: {
      type: Boolean,
      value: false
    }
  },

  data: {
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
    _skillCheckMode: false,
    _overlayVisible: false,
    bgLoaded: false
  },

  // ─── 私有状态 ───
  _diceReady: false,
  _fabTouchStartX: 0,
  _fabTouchStartY: 0,
  _fabStartRight: 0,
  _fabStartBottom: 0,
  _fabIsDrag: false,
  _d100RetryCount: 0,

  lifetimes: {
    attached() {
      this.setData({ fabBottom: this.properties.fabBottomDefault })
      try {
        const saved = wx.getStorageSync('diceFabPos')
        if (saved) {
          this.setData({
            fabRight: saved.right || 30,
            fabBottom: saved.bottom || this.properties.fabBottomDefault
          })
        }
      } catch (e) {}
    },
    detached() {
      // 组件销毁时停止渲染循环，防止内存泄漏
      if (this._diceReady) {
        try { dice.stopRenderLoop() } catch (e) {}
        this._diceReady = false
      }
    }
  },

  observers: {
    'diceMode, _skillCheckMode, showOverlay': function (diceMode, _skillCheckMode, showOverlay) {
      this.setData({
        _overlayVisible: diceMode || _skillCheckMode || showOverlay
      })
    }
  },

  // ─── 所有方法必须放在 methods 里 ───
  methods: {

    // ─── 公共方法（供父页面 selectComponent 调用） ───

    open() {
      if (this.data.diceMode) return
      this.setData({ diceMode: true }, () => {
        this._diceInit()
      })
    },

    close() {
      if (this.data._skillCheckMode) {
        dice.clearAllDice()
        this.setData({ _skillCheckMode: false })
      }
      if (this.data.diceMode) {
        dice.clearAllDice()
        this.setData({
          diceMode: false,
          diceCounts: {},
          diceHasDice: false,
          diceResults: [],
          diceTotalSum: 0
        })
      }
      // 关闭时停止渲染循环，防止跳页后旧循环残留叠加
      dice.stopRenderLoop()
      this._diceReady = false
    },

    isInDiceMode() {
      return this.data.diceMode || this.data._skillCheckMode
    },

    doD100Check(name, val) {
      if (val <= 0) {
        wx.showToast({ title: '该数值无效', icon: 'none' })
        return
      }
      if (dice.getIsAnimating()) return

      this._d100RetryCount = 0
      this.setData({
        _skillCheckMode: true,
        diceResults: [],
        diceTotalSum: 0
      }, () => {
        this._diceInit()
        const self = this
        const MAX_RETRIES = 20 // 最多重试 20 次（4秒）
        const tryThrow = async function () {
          if (!self._diceReady) {
            if (++self._d100RetryCount >= MAX_RETRIES) {
              console.error('[dice-tool] D100 初始化超时')
              self.setData({ _skillCheckMode: false })
              return
            }
            setTimeout(tryThrow, 200)
            return
          }
          if (dice.getIsAnimating()) return

          dice.clearAllDice()
          dice.addDiceToScene('D100')

          await dice.startThrowAnimation()
          const r = dice.calculateResults()

          const d100Result = r.results.find(item => item.type === 'd100')
          const rollValue = d100Result ? d100Result.value : 0

          self.triggerEvent('skillcheckresult', {
            skillName: name,
            skillValue: val,
            rollValue: rollValue
          })
        }
        tryThrow()
      })
    },

    // ─── 事件处理（WXML 绑定） ───

    onOverlayTap() {
      if (dice.getIsAnimating()) return
      if (this.data.diceMode) {
        this.onDiceModeToggle()
        this.triggerEvent('close', { source: 'collapse' })
      } else if (this.data._skillCheckMode) {
        dice.clearAllDice()
        this.setData({ _skillCheckMode: false })
        this.triggerEvent('close', { source: 'overlay-tap' })
      }
    },

    onDiceModeToggle() {
      if (this.data.diceMode) {
        dice.clearAllDice()
        dice.stopRenderLoop()
        this._diceReady = false
        this.setData({
          diceMode: false,
          diceCounts: {},
          diceHasDice: false,
          diceResults: [],
          diceTotalSum: 0
        })
      } else {
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

      this.setData({ diceCounts: {}, diceHasDice: false, bgLoaded: false })
      await dice.startThrowAnimation()
      const r = dice.calculateResults()
      this.setData({ diceResults: r.results, diceTotalSum: r.totalSum })
    },

    noop() {},

    onBgLoaded() {
      this.setData({ bgLoaded: true })
    },

    onFabTouchStart(e) {
      this._fabTouchStartX = e.touches[0].clientX
      this._fabTouchStartY = e.touches[0].clientY
      this._fabStartRight = this.data.fabRight || 30
      this._fabStartBottom = this.data.fabBottom || this.properties.fabBottomDefault
      this._fabIsDrag = false
    },

    onFabTouchMove(e) {
      const sys = wx.getSystemInfoSync()
      const dx = this._fabTouchStartX - e.touches[0].clientX
      const dy = this._fabTouchStartY - e.touches[0].clientY
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) this._fabIsDrag = true
      if (!this._fabIsDrag) return

      const ratio = 750 / sys.windowWidth
      const right = Math.max(10, Math.min(sys.windowWidth - 60, this._fabStartRight + dx * ratio))
      const bottom = Math.max(80, Math.min(sys.windowHeight - this.properties.bottomLimit, this._fabStartBottom + dy * ratio))
      this.setData({ fabRight: right, fabBottom: bottom })
    },

    onFabTouchEnd() {
      if (this._fabIsDrag) {
        wx.setStorage({
          key: 'diceFabPos',
          data: { right: this.data.fabRight, bottom: this.data.fabBottom }
        })
      } else {
        this.onDiceModeToggle()
      }
      this._fabIsDrag = false
    },

    // ─── 私有方法 ───

    _diceInit() {
      if (this._diceReady) return
      const query = this.createSelectorQuery()
      query.select('#dice-canvas').node().exec(res => {
        if (this._diceReady) return           // 异步回调内二次守卫，防止并发重复初始化
        if (res && res[0] && res[0].node) {
          const sys = wx.getSystemInfoSync()
          dice.init(res[0].node, sys.windowWidth, sys.windowHeight)
          dice.startRenderLoop()
          this._diceReady = true
        } else {
          setTimeout(() => this._diceInit(), 300)
        }
      })
    }
  }
})
