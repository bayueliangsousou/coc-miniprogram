/**
 * syncPull - 按版本号拉取事件流
 * 
 * 用于客户端首次连接或断线重连时补齐遗漏的事件。
 * 
 * @param {string} roomId - 房间ID
 * @param {number} [sinceVersion=0] - 从此版本之后开始拉取（不包含该版本）
 * @param {number} [limit=100] - 最大返回条数
 * @param {string} [type] - 可选，过滤特定事件类型
 */

const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({
  env: process.env.TCB_ENV || 'mastermind-5grqnmdu0d3a7d81'
});

const db = app.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { roomId, sinceVersion = 0, limit = 100, type } = event;

  console.log('[syncPull] 收到请求:', JSON.stringify({ roomId, sinceVersion, limit, type }));

  if (!roomId) {
    return { code: -1, message: '缺少 roomId' };
  }

  try {
    // 构建查询条件
    let whereCondition = {
      'data.roomId': roomId,
      'data.version': _.gt(sinceVersion)
    };

    // 按类型过滤
    if (type) {
      whereCondition['data.type'] = type;
    }

    const res = await db.collection('events')
      .where(whereCondition)
      .orderBy('data.version', 'asc')
      .limit(Math.min(limit, 200))
      .get();

    // 提取 data 字段
    const events = (res.data || []).map(doc => doc.data || doc);

    // 获取最新版本号
    let latestVersion = sinceVersion;
    if (events.length > 0) {
      latestVersion = events[events.length - 1].version;
    }

    console.log(`[syncPull] 返回 ${events.length} 条事件, 最新版本=${latestVersion}`);

    return {
      code: 0,
      message: 'OK',
      data: {
        events,
        total: events.length,
        latestVersion,
        hasMore: events.length >= Math.min(limit, 200)
      }
    };

  } catch (error) {
    console.error('[syncPull] 执行失败:', error);
    return {
      code: -99,
      message: '执行失败: ' + error.message
    };
  }
};
