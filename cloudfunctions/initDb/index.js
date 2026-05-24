const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({
  env: 'cloud1-1gp39wlmaa1fc8d5'
});

const db = app.database();

exports.main = async (event, context) => {
  try {
    // 创建集合
    const collections = ['users', 'campaigns', 'players', 'sync_logs', 'rooms', 'room_players', 'events'];

    const results = [];

    for (const name of collections) {
      try {
        await db.createCollection(name);
        results.push({ name, status: 'success' });
      } catch (err) {
        if (err.message.includes('already exists')) {
          results.push({ name, status: 'exists' });
        } else {
          results.push({ name, status: 'failed', error: err.message });
        }
      }
    }

    return {
      code: 0,
      message: '数据库初始化完成',
      data: results
    };
  } catch (error) {
    return {
      code: -1,
      message: '初始化失败: ' + error.message
    };
  }
};
