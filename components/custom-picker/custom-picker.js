// components/custom-picker/custom-picker.js
Component({
  properties: {
    // 是否显示
    show: {
      type: Boolean,
      value: false
    },
    // 选择器标题
    title: {
      type: String,
      value: '请选择'
    },
    // 选项列表
    range: {
      type: Array,
      value: []
    },
    // 显示的字段名
    rangeKey: {
      type: String,
      value: ''
    },
    // 当前选中索引
    value: {
      type: Number,
      value: 0
    }
  },

  data: {
    selectedIndex: 0
  },

  observers: {
    'show': function(show) {
      if (show) {
        // 使用 nextTick 确保 value 已经同步到位
        const idx = this.properties.value
        this.setData({ selectedIndex: idx < 0 ? 0 : idx })
      }
    }
  },

  methods: {
    // 点击遮罩关闭
    onMaskClick() {
      this.triggerEvent('cancel')
    },

    // 点击取消
    onCancel() {
      this.triggerEvent('cancel')
    },

    // 点击确定
    onConfirm() {
      const index = this.data.selectedIndex
      const item = this.properties.range[index]
      this.triggerEvent('confirm', { 
        value: index, 
        item: item 
      })
    },

    // 选择变化
    onChange(e) {
      const index = e.detail.value[0]
      this.setData({ selectedIndex: index })
    }
  }
})
