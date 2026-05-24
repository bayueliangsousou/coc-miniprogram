const cloud = require('../../utils/cloud');
const CLOUD_ENV = 'mastermind-5grqnmdu0d3a7d81';

Page({
  data: {
    isLoading: false,
    isLoggedIn: false,
    userInfo: null
  },

  onLoad() {
    cloud.initCloud();
    this.checkStatus();
  },

  onShow() {
    // 如果已登录，自动跳转（避免返回时卡在登录页）
    if (cloud.checkLogin()) {
      wx.switchTab({ url: '/pages/index/index' });
      return;
    }
    this.checkStatus();
  },

  checkStatus() {
    const isLoggedIn = cloud.checkLogin();
    const userInfo = cloud.getCurrentUser();
    this.setData({ isLoggedIn, userInfo: userInfo?.userInfo || null });
  },

  async onGetUserProfile() {
    this.setData({ isLoading: true });
    console.log('[login] 开始登录流程...');

    try {
      wx.cloud.init({ env: CLOUD_ENV });
      console.log('[login] wx.cloud.init 完成, env:', CLOUD_ENV);

      console.log('[login] 准备调用 auth 云函数...');
      const startTime = Date.now();

      const res = await wx.cloud.callFunction({
        name: 'auth',
        data: {},
        config: { env: CLOUD_ENV }
      });

      console.log('[login] auth 返回, 耗时:', Date.now() - startTime, 'ms', JSON.stringify(res));
      const { result } = res;

      if (result.code === 0) {
        console.log('[login] 登录成功');
        wx.setStorageSync('cloud_user', result.data);
        this.setData({ isLoading: false });
        wx.reLaunch({ url: '/pages/index/index' });
      } else {
        this.setData({ isLoading: false });
        wx.showToast({ title: result.message || '登录失败', icon: 'none' });
      }
    } catch (err) {
      console.error('[login] 登录异常:', err);
      this.setData({ isLoading: false });
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
    }
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后清除登录状态',
      success: (res) => {
        if (res.confirm) {
          cloud.logout();
          this.setData({ isLoggedIn: false, userInfo: null });
        }
      }
    });
  }
});
