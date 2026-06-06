const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({
  env: process.env.TCB_ENV // 使用云环境变量
});

const db = app.database();

exports.main = async (event, context) => {
  const { campaignId, campaignName, creatorName, maxPlayers = 6 } = event;

  try {
    // 生成唯一的4位房间号（最多重试5次）
    let roomCode;
    let existing;
    for (let i = 0; i < 5; i++) {
      roomCode = Math.floor(1000 + Math.random() * 9000).toString();
      existing = await db.collection('rooms')
        .where({ roomCode, status: 'active' })
        .count();
      if (existing.total === 0) break;
    }

    if (existing.total > 0) {
      return { code: -1, message: '房间号生成失败，请重试' };
    }

    const now = new Date();
    const room = {
      roomCode,
      campaignId,
      campaignName,
      creatorName: creatorName || 'KP',
      status: 'active',
      playerCount: 0,
      maxPlayers,
      createdAt: now,
      updatedAt: now
    };

    const res = await db.collection('rooms').add({
      data: room
    });

    return {
      code: 0,
      message: '房间创建成功',
      data: {
        id: res.id,
        ...room
      }
    };
  } catch (error) {
    return {
      code: -1,
      message: '创建房间失败: ' + error.message
    };
  }
};
