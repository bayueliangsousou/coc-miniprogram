/**
 * 云开发工具类 - 微信小程序
 * 统一使用 mastermind 环境
 */

// 腾讯云环境 ID（统一使用 mastermind 个人版）
const CLOUD_ENV = 'mastermind-5grqnmdu0d3a7d81';

function initCloud() {
  // 初始化微信云开发（非房间功能）
  if (!wx.cloud) {
    console.warn('⚠️ wx.cloud 不可用，非房间功能可能受影响');
  } else {
    wx.cloud.init({
      env: CLOUD_ENV,
      traceUser: true
    });
  }
  
  return true;
}

// 房间相关云函数列表
const ROOM_CLOUD_FUNCTIONS = ['joinRoom', 'getRoomPlayers', 'createRoom', 'closeRoom', 'pushEvent', 'syncPull'];

// 通过 wx.cloud.callFunction 调用微信云开发云函数
async function callCloudFunction(name, data) {
  // 房间相关云函数使用 wx.cloud.callFunction（已部署到微信云开发 mastermind 环境）
  if (ROOM_CLOUD_FUNCTIONS.includes(name)) {
    try {
      const result = await wx.cloud.callFunction({
        name: name,
        data: data,
        config: {
          env: CLOUD_ENV  // mastermind-5grqnmdu0d3a7d81
        }
      });
      return result.result;
    } catch (err) {
      console.error(`❌ 微信云开发云函数 ${name} 调用失败:`, err);
      return { code: -99, message: err.message };
    }
  }
  
  // 其他云函数使用微信云开发 SDK
  try {
    const result = await wx.cloud.callFunction({
      name: name,
      data: data
    });
    return result.result;
  } catch (err) {
    console.error(`❌ 云函数 ${name} 调用失败:`, err);
    return { code: -99, message: err.message };
  }
}

async function login(userInfo) {
  try {
    const result = await callCloudFunction('auth', { userInfo });
    if (result.code === 0) {
      wx.setStorageSync('cloud_user', result.data);
      return { success: true, data: result.data };
    }
    return { success: false, error: result.message };
  } catch (err) {
    console.error('❌ 登录失败:', err);
    return { success: false, error: err.message };
  }
}

function checkLogin() {
  const user = wx.getStorageSync('cloud_user');
  return user && user.openId;
}

function getCurrentUser() {
  return wx.getStorageSync('cloud_user');
}

function logout() {
  wx.removeStorageSync('cloud_user');
}

// ─── 同步事件推送 ──────────────────────────────────────

/**
 * 推送同步事件
 * @param {Object} params - { roomId, roomCode, characterId, source, type, payload }
 * @returns {Promise<{success: boolean, eventId?: string, error?: string}>}
 */
async function syncPushEvent(params) {
  try {
    const result = await callCloudFunction('pushEvent', {
      roomId: params.roomId,
      roomCode: params.roomCode || '',
      characterId: params.characterId || '',
      source: params.source || 'player-app',
      type: params.type,
      payload: params.payload || {},
    });
    if (result.code === 0) {
      return { success: true, eventId: result.data?.eventId };
    }
    return { success: false, error: result.message };
  } catch (err) {
    console.error('❌ 同步事件推送失败:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 拉取事件流（断线重连补齐用）
 */
async function syncPullEvents(roomId, sinceVersion, limit) {
  try {
    const result = await callCloudFunction('syncPull', {
      roomId: roomId || '',
      sinceVersion: sinceVersion || 0,
      limit: limit || 100,
    });
    if (result.code === 0) {
      return { 
        success: true, 
        events: result.data?.events || [], 
        latestVersion: result.data?.latestVersion 
      };
    }
    return { success: false, error: result.message };
  } catch (err) {
    console.error('❌ 拉取事件流失败:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  initCloud,
  login,
  checkLogin,
  getCurrentUser,
  logout,
  syncPushEvent,
  syncPullEvents,
  callCloudFunction,
  CLOUD_ENV,
};
