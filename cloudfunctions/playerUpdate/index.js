const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({
  env: 'cloud1-1gp39wlmaa1fc8d5'
});

const db = app.database();

exports.main = async (event, context) => {
  const { playerId, characterData, OPENID } = event;
  
  try {
    const openId = OPENID;
    
    // 验证玩家身份
    const playerRes = await db.collection('players').doc(playerId).get();
    
    if (!playerRes.data) {
      return { code: -1, message: '玩家不存在' };
    }
    
    if (playerRes.data.openId !== openId) {
      return { code: -2, message: '无权修改' };
    }
    
    // 更新角色数据
    const now = new Date();
    await db.collection('players').doc(playerId).update({
      characterData: characterData,
      lastSyncAt: now,
      version: _.inc(1)
    });
    
    return {
      code: 0,
      message: '更新成功',
      data: {
        updatedAt: now,
        version: (playerRes.data.version || 0) + 1
      }
    };
  } catch (error) {
    return { code: -3, message: '更新失败: ' + error.message };
  }
};
