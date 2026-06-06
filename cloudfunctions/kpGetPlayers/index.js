const tcb = require('@cloudbase/node-sdk');
const db = tcb.init({ env: process.env.TCB_ENV }).database();
const _ = db.command;

exports.main = async (event, context) => {
  const openId = tcb.serverApp().auth().getUserInfo().openId;
  if (!openId) return { code: -99, message: '未登录或无法获取用户身份' };

  const { campaignId } = event;
  try {
    const campaignRes = await db.collection('campaigns').doc(campaignId).get();
    if (!campaignRes.data) return { code: -1, message: '战役不存在' };
    if (campaignRes.data.kpOpenId !== openId) return { code: -2, message: '无权查看' };

    const playersRes = await db.collection('players').where({ campaignId }).get();

    // 批量查询用户信息，避免 N+1
    const openIds = playersRes.data.map(p => p.openId).filter(Boolean);
    const userRes = openIds.length
      ? await db.collection('users').where({ openId: _.in(openIds) }).get()
      : { data: [] };
    const userMap = {};
    userRes.data.forEach(u => { userMap[u.openId] = u });

    const players = playersRes.data.map(player => ({
      ...player,
      userInfo: userMap[player.openId] || {}
    }));

    return { code: 0, message: '获取成功', data: { players, total: players.length } };
  } catch (error) {
    return { code: -3, message: '获取失败: ' + error.message };
  }
};
