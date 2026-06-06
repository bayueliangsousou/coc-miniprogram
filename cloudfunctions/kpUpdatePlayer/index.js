const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({
  env: process.env.TCB_ENV
});

const db = app.database();
const _ = db.command;

exports.main = async (event, context) => {
  // 安全获取 OPENID（从服务端上下文，不可伪造）
  const { openId } = app.auth().getUserInfo();
  if (!openId) {
    return { code: -99, message: '未登录或无法获取用户身份' };
  }

  const { playerId, characterData } = event;

  try {
    // 获取玩家信息
    const playerRes = await db.collection('players').doc(playerId).get();

    if (!playerRes.data) {
      return { code: -1, message: '玩家不存在' };
    }

    // 验证KP身份
    const campaignRes = await db.collection('campaigns').doc(playerRes.data.campaignId).get();

    if (!campaignRes.data || campaignRes.data.kpOpenId !== openId) {
      return { code: -2, message: '无权修改' };
    }

    // 更新角色数据
    const now = new Date();
    await db.collection('players').doc(playerId).update({
      characterData: characterData,
      lastSyncAt: now,
      kpModifiedAt: now,
      version: _.inc(1)
    });

    return {
      code: 0,
      message: '修改成功',
      data: {
        updatedAt: now,
        version: (playerRes.data.version || 0) + 1
      }
    };
  } catch (error) {
    return { code: -3, message: '修改失败: ' + error.message };
  }
};