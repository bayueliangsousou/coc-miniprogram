// utils/character.js
// 角色卡数据结构定义与操作工具

/**
 * 创建一个空白的新角色
 */
function createEmptyCharacter() {
  return {
    id: Date.now().toString(),
    createdAt: Date.now(),
    updatedAt: Date.now(),

    // 基本信息
    name: '',          // 调查员姓名
    player: '',        // 玩家名
    age: '',           // 年龄
    gender: '',        // 性别
    birthplace: '',    // 出生地

    // 职业
    occupation: '',    // 职业名称
    occupationId: '',  // 职业ID（用于查找职业技能）

    // 八围属性（原始值，均为 3d6 或 2d6 * 5 后的值）
    attributes: {
      STR: 0,   // 力量
      CON: 0,   // 体质
      SIZ: 0,   // 体型
      DEX: 0,   // 敏捷
      APP: 0,   // 外貌
      INT: 0,   // 智力
      POW: 0,   // 意志
      EDU: 0,   // 教育
      LUK: 0    // 幸运（单独骰）
    },

    // 技能（key: 技能名, value: 当前值）
    skills: {},

    // 战斗数值（当前值和满值）
    combat: {
      hpCurrent: 0,   // 当前 HP
      hpMax: 0,      // HP 满值
      sanCurrent: 0,  // 当前 SAN
      sanMax: 99,    // SAN 满值
      mpCurrent: 0,   // 当前 MP
      mpMax: 0,      // MP 满值
    },

    // 武器列表
    weapons: [],

    // 人物背景
    background: {
      story: '',          // 个人描述 / 故事
      beliefs: '',        // 重要之人与地点
      traits: '',         // 特质
      ideology: '',       // 意识形态与信仰
      wounds: '',         // 重要伤疤与创伤
      gear: '',           // 宝贵之物与珍宝
      keyPeople: '',      // 重要的人
    }
  }
}

/**
 * 计算衍生属性
 * @param {object} attrs 八围属性对象
 * @returns {object} 衍生值
 */
function calcDerived(attrs) {
  const { STR, CON, SIZ, DEX, APP, INT, POW, EDU } = attrs

  // HP = (CON + SIZ) / 10 向下取整
  const hp = Math.floor((CON + SIZ) / 10)

  // MP = POW / 5 向下取整
  const mp = Math.floor(POW / 5)

  // SAN初始 = POW
  const sanStart = POW

  // MOV = 依据 STR/DEX vs SIZ 判断
  let mov = 8
  if (DEX < SIZ && STR < SIZ) {
    mov = 7
  } else if (DEX > SIZ && STR > SIZ) {
    mov = 9
  }

  // 伤害加值和体格
  const strSiz = STR + SIZ
  let db = '0'
  let build = 0
  if (strSiz >= 2 && strSiz <= 64) { db = '-2'; build = -2 }
  else if (strSiz >= 65 && strSiz <= 84) { db = '-1'; build = -1 }
  else if (strSiz >= 85 && strSiz <= 124) { db = '0'; build = 0 }
  else if (strSiz >= 125 && strSiz <= 164) { db = '+1d4'; build = 1 }
  else if (strSiz >= 165 && strSiz <= 204) { db = '+1d6'; build = 2 }
  else if (strSiz >= 205) { db = '+2d6'; build = 3 }

  // 闪避基础值 = DEX / 2 向下取整
  const dodge = Math.floor(DEX / 2)

  return { hp, mp, sanStart, mov, db, build, dodge }
}

/**
 * 计算技能的半值和五分之一值（用于困难/极难检定）
 */
function calcSkillThresholds(value) {
  return {
    normal: value,
    hard: Math.floor(value / 2),
    extreme: Math.floor(value / 5)
  }
}

/**
 * 计算可用的技能点数
 * CoC 7th Edition 规则：
 * - 职业技能点数：根据职业公式计算（如 EDU×4、DEX×2+EDU×2 等）
 * - 兴趣技能点数：所有职业都是 EDU × 2
 * - 职业技能只能用职业点数提升
 * - 任何技能都可以用兴趣点数提升
 * @param {object} character 角色对象
 * @returns {object} {total, used, remaining, occPoints, intPoints}
 */
function calcSkillPoints(character) {
  const { attributes = {}, skills = {}, occupationId } = character
  const { EDU = 0, DEX = 0, APP = 0, STR = 0, INT = 0 } = attributes

  // 1. 找到职业信息
  const { OCCUPATIONS } = require('./coc-data')
  const occ = OCCUPATIONS.find(o => o.id === occupationId)

  // 获取职业技能名列表，过滤掉"点X门技能"这类说明
  let occSkillNames = []
  if (occ && occ.skills) {
    occSkillNames = occ.skills
      .map(s => Array.isArray(s) ? s : [s])
      .reduce((acc, arr) => acc.concat(arr), [])
      .filter(s => typeof s === 'string' && !(s.includes('点') && s.includes('门')))
  }

  // 2. 计算职业技能点数（根据职业公式）
  let occTotal = 0
  if (occ && occ.pointFormula) {
    const formula = occ.pointFormula
    if (formula === 'EDU × 4') {
      occTotal = EDU * 4
    } else if (formula === 'DEX × 2 + EDU × 2') {
      occTotal = DEX * 2 + EDU * 2
    } else if (formula === 'APP × 2 + EDU × 2') {
      occTotal = APP * 2 + EDU * 2
    } else if (formula === 'STR × 2 + DEX × 2') {
      occTotal = STR * 2 + DEX * 2
    } else if (formula === 'EDU × 2 + STR × 2') {
      // 警探、水手：EDU×2 + STR×2
      occTotal = EDU * 2 + STR * 2
    } else if (formula === 'EDU × 2 + STR × 2 或 DEX × 2') {
      // 军人/私人侦探：取 STR 和 DEX 中较大的
      occTotal = EDU * 2 + Math.max(STR, DEX) * 2
    } else if (formula === 'EDU × 2 + APP × 2 或 DEX × 2') {
      // 间谍：取 APP 和 DEX 中较大的
      occTotal = EDU * 2 + Math.max(APP, DEX) * 2
    } else {
      // 默认公式：EDU × 4
      occTotal = EDU * 4
    }
  }

  // 3. 计算兴趣技能点数（所有职业都是 EDU × 2）
  const intTotal = EDU * 2

  // 4. 计算已使用的点数
  const { SKILLS } = require('./coc-data')

  let occUsed = 0  // 职业技能已用点数
  let intUsed = 0  // 兴趣技能已用点数

  // 先收集所有技能的点使用情况
  const skillUsage = [] // { name, inputPoints, isOcc }

  SKILLS.forEach(sk => {
    const skillName = sk.name
    let baseValue = sk.baseValue

    // 特殊技能基础值
    if (skillName === '闪避') baseValue = Math.floor((attributes.DEX || 0) / 2)
    if (skillName === '母语') baseValue = attributes.EDU || 0

    const currentValue = skills[skillName] !== undefined ? skills[skillName] : baseValue
    const pointsUsed = Math.max(0, currentValue - baseValue)

    if (pointsUsed > 0) {
      const isOcc = occSkillNames.some(os => {
        const occBaseName = os.split('（')[0].split('(')[0]
        const skillBaseName = skillName.split('（')[0].split('(')[0]
        return occBaseName === skillBaseName
      })
      skillUsage.push({ name: skillName, inputPoints: pointsUsed, isOcc })
    }
  })

  // 分配点数：职业技能优先用职业点，超出的用兴趣点补
  skillUsage.forEach(({ inputPoints, isOcc }) => {
    if (isOcc) {
      // 职业技能：先用职业点，不够再用兴趣点
      const occAvailable = occTotal - occUsed
      if (inputPoints <= occAvailable) {
        occUsed += inputPoints
      } else {
        occUsed += occAvailable  // 用完全部职业点
        intUsed += (inputPoints - occAvailable)  // 剩余用兴趣点
      }
    } else {
      // 非职业技能：只用兴趣点
      intUsed += inputPoints
    }
  })

  // 5. 计算剩余点数
  const occRemaining = occTotal - occUsed
  const intRemaining = intTotal - intUsed

  return {
    occTotal,        // 职业技能总点数
    occUsed,         // 职业技能已用
    occRemaining,    // 职业技能剩余
    intTotal,        // 兴趣技能总点数
    intUsed,         // 兴趣技能已用
    intRemaining,    // 兴趣技能剩余
    total: occTotal + intTotal,  // 总点数
    used: occUsed + intUsed,     // 总已用
    remaining: occRemaining + intRemaining,  // 总剩余
    pointFormula: occ ? occ.pointFormula : '未选择职业'
  }
}

/**
 * 从本地存储读取所有角色
 */
function loadCharacters() {
  return wx.getStorageSync('coc_characters') || []
}

/**
 * 保存单个角色（新增或更新）— 本地优先，异步上传云端
 */
function saveCharacter(character) {
  const list = loadCharacters()
  const idx = list.findIndex(c => c.id === character.id)
  character.updatedAt = Date.now()
  if (idx >= 0) {
    list[idx] = character
  } else {
    list.unshift(character)
  }
  wx.setStorageSync('coc_characters', list)
  // 异步上传云端（静默，不阻塞）
  syncToCloud('save', character)
  return character
}

/**
 * 删除角色 — 本地优先，异步删除云端
 */
function deleteCharacter(id) {
  const list = loadCharacters()
  const filtered = list.filter(c => c.id !== id)
  wx.setStorageSync('coc_characters', filtered)
  // 异步删除云端
  syncToCloud('delete', null, id)
}

/**
 * 从云端拉取角色卡并与本地合并
 * 以 updatedAt 更大的为准
 * @returns {Promise<object[]>} 合并后的角色列表
 */
async function pullCharacters() {
  try {
    const res = await wx.cloud.callFunction({
      name: 'characterSync',
      data: { action: 'load' }
    })
    if (res.result && res.result.code === 0 && res.result.data) {
      const cloudChars = res.result.data
      const localChars = loadCharacters()
      const merged = mergeCharacterLists(localChars, cloudChars)
      wx.setStorageSync('coc_characters', merged)
      return merged
    }
  } catch (err) {
    console.error('pullCharacters failed:', err)
  }
  return loadCharacters()
}

/**
 * 根据 id 查找角色
 */
function getCharacterById(id) {
  const list = loadCharacters()
  return list.find(c => c.id === id) || null
}

// ─── 状态系统（与桌面端同步） ────────────────────────────────────────────────

/**
 * 角色状态类型
 */
const CharacterStatus = {
  INSANE: 'insane',                 // 疯狂
  SERIOUSLY_INJURED: 'seriouslyInjured', // 重伤
  UNCONSCIOUS: 'unconscious',       // 昏迷
  UNCONSCIOUS_DEEP: 'unconsciousDeep',  // 深昏迷
  NEAR_DEATH: 'nearDeath',          // 濒死
  DEAD: 'dead',                     // 死亡
  LOST: 'lost'                      // 失落
}

/**
 * 状态显示名称
 */
const StatusLabels = {
  'insane': '疯狂',
  'seriouslyInjured': '重伤',
  'unconscious': '昏迷',
  'unconsciousDeep': '深昏迷',
  'nearDeath': '濒死',
  'dead': '死亡',
  'lost': '失落'
}

/**
 * 状态颜色
 */
const StatusColors = {
  'insane': '#9b59b6',
  'seriouslyInjured': '#e74c3c',
  'unconscious': '#f39c12',
  'unconsciousDeep': '#e67e22',
  'nearDeath': '#c0392b',
  'dead': '#2c3e50',
  'lost': '#7f8c8d'
}

/**
 * 状态互斥规则
 * dead 状态会清除其他所有状态
 */
const STATUS_EXCLUSIONS = {
  'dead': ['insane', 'seriouslyInjured', 'unconscious', 'unconsciousDeep', 'nearDeath', 'lost']
}

/**
 * 判断是否可以添加某个状态
 * @param {string[]} currentStatus 当前状态列表
 * @param {string} newStatus 要添加的状态
 * @returns {boolean}
 */
function canAddStatus(currentStatus, newStatus) {
  if (!currentStatus) currentStatus = []
  
  // 已有的状态
  if (currentStatus.includes(newStatus)) return false
  
  // 检查互斥规则
  const exclusions = STATUS_EXCLUSIONS[newStatus]
  if (exclusions) {
    for (const excl of exclusions) {
      if (currentStatus.includes(excl)) return false
    }
  }
  
  // 如果要添加 dead，其他状态都要清除（所以可以添加）
  return true
}

/**
 * 添加状态（考虑互斥规则）
 * @param {string[]} currentStatus 当前状态列表
 * @param {string} newStatus 要添加的状态
 * @returns {string[]} 新的状态列表
 */
function addStatus(currentStatus, newStatus) {
  if (!currentStatus) currentStatus = []
  
  if (!canAddStatus(currentStatus, newStatus)) {
    return currentStatus
  }
  
  let newStatusList = [...currentStatus, newStatus]
  
  // dead 状态会清除其他所有状态
  if (newStatus === 'dead') {
    newStatusList = ['dead']
  }
  
  return newStatusList
}

/**
 * 移除状态
 * @param {string[]} currentStatus 当前状态列表
 * @param {string} statusToRemove 要移除的状态
 * @returns {string[]}
 */
function removeStatus(currentStatus, statusToRemove) {
  if (!currentStatus) return []
  return currentStatus.filter(s => s !== statusToRemove)
}

/**
 * 清除所有状态
 * @param {string[]} currentStatus 当前状态列表
 * @returns {string[]}
 */
function clearAllStatus(currentStatus) {
  return []
}

/**
 * 获取状态标签
 * @param {string} status 状态值
 * @returns {string}
 */
function getStatusLabel(status) {
  return StatusLabels[status] || status
}

/**
 * 获取状态颜色
 * @param {string} status 状态值
 * @returns {string}
 */
function getStatusColor(status) {
  return StatusColors[status] || '#666'
}

// ─── 云端同步（内部方法，不暴露给外部调用） ──────────────────────────────────

/**
 * 深度清理对象中的 undefined 值
 * 微信云数据库 update 时会忽略 undefined 字段，导致数据丢失
 */
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

/**
 * 异步同步到云端（静默，失败只打日志）
 */
function syncToCloud(action, character, characterId) {
  const cleanedCharacter = character ? deepClean(character) : null
  wx.cloud.callFunction({
    name: 'characterSync',
    data: { action, character: cleanedCharacter, characterId }
  }).then(res => {
    console.log('syncToCloud success:', action, res.result)
  }).catch(err => {
    console.error('syncToCloud failed:', action, err)
  })
}

/**
 * 合并本地和云端角色列表
 * 规则：以 updatedAt 更大的为准；云端有本地没有的 → 保留；本地有云端没有的 → 保留
 */
function mergeCharacterLists(local, cloud) {
  const map = new Map()

  // 先放云端数据
  cloud.forEach(c => {
    if (c && c.id) map.set(c.id, c)
  })

  // 用本地数据覆盖（如果本地更新时间更大）
  local.forEach(c => {
    if (!c || !c.id) return
    const existing = map.get(c.id)
    if (!existing || (c.updatedAt || 0) > (existing.updatedAt || 0)) {
      map.set(c.id, c)
    }
  })

  // 按 updatedAt 降序排列
  return Array.from(map.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

module.exports = {
  createEmptyCharacter,
  calcDerived,
  calcSkillThresholds,
  calcSkillPoints,
  loadCharacters,
  saveCharacter,
  deleteCharacter,
  getCharacterById,
  pullCharacters,
  // 状态系统
  CharacterStatus,
  StatusLabels,
  StatusColors,
  STATUS_EXCLUSIONS,
  canAddStatus,
  addStatus,
  removeStatus,
  clearAllStatus,
  getStatusLabel,
  getStatusColor
}
