const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({
  env: process.env.TCB_ENV
});

const db = app.database();

exports.main = async (event, context) => {
  const { roomId } = event;

  try {
    // 安全获取 OPENID（从服务端上下文，不可伪造）
    const { openId } = app.auth().getUserInfo();
    if (!openId) {
      return { code: -99, message: '未登录或无法获取用户身份' };
    }

    // 查找房间
    const roomRes = await db.collection('rooms').doc(roomId).get();

    if (!roomRes.data) {
      return {
        code: -1,
        message: '房间不存在'
      };
    }

    // 验证是房间创建者才能关闭（creatorOpenId 字段）
    // 兼容：如果房间没有 creatorOpenId，允许任意已登录用户关闭（向后兼容旧房间）
    const roomData = roomRes.data.data || roomRes.data;
    if (roomData.creatorOpenId && roomData.creatorOpenId !== openId) {
      return { code: -2, message: '只有房间创建者才能关闭房间' };
    }

    // 关闭房间
    await db.collection('rooms').doc(roomId).update({
      status: 'closed',
      closedAt: new Date(),
      updatedAt: new Date()
    });

    return {
      code: 0,
      message: '房间已关闭',
      data: {
        roomId
      }
    };
  } catch (error) {
    return {
      code: -99,
      message: '关闭房间失败: ' + error.message
    };
  }
};
