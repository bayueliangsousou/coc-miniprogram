/**
 * pushEvent - 统一事件写入接口
 * 
 * 用于双端数据同步，将变更事件写入 events 集合，
 * 同时更新 room_players 中的 characterData，触发对端 watch。
 * 
 * @param {string} roomId - 房间ID
 * @param {string} roomCode - 房间码
 * @param {string} [characterId] - 角色ID（可选，房间级事件不需要）
 * @param {string} source - 来源: "player-app" | "desktop"
 * @param {string} type - 事件类型 (见下方枚举)
 * @param {object} [payload] - 事件负载数据
 */

const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({
  env: process.env.TCB_ENV || 'mastermind-5grqnmdu0d3a7d81'
});

const db = app.database();
const _ = db.command;

// 支持的事件类型白名单
const ALLOWED_TYPES = [
  // === 房间生命周期 ===
  'player_join', 'player_leave', 'room_close', 'player_heartbeat',
  // === 状态标签 ===
  'status_add', 'status_remove', 'status_replace',
  // === 属性变化 ===
  'hp_change', 'san_change', 'mp_change',
  // === 武器 ===
  'weapon_add', 'weapon_remove', 'weapon_update',
  // === 背景 ===
  'background_update',
];

exports.main = async (event, context) => {
  const { roomId, roomCode, characterId, source, type, payload } = event;

  console.log('[pushEvent] 收到请求:', JSON.stringify({ roomId, roomCode, characterId, source, type }));

  // 参数校验
  if (!roomId) {
    return { code: -1, message: '缺少 roomId' };
  }
  if (!type) {
    return { code: -2, message: '缺少 type' };
  }
  if (!ALLOWED_TYPES.includes(type)) {
    return { code: -3, message: `不支持的事件类型: ${type}` };
  }
  if (!source || !['player-app', 'desktop'].includes(source)) {
    return { code: -4, message: 'source 必须是 player-app 或 desktop' };
  }

  try {
    const now = Date.now();

    // ① 获取当前最大版本号
    const lastRes = await db.collection('events')
      .where({ 'data.roomId': roomId })
      .orderBy('data.version', 'desc')
      .limit(1)
      .get();

    const nextVersion = lastRes.data.length > 0 
      ? (lastRes.data[0].data?.version || 0) + 1 
      : 1;

    // ② 构造 eventId
    const eventId = `evt_${now}_${Math.random().toString(36).substr(2, 6)}`;

    // ③ 写入 events 集合
    const evtData = {
      eventId,
      roomId,
      roomCode: roomCode || '',
      characterId: characterId || null,
      source,
      type,
      payload: payload || {},
      timestamp: now,
      version: nextVersion,
    };

    await db.collection('events').add({ data: evtData });

    console.log(`[pushEvent] 事件已写入: ${eventId}, version=${nextVersion}`);

    // ④ 同步更新 room_players 中的 characterData（让 watch 直接拿到最新完整数据）
    if (characterId && type !== 'player_join' && type !== 'player_leave') {
      const updateFields = {};

      switch (type) {
        case 'status_add':
        case 'status_remove':
        case 'status_replace':
          // 状态变更：payload 中应包含完整的 status 数组
          if (payload && Array.isArray(payload.statuses)) {
            updateFields['characterData.status'] = payload.statuses;
          }
          break;

        case 'hp_change':
          if (payload) {
            updateFields['characterData.hp'] = { value: payload.value, max: payload.max };
          }
          break;

        case 'san_change':
          if (payload) {
            updateFields['characterData.san'] = { value: payload.value, max: payload.max };
          }
          break;

        case 'mp_change':
          if (payload) {
            updateFields['characterData.mp'] = { value: payload.value, max: payload.max };
          }
          break;

        case 'weapon_add':
        case 'weapon_remove':
        case 'weapon_update':
          // 武器变更：payload 中包含完整 weapons 数组
          if (payload && Array.isArray(payload.weapons)) {
            updateFields['characterData.weapons'] = payload.weapons;
          }
          break;

        case 'background_update':
          // 背景信息变更
          if (payload && payload.background) {
            updateFields['characterData.background'] = payload.background;
          }
          break;

        case 'player_heartbeat':
          updateFields['data.updatedAt'] = now;
          break;
      }

      if (Object.keys(updateFields).length > 0) {
        await db.collection('room_players')
          .where({
            'data.roomId': roomId,
            'data.characterId': characterId
          })
          .update({ data: updateFields });
        
        console.log(`[pushEvent] room_players 已同步更新:`, Object.keys(updateFields));
      }
    }

    // ⑤ 如果是关闭房间，同时更新 rooms 集合状态
    if (type === 'room_close') {
      await db.collection('rooms').doc(roomId).update({
        data: {
          status: 'closed',
          updatedAt: new Date()
        }
      });
    }

    return {
      code: 0,
      message: 'OK',
      data: {
        eventId,
        version: nextVersion,
        timestamp: now
      }
    };

  } catch (error) {
    console.error('[pushEvent] 执行失败:', error);
    return {
      code: -99,
      message: '执行失败: ' + error.message
    };
  }
};
