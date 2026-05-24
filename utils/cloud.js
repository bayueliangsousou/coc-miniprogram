/**
 * 云开发工具类 - 适配腾讯云 CloudBase
 * 支持微信小程序和 Web 端
 */

// 腾讯云 CloudBase HTTP API 基础地址（mastermind 环境）
const HTTP_API_BASE = 'https://mastermind-5grqnmdu0d3a7d81-1404084982.ap-shanghai.app.tcloudbase.com';

// 腾讯云环境 ID（统一使用 mastermind 个人版）
const CLOUD_ENV = 'mastermind-5grqnmdu0d3a7d81';

// HTTP 请求封装
function httpRequest(url, method, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${HTTP_API_BASE}${url}`,
      method: method,
      data: data,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error(`HTTP 请求失败: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        console.error(`[HTTP] 请求失败:`, err);
        reject(err);
      }
    });
  });
}

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
  
  console.log('✅ CloudBase 已初始化 - HTTP API:', HTTP_API_BASE);
  return true;
}

// 房间相关云函数列表
const ROOM_CLOUD_FUNCTIONS = ['joinRoom', 'getRoomPlayers', 'createRoom', 'closeRoom', 'pushEvent', 'syncPull'];

// 通过 wx.cloud.callFunction 调用微信云开发云函数
async function callCloudFunction(name, data) {
  // 房间相关云函数使用 wx.cloud.callFunction（已部署到微信云开发 mastermind 环境）
  if (ROOM_CLOUD_FUNCTIONS.includes(name)) {
    try {
      console.log(`[微信云开发] 调用云函数: ${name}`, data);
      const result = await wx.cloud.callFunction({
        name: name,
        data: data,
        config: {
          env: CLOUD_ENV  // mastermind-5grqnmdu0d3a7d81
        }
      });
      console.log(`[微信云开发] 云函数返回:`, result);
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
    // 降级到本地模拟
    return mockCloudFunction(name, data);
  }
}

// 本地模拟（用于开发和测试）
function mockCloudFunction(name, data) {
  console.log(`[模拟] 云函数: ${name}`, data);
  
  switch (name) {
    case 'auth':
      const mockOpenId = 'mock_' + Math.random().toString(36).substr(2, 9);
      return {
        code: 0,
        data: {
          openId: mockOpenId,
          userInfo: data.userInfo,
          isNewUser: true,
          createdAt: new Date().toISOString()
        }
      };
    
    case 'playerJoin':
      return {
        code: 0,
        data: {
          campaignId: 'camp_' + data.inviteCode,
          campaignName: '克苏鲁跑团 #' + data.inviteCode,
          playerId: 'player_' + Date.now(),
          characterData: data.characterData,
          joinedAt: new Date().toISOString()
        }
      };
    
    case 'playerUpdate':
      return {
        code: 0,
        data: {
          updatedAt: new Date().toISOString(),
          version: Date.now()
        }
      };
    
    case 'kpGetPlayers':
      return {
        code: 0,
        data: {
          players: [],
          total: 0
        }
      };
    
    case 'kpUpdatePlayer':
      return {
        code: 0,
        data: {
          updatedAt: new Date().toISOString()
        }
      };
    
    case 'sync':
      return {
        code: 0,
        data: {
          hasUpdate: false,
          serverVersion: data.clientVersion || 1,
          serverTime: new Date().toISOString()
        }
      };
    
    // ── 房间相关云函数 ──
    // 注：joinRoom 已改为真正调用云函数，不再走 mock
    // mock 模式下仅保留用于快速测试的 TEST01 房间号
    
    case 'joinRoom':
      // 模拟加入房间（仅用于快速测试）
      const mockRoomCode = data.roomCode;
      if (mockRoomCode === 'TEST01') {
        return {
          code: 0,
          data: {
            success: true,
            roomId: 'mock_room_id_' + mockRoomCode,
            campaignId: 'mock_campaign_' + mockRoomCode,
            campaignName: '克苏鲁跑团',
            roomCode: mockRoomCode,
            message: '测试房间加入成功！'
          }
        };
      }
      // 非测试房间号，强制走云函数（会抛出错误触发真正的云调用）
      throw new Error('请使用云函数加入房间');
    
    case 'syncPush':
      // 模拟推送状态变更
      const { characterId, type, value } = data;
      console.log(`[同步推送] ${characterId}: ${type} = ${value}`);
      
      // 保存到本地（模拟云端）
      const syncKey = `sync_changes_${characterId}`;
      const changes = wx.getStorageSync(syncKey) || [];
      changes.push({
        id: Date.now().toString(),
        type,
        value,
        timestamp: Date.now(),
        source: 'player-app'
      });
      wx.setStorageSync(syncKey, changes);
      
      return {
        code: 0,
        data: {
          success: true,
          timestamp: Date.now()
        }
      };
    
    case 'syncPull':
      // 模拟拉取状态变更
      const { characterId: pullCharId, lastSyncTime } = data;
      console.log(`[同步拉取] ${pullCharId} from ${lastSyncTime}`);
      
      // 从本地读取变更
      const pullSyncKey = `sync_changes_${pullCharId}`;
      const pullChanges = wx.getStorageSync(pullSyncKey) || [];
      const newChanges = pullChanges.filter(c => c.timestamp > (lastSyncTime || 0));
      
      return {
        code: 0,
        data: {
          changes: newChanges,
          serverTime: Date.now()
        }
      };
    
    case 'getCharacterStatus':
      // 获取角色状态
      const charId = data.characterId;
      const charKey = `char_status_${charId}`;
      const status = wx.getStorageSync(charKey) || {
        hp: null,
        san: null,
        mp: null,
        status: []
      };
      return {
        code: 0,
        data: status
      };
    
    default:
      return { code: 0, data: {} };
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
  // 邀请码模式已移除，不再需要清除这些数据
  // wx.removeStorageSync('campaign_info');
  // wx.removeStorageSync('player_info');
}

async function joinCampaign(inviteCode, characterData) {
  try {
    const result = await callCloudFunction('playerJoin', {
      type: 'joinCampaign',
      inviteCode,
      characterData
    });
    if (result.code === 0) {
      wx.setStorageSync('campaign_info', {
        id: result.data.campaignId,
        name: result.data.campaignName
      });
      wx.setStorageSync('player_info', {
        id: result.data.playerId,
        characterData: result.data.characterData
      });
      return { success: true, data: result.data };
    }
    return { success: false, error: result.message };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function updateCharacter(playerId, characterData) {
  try {
    const result = await callCloudFunction('playerUpdate', {
      playerId,
      characterData
    });
    if (result.code === 0) {
      const playerInfo = wx.getStorageSync('player_info') || {};
      playerInfo.characterData = characterData;
      wx.setStorageSync('player_info', playerInfo);
      return { success: true, data: result.data };
    }
    return { success: false, error: result.message };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function syncPull(playerId, lastSyncTime, clientVersion) {
  try {
    const result = await callCloudFunction('sync', {
      type: 'pull',
      playerId,
      lastSyncTime,
      clientVersion
    });
    if (result.code === 0) return { success: true, data: result.data };
    return { success: false, error: result.message };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function syncPush(playerId, characterData, clientVersion) {
  try {
    const result = await callCloudFunction('sync', {
      type: 'push',
      playerId,
      characterData,
      clientVersion
    });
    if (result.code === 0) return { success: true, data: result.data };
    return { success: false, error: result.message };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── 同步事件推送 (V1 双端同步) ──────────────────────────────────────

/**
 * 推送同步事件
 * @param {Object} params - { roomId, roomCode, characterId, source, type, payload }
 * @returns {Promise<{success: boolean, eventId?: string, error?: string}>}
 */
async function syncPushEvent(params) {
  try {
    console.log('[同步] 推送事件:', params.type);
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
  joinCampaign,
  updateCharacter,
  syncPull,
  syncPush,
  syncPushEvent,
  syncPullEvents,
  callCloudFunction,
  CLOUD_ENV,
  HTTP_API_BASE
};
