// 微信小程序兼容的 perf_hooks polyfill
module.exports = {
  performance: {
    now: function() {
      return Date.now();
    }
  }
};
