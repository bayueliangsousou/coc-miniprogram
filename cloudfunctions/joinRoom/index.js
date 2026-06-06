const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({
  env: process.env.TCB_ENV
});

const db = app.database();
const _ = db.command;

exports.main = async (event, context) => {
  // 安全获取 OPENID（从服务端上下文，不可伪造）
  const { openId } = app.auth().getUserInfo();

  const { roomCode, roomId, characterData } = event;

  try {
    // 查找房间：优先用 roomId，否则用 roomCode
    let roomRes;
    if (roomId) {
      roomRes = await db.collection('rooms').doc(roomId).get();
      if (!roomRes.data) {
        return { code: -1, message: '房间不存在或已关闭' };
      }
      roomRes.data = { ...roomRes.data, ...roomRes.data?.data, _id: roomRes.data._id };
    } else if (roomCode) {
      // 通过 roomCode 查询（数据在 data 字段里）
      const upperCode = roomCode.toUpperCase();
      roomRes = await db.collection('rooms')
        .where({
          'data.roomCode': upperCode,
          'data.status': 'active'
        })
        .limit(1)
        .get();
    } else {
      return { code: -1, message: '缺少房间标识' };
    }

    if (!roomRes.data || (Array.isArray(roomRes.data) && roomRes.data.length === 0)) {
      return { code: -1, message: '房间不存在或已关闭' };
    }

    // 统一处理房间数据
    let room;
    if (Array.isArray(roomRes.data)) {
      room = roomRes.data[0];
    } else {
      room = roomRes.data;
    }
    
    // 处理数据格式（可能有 data 字段嵌套）
    const roomData = room.data || room;

    // 统一 roomId
    const finalRoomId = roomData._id || room._id;
    
    // 检查房间是否已满
    if ((roomData.playerCount ?? room.playerCount ?? 0) >= (roomData.maxPlayers ?? room.maxPlayers ?? 6)) {
      return {
        code: -2,
        message: '房间已满'
      };
    }

    // 检查玩家是否已在房间中
    const existingPlayer = await db.collection('room_players')
      .where({
        roomId: finalRoomId,
        characterId: characterData.id
      })
      .count();

    if (existingPlayer.total > 0) {
      // 玩家已在房间中，更新信息
      await db.collection('room_players')
        .where({
          roomId: finalRoomId,
          characterId: characterData.id
        })
        .update({
          updatedAt: new Date()
        });

      return {
        code: 0,
        message: '已在房间中',
        data: {
          success: true,
          isRejoin: true,
          roomId: finalRoomId,
          campaignId: roomData.campaignId || room.campaignId,
          campaignName: roomData.campaignName || room.campaignName,
          roomCode: roomData.roomCode || room.roomCode
        }
      };
    }

    // 添加玩家到房间（存储完整角色数据用于导入）
    const now = new Date();
    const playerData = {
      roomId: finalRoomId,
      roomCode: roomData.roomCode || room.roomCode,
      characterId: characterData.id,
      characterName: characterData.name,
      occupation: characterData.occupation || '',
      openId: openId || '',
      // 存储完整角色数据用于导入到桌面端
      characterData: characterData,
      joinedAt: now,
      updatedAt: now
    };
    
    await db.collection('room_players').add({
      data: playerData
    });

    // 更新房间玩家数量
    await db.collection('rooms').doc(finalRoomId).update({
      playerCount: _.inc(1),
      updatedAt: now
    });

    return {
      code: 0,
      message: '加入成功',
      data: {
        success: true,
        isRejoin: false,
        roomId: finalRoomId,
        campaignId: roomData.campaignId || room.campaignId,
        campaignName: roomData.campaignName || room.campaignName,
        roomCode: roomData.roomCode || room.roomCode
      }
    };
  } catch (error) {
    return {
      code: -99,
      message: '加入房间失败: ' + error.message
    };
  }
};
