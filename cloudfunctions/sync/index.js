const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({
  env: 'cloud1-1gp39wlmaa1fc8d5'
});

const db = app.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { type, playerId, characterData, lastSyncTime, clientVersion, OPENID } = event;

  try {
    const openId = OPENID;

    if (type === 'pull') {
      // 拉取服务器数据
      const playerRes = await db.collection('players').doc(playerId).get();

      if (!playerRes.data) {
        return { code: -1, message: '玩家不存在' };
      }

      const serverData = playerRes.data;
      const serverTime = new Date();

      // 检查是否有更新
      const hasUpdate = !lastSyncTime ||
        new Date(serverData.lastSyncAt) > new Date(lastSyncTime);

      return {
        code: 0,
        message: '拉取成功',
        data: {
          hasUpdate: hasUpdate,
          characterData: hasUpdate ? serverData.characterData : null,
          serverVersion: serverData.version || 1,
          serverTime: serverTime,
          lastModifiedAt: serverData.lastSyncAt,
          kpModifiedAt: serverData.kpModifiedAt || null
        }
      };

    } else if (type === 'push') {
      // 推送本地数据到服务器
      const playerRes = await db.collection('players').doc(playerId).get();

      if (!playerRes.data) {
        return { code: -1, message: '玩家不存在' };
      }

      // 简单的乐观锁：检查版本
      const serverVersion = playerRes.data.version || 1;
      if (clientVersion < serverVersion) {
        return {
          code: -2,
          message: '版本冲突，请先拉取最新数据',
          data: {
            conflict: true,
            serverVersion: serverVersion,
            serverData: playerRes.data.characterData
          }
        };
      }

      // 更新数据
      const now = new Date();
      await db.collection('players').doc(playerId).update({
        characterData: characterData,
        lastSyncAt: now,
        version: serverVersion + 1
      });

      // 记录同步日志
      await db.collection('sync_logs').add({
        playerId: playerId,
        type: 'push',
        clientVersion: clientVersion,
        serverVersion: serverVersion + 1,
        timestamp: now
      });

      return {
        code: 0,
        message: '同步成功',
        data: {
          serverVersion: serverVersion + 1,
          serverTime: now
        }
      };

    } else {
      return { code: -3, message: '未知的同步类型' };
    }

  } catch (error) {
    return { code: -4, message: '同步失败: ' + error.message };
  }
};