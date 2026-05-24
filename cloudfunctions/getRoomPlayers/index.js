const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({
  env: process.env.TCB_ENV
});

const db = app.database();

exports.main = async (event, context) => {
  const { roomId, roomCode } = event;

  try {
    // 查找房间
    let roomRes;
    if (roomId) {
      roomRes = await db.collection('rooms').doc(roomId).get();
    } else if (roomCode) {
      roomRes = await db.collection('rooms')
        .where({
          'data.roomCode': roomCode.toUpperCase(),
          'data.status': 'active'
        })
        .limit(1)
        .get();
    } else {
      return { code: -1, message: '缺少房间标识' };
    }

    if (!roomRes.data || (Array.isArray(roomRes.data) && roomRes.data.length === 0)) {
      return { code: -1, message: '房间不存在' };
    }

    // 统一房间数据
    const room = Array.isArray(roomRes.data) ? roomRes.data[0] : roomRes.data;
    const roomData = room.data || room;
    const finalRoomId = roomData._id || room._id;

    // 获取玩家列表（数据在 data 字段里）
    const playersRes = await db.collection('room_players')
      .where({ 'data.roomId': finalRoomId })
      .orderBy('data.joinedAt', 'asc')
      .get();

    // 提取玩家数据（从 data 字段）
    const players = (playersRes.data || []).map(p => ({
      id: p._id,
      ...(p.data || p)
    }));

    return {
      code: 0,
      message: '获取成功',
      data: {
        room: roomData,
        players: players
      }
    };
  } catch (error) {
    return {
      code: -99,
      message: '获取房间玩家失败: ' + error.message
    };
  }
};
