// characterSync 云函数 — 角色卡云端同步
// action: save | load | delete
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const MAX_CHARS = 5

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID
  const { action } = event

  if (!openId) {
    return { code: -1, message: '无法获取用户身份' }
  }

  try {
    switch (action) {
      case 'save':
        return await saveCharacter(openId, event)
      case 'load':
        return await loadCharacters(openId)
      case 'delete':
        return await deleteCharacter(openId, event)
      default:
        return { code: -2, message: '未知操作: ' + action }
    }
  } catch (err) {
    console.error('characterSync error:', err)
    return { code: -3, message: err.message }
  }
}

// 保存角色卡（upsert）
async function saveCharacter(openId, event) {
  const { character } = event
  if (!character || !character.id) {
    return { code: -4, message: '角色卡数据无效' }
  }

  // 深度清理 undefined（云数据库 update 会丢失 undefined 字段）
  function deepClean(obj) {
    if (obj === null || typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.map(item => deepClean(item))
    const cleaned = {}
    for (const key of Object.keys(obj)) {
      const val = obj[key]
      if (val === undefined) continue
      cleaned[key] = deepClean(val)
    }
    return cleaned
  }
  character = deepClean(character)

  // 检查数量上限
  const countResult = await db.collection('characters')
    .where({ openId })
    .count()
  if (countResult.total >= MAX_CHARS) {
    // 检查是否是更新已有角色
    const existResult = await db.collection('characters')
      .where({ openId, 'character.id': character.id })
      .count()
    if (existResult.total === 0) {
      return { code: -5, message: '已达到最大角色卡数量(5)' }
    }
  }

  const now = new Date().toISOString()
  const data = {
    openId,
    character,
    updateTime: now,
    createTime: now
  }

  // upsert: 先查是否存在
  const exist = await db.collection('characters')
    .where({ openId, 'character.id': character.id })
    .get()

  if (exist.data.length > 0) {
    // 更新
    await db.collection('characters')
      .doc(exist.data[0]._id)
      .update({
        data: {
          character,
          updateTime: now
        }
      })
  } else {
    // 新增
    await db.collection('characters').add({ data })
  }

  return { code: 0, message: '保存成功' }
}

// 拉取用户所有角色卡
async function loadCharacters(openId) {
  const result = await db.collection('characters')
    .where({ openId })
    .orderBy('updateTime', 'desc')
    .limit(MAX_CHARS)
    .get()

  const characters = result.data.map(item => item.character)
  return { code: 0, data: characters }
}

// 删除角色卡
async function deleteCharacter(openId, event) {
  const { characterId } = event
  if (!characterId) {
    return { code: -6, message: '缺少 characterId' }
  }

  const result = await db.collection('characters')
    .where({ openId, 'character.id': characterId })
    .remove()

  return { code: 0, message: '删除成功', deleted: result.stats.removed }
}
