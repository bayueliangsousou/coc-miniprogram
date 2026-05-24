const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({
  env: 'cloud1-1gp39wlmaa1fc8d5'
});

const db = app.database();

exports.main = async (event, context) => {
  const { campaignId, OPENID } = event;
  
  try {
    const openId = OPENID;
    
    // 验证KP身份
    const campaignRes = await db.collection('campaigns').doc(campaignId).get();
    
    if (!campaignRes.data) {
      return { code: -1, message: '战役不存在' };
    }
    
    if (campaignRes.data.kpOpenId !== openId) {
      return { code: -2, message: '无权查看' };
    }
    
    // 获取所有玩家
    const playersRes = await db.collection('players').where({
      campaignId: campaignId
    }).get();
    
    // 获取用户信息
    const players = await Promise.all(playersRes.data.map(async (player) => {
      const userRes = await db.collection('users').where({
        openId: player.openId
      }).get();
      
      return {
        ...player,
        userInfo: userRes.data[0] || {}
      };
    }));
    
    return {
      code: 0,
      message: '获取成功',
      data: {
        players: players,
        total: players.length
      }
    };
  } catch (error) {
    return { code: -3, message: '获取失败: ' + error.message };
  }
};
