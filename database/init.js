/**
 * 数据库初始化脚本
 * 在 CloudBase 控制台运行
 */

const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({
  env: 'cloud1-1gp39wlmaa1fc8d5'
});

const db = app.database();

async function initDatabase() {
  try {
    // 创建集合
    const collections = ['users', 'campaigns', 'players', 'sync_logs'];
    
    for (const name of collections) {
      try {
        await db.createCollection(name);
        console.log(`✅ 集合 ${name} 创建成功`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`⚠️ 集合 ${name} 已存在`);
        } else {
          console.error(`❌ 集合 ${name} 创建失败:`, err.message);
        }
      }
    }

    // 创建索引
    console.log('\n📇 创建索引...');
    
    // users 集合索引
    try {
      await db.collection('users').createIndex({
        openId: 1
      }, { unique: true });
      console.log('✅ users.openId 索引创建成功');
    } catch (e) {
      console.log('⚠️ users.openId 索引已存在');
    }

    // campaigns 集合索引
    try {
      await db.collection('campaigns').createIndex({
        inviteCode: 1
      }, { unique: true });
      console.log('✅ campaigns.inviteCode 索引创建成功');
    } catch (e) {
      console.log('⚠️ campaigns.inviteCode 索引已存在');
    }

    try {
      await db.collection('campaigns').createIndex({
        kpOpenId: 1
      });
      console.log('✅ campaigns.kpOpenId 索引创建成功');
    } catch (e) {
      console.log('⚠️ campaigns.kpOpenId 索引已存在');
    }

    // players 集合索引
    try {
      await db.collection('players').createIndex({
        campaignId: 1,
        openId: 1
      }, { unique: true });
      console.log('✅ players.campaignId_openId 索引创建成功');
    } catch (e) {
      console.log('⚠️ players.campaignId_openId 索引已存在');
    }

    // sync_logs 集合索引
    try {
      await db.collection('sync_logs').createIndex({
        playerId: 1,
        timestamp: -1
      });
      console.log('✅ sync_logs.playerId_timestamp 索引创建成功');
    } catch (e) {
      console.log('⚠️ sync_logs.playerId_timestamp 索引已存在');
    }

    console.log('\n✨ 数据库初始化完成！');

  } catch (error) {
    console.error('❌ 初始化失败:', error);
  }
}

// 运行初始化
initDatabase();
