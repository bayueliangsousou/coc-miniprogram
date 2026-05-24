const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({
  env: process.env.TCB_ENV
});

const db = app.database();

exports.main = async (event, context) => {
  const { roomId, OPENID } = event;

  try {
    // 查找房间
    const roomRes = await db.collection('rooms').doc(roomId).get();

    if (!roomRes.data) {
      return {
        code: -1,
        message: '房间不存在'
      };
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
