// utils/nav.js
// 统一封装 setTimeout + navigateBack 模式

/**
 * 保存成功后延迟返回上一页
 * @param {Object} opts
 * @param {string} opts.title - toast 文案
 * @param {number} opts.delay - 延迟毫秒数，默认 600
 * @param {string} opts.icon - toast 图标，默认 'success'
 * @param {number} opts.delta - 返回的页面数，默认 1
 */
function saveThenBack(opts = {}) {
  const { title, delay = 600, icon = 'success', delta = 1 } = opts
  if (title) wx.showToast({ title, icon })
  setTimeout(() => { wx.navigateBack({ delta }) }, delay)
}

module.exports = { saveThenBack }
