const cloud = require('wx-server-sdk');

cloud.init({
  env: 'mastermind-5grqnmdu0d3a7d81'
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { userInfo } = event;
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  if (!openId) {
    return { code: -1, message: '获取用户身份失败' };
  }

  try {
    const userRes = await db.collection('users').where({ openId }).get();
    const now = new Date();

    if (userRes.data.length === 0) {
      const userData = {
        openId,
        unionId: wxContext.UNIONID || '',
        nickName: userInfo?.nickName || '',
        avatarUrl: userInfo?.avatarUrl || '',
        role: 'player',
        createdAt: now,
        lastLoginAt: now
      };
      await db.collection('users').add({ data: userData });

      return {
        code: 0,
        message: '登录成功',
        data: { openId, isNewUser: true, userInfo: userData }
      };
    } else {
      const user = userRes.data[0];
      await db.collection('users').doc(user._id).update({
        data: {
          lastLoginAt: now,
          nickName: userInfo?.nickName || user.nickName,
          avatarUrl: userInfo?.avatarUrl || user.avatarUrl
        }
      });

      return {
        code: 0,
        message: '登录成功',
        data: {
          openId,
          isNewUser: false,
          userInfo: { ...user, lastLoginAt: now }
        }
      };
    }
  } catch (error) {
    return { code: -2, message: '登录失败: ' + error.message };
  }
};
