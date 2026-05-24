const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({
  env: 'cloud1-1gp39wlmaa1fc8d5'
});

const db = app.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { type, inviteCode, characterData, OPENID } = event;
  
  try {
    const openId = OPENID;
    
    // 查询战役
    const campaignRes = await db.collection('campaigns').where({
      inviteCode: inviteCode.toUpperCase(),
      status: 'active'
    }).get();
    
    if (campaignRes.data.length === 0) {
      return { code: -1, message: '邀请码无效或战役已结束' };
    }
    
    const campaign = campaignRes.data[0];
    
    // 检查是否已加入
    const existingPlayer = await db.collection('players').where({
      campaignId: campaign._id,
      openId: openId
    }).get();
    
    if (existingPlayer.data.length > 0) {
      return { code: -2, message: '您已加入该战役' };
    }
    
    // 创建玩家记录
    const playerData = {
      campaignId: campaign._id,
      openId: openId,
      characterData: characterData || {},
      status: 'active',
      joinedAt: new Date(),
      lastSyncAt: new Date(),
      version: 1
    };
    
    const playerRes = await db.collection('players').add(playerData);
    
    // 更新战役玩家数
    await db.collection('campaigns').doc(campaign._id).update({
      playerCount: _.inc(1)
    });
    
    return {
      code: 0,
      message: '加入成功',
      data: {
        campaignId: campaign._id,
        campaignName: campaign.name,
        playerId: playerRes.id,
        characterData: playerData.characterData
      }
    };
  } catch (error) {
    return { code: -3, message: '加入失败: ' + error.message };
  }
};
