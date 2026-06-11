// pages/character-detail/character-detail.js
const { getCharacterById, saveCharacter, calcDerived, calcSkillThresholds, StatusLabels, StatusColors, addStatus, removeStatus } = require('../../utils/character')
const { ATTR_NAMES, OCCUPATIONS, SKILLS } = require('../../utils/coc-data')
const cloud = require('../../utils/cloud')
const { getDefaultCharacter } = require('../../utils/default-character')

// ─── 伤害修正（DB）替换辅助 ──────────────────────────────────────────
// db 格式：'-2' / '-1' / '0' / '+1d4' / '+1d6' / '+2d6'
// 原始公式中有 '+DB' 时，db 自带 '+' 号会导致 '++1d4'；统一在这里处理
function applyDB(damage, db) {
  if (!damage) return '-'
  if (db === '0') {
    // 无修正：直接删掉 +DB / -DB 片段
    return damage.replace(/[+-]?\s*DB/gi, '').replace(/\+\s*0/gi, '') || '-'
  }
  // 先把 '+DB' 替换（正向 db 已带符号，不需要额外加号）
  // 再把单独 'DB'（前面没有符号）替换
  return damage
    .replace(/\+\s*DB/gi, db)        // '+DB' → db（如 '+1d4'，不重复加号）
    .replace(/\-\s*DB/gi, dbNeg(db)) // '-DB' → 对 db 取反
    .replace(/\bDB\b/gi, db)         // 裸 'DB' → db
}
// 对 db 值取反（'-2'↔'+2'，'+1d4'↔'-1d4'）
function dbNeg(db) {
  if (!db || db === '0') return '0'
  if (db.startsWith('+')) return '-' + db.slice(1)
  if (db.startsWith('-')) return '+' + db.slice(1)
  return '-' + db
}

// ─── 技能分类映射（CoC 七版 → 归组展示）─────────────────────────────
// coc-data.js 里的 category → UI 展示分组
const SKILL_GROUP_MAP = {
  'credits':  { key: 'credits',   label: '',              order: -1 },
  '调查':   { key: 'detect',    label: '🔍 调查',       order: 0 },
  '社交':   { key: 'social',    label: '💬 社交',       order: 1 },
  '知识':   { key: 'knowledge', label: '📚 知识',       order: 2 },
  '技术':   { key: 'tech',      label: '🛠 技术',       order: 3 },
  '运动':   { key: 'athletic',  label: '🏃 运动',       order: 4 },
  '科学':   { key: 'science',   label: '🔬 科学',       order: 5 },
  '艺术':   { key: 'arts',      label: '🎨 艺术与手艺', order: 6 },
  '战斗':   { key: 'combat',    label: '⚔️ 战斗',       order: 7 },
  '其他':   { key: 'other',     label: '📋 其他',        order: 8 },
}

// 默认折叠状态：科学和艺术默认折叠
const DEFAULT_COLLAPSED = {
  science: true,
  arts: true,
}

// ─── 展示层分类覆盖（不影响 coc-data.js 源数据）────────────────────
// 部分技能的原始分类在 UI 上需要调整
const CATEGORY_OVERRIDE = {
  '估价':   '社交',
  '自然学':   '科学',
  '心理学':   '知识',
  '乔装':     '技术',
  '信用评级':  'credits',
}
// 不需要在技能列表中显示的技能
const SKILL_EXCLUDE_FROM_LIST = []

Page({
  data: {
    character: null,
    derived: {},
    attrNames: ATTR_NAMES,
    attrKeys: ['STR', 'CON', 'SIZ', 'DEX', 'APP', 'INT', 'POW', 'EDU', 'LUK'],
    skillList: [],
    // 技能搜索 & 分组
    skillSearchKeyword: '',
    skillSearchMatches: [],  // 匹配的技能名列表
    skillSearchIndex: -1,    // 当前定位到第几个（0-based）
    skillScrollTo: '',       // scroll-into-view 目标 id
    skillCollapsed: { ...DEFAULT_COLLAPSED },
    skillGroupedList: [],  // [{ key, label, order, skills: [], count }]
    activeTab: 'attrs',
    selectedWeaponIndex: 0,
    showWeaponPicker: false,
    // 状态相关
    statusLabels: StatusLabels,
    statusColors: StatusColors,
    showStatusPicker: false,
    availableStatuses: [
      { value: 'seriouslyInjured', label: '重伤', color: '#e74c3c' },
      { value: 'unconscious', label: '昏迷', color: '#f39c12' },
      { value: 'unconsciousDeep', label: '深昏迷', color: '#e67e22' },
      { value: 'nearDeath', label: '濒死', color: '#c0392b' },
      { value: 'dead', label: '死亡', color: '#2c3e50' },
      { value: 'insane', label: '疯狂', color: '#9b59b6' },
      { value: 'lost', label: '失落', color: '#7f8c8d' }
    ],
    backgroundFields: [
      { key: 'story',     label: '个人描述' },
      { key: 'keyPeople', label: '重要之人' },
      { key: 'gear',      label: '重要之物' },
      { key: 'beliefs',   label: '重要地点' },
      { key: 'traits',    label: '特质' },
      { key: 'ideology',  label: '意识形态与信仰' },
      { key: 'wounds',    label: '重要伤疤与创伤' },
    ],
    // 房间相关
    isInRoom: false,
    roomCode: '',
    showRoomInputModal: false,
    inputRoomCode: '',
    isJoining: false,
    // 记事本
    notepadContent: '',
    // 技能检定弹窗
    showSkillCheckModal: false,
    skillCheckResult: null,
    skillCheckMode: false,
    skillCheckBgLoaded: false,
    // 导航栏背景（初始透明，下滑后变深色）
    navBarBg: 'transparent',
    // HP/SAN/MP 滚轮
    hpPickerField: '',   // 'hpCurrent' | 'sanCurrent' | 'mpCurrent'
    hpPickerRange: [],
    hpPickerValue: 0,
    showHpPicker: false,
    // 幸运值滚轮
    showLuckPicker: false,
    luckPickerRange: [],
    luckPickerValue: 0,
    // 导航栏高度
    statusBarHeight: 20,
    navHeight: 44,
    topSectionPaddingTop: 80
  },

  onShow() {
    // 获取导航栏高度
    const sys = wx.getSystemInfoSync()
    const navHeight = sys.platform === 'android' ? 48 : 44
    const statusBarHeight = sys.statusBarHeight
    const totalNavHeight = statusBarHeight + navHeight
    // 32rpx ≈ 16px (以 750rpx = 屏幕宽度 为基准，1rpx = 屏幕宽度/750)
    // 但这里直接用 px 避免 calc 混合单位问题
    const topSectionPaddingTop = totalNavHeight + 16
    this.setData({ statusBarHeight, navHeight, topSectionPaddingTop })

    const pages = getCurrentPages()
    const current = pages[pages.length - 1]
    const { id } = current.options
    if (!id) return

    // 加载角色：优先本地，若 id 是默认卡则加载默认数据
    let character = getCharacterById(id)
    if (!character && id === '__default_amiti__') {
      character = getDefaultCharacter()
    }
    if (!character) return

    const derived = calcDerived(character.attributes)

    // 兼容旧数据：确保 combat 字段完整
    if (!character.combat) {
      character.combat = {}
    }
    const combat = character.combat
    let changed = false
    if (combat.hpCurrent === undefined) { combat.hpCurrent = derived.hp; changed = true }
    if (combat.hpMax === undefined) { combat.hpMax = derived.hp; changed = true }
    if (combat.sanCurrent === undefined) { combat.sanCurrent = derived.sanStart; changed = true }
    if (combat.sanMax === undefined) { combat.sanMax = 99; changed = true }
    if (combat.mpCurrent === undefined) { combat.mpCurrent = derived.mp; changed = true }
    if (combat.mpMax === undefined) { combat.mpMax = derived.mp; changed = true }
    if (combat.status === undefined) { combat.status = []; changed = true }
    if (changed) {
      character.combat = combat
      saveCharacter(character)
    }

    // 兼容旧数据：确保 weapons 字段存在
    if (!character.weapons) {
      character.weapons = []
      saveCharacter(character)
    }
    const displayWeapons = this.buildDisplayWeapons(character.weapons, character.skills, derived.db)

    // 为属性添加困难/极难判定值
    const attrWithThresholds = {}
    this.data.attrKeys.forEach(key => {
      const val = character.attributes[key] || 0
      attrWithThresholds[key] = {
        value: val,
        hard: Math.floor(val / 2),
        extreme: Math.floor(val / 5)
      }
    })

    // 整理技能列表（展示全部标准技能 + 自定义技能），按分类分组
    const skillsObj = character.skills || {}
    const dex = (character.attributes && character.attributes.DEX) || 0
    const edu = (character.attributes && character.attributes.EDU) || 0

    // 1. 标准技能：从 SKILLS 遍历，优先用玩家编辑值，否则用基础值
    const rawSkillList = SKILLS
      .filter(sk => !SKILL_EXCLUDE_FROM_LIST.includes(sk.name))
      .map(sk => {
        // 闪避特殊基础值 = DEX/2，母语 = EDU
        let baseValue = sk.baseValue
        if (sk.name === '闪避') baseValue = Math.floor(dex / 2)
        if (sk.name === '母语') baseValue = edu

        // 玩家编辑过的值覆盖基础值
        const val = skillsObj[sk.name] !== undefined ? skillsObj[sk.name] : baseValue

        // 展示层分类覆盖优先，其次用技能定义
        let category
        if (CATEGORY_OVERRIDE[sk.name]) {
          category = CATEGORY_OVERRIDE[sk.name]
        } else {
          category = sk.category
        }

        const t = calcSkillThresholds(val)
        return { name: sk.name, current: val, hard: t.hard, extreme: t.extreme, category }
      })

    // 2. 自定义技能（character.skills 中有但 SKILLS 中没有的）
    //    包括「其他语言（XX）」和「新技能」创建的自定义职业技能
    const customSkillNames = Object.keys(skillsObj).filter(name => {
      return !SKILLS.some(sk => sk.name === name)
        && !SKILL_EXCLUDE_FROM_LIST.includes(name)
    })
    customSkillNames.forEach(name => {
      const val = skillsObj[name]
      if (val <= 0) return

      // 其他语言（XX）归入「知识」类，其余归入「credits」组
      let category = 'credits'
      if (name.match(/^其他语言（.+）$/)) {
        category = '知识'
      }

      const t = calcSkillThresholds(val)
      rawSkillList.push({ name, current: val, hard: t.hard, extreme: t.extreme, category })
    })

    rawSkillList.sort((a, b) => b.current - a.current)

    const skillList = rawSkillList
    const skillGroupedList = this.buildGroupedSkills(rawSkillList)

    // 获取社会信用评级
    const creditRatingValue = character.skills['信用评级'] || 0

    // 检查房间状态
    const currentRoom = wx.getStorageSync('current_room') || {}
    const playerChar = wx.getStorageSync('player_room_character') || {}
    const isInRoom = playerChar.id === id && currentRoom.roomCode
    
    this.setData({ 
      character, 
      derived, 
      skillList, 
      skillGroupedList,
      attrWithThresholds, 
      creditRatingValue, 
      displayWeapons,
      isInRoom,
      roomCode: currentRoom.roomCode || '',
      notepadContent: character.notepad || '',
    })
    wx.setNavigationBarTitle({ title: character.name || '调查员详情' })
  },

  // 获取技能值（带基础值兜底：即使玩家没编辑过也返回基础值）
  _getSkillValue(skills, skillName, baseValue) {
    // 先尝试精确匹配玩家已编辑过的值
    if (skills[skillName] !== undefined && skills[skillName] > 0) {
      return skills[skillName]
    }
    // 没编辑过则返回基础值（CoC规则：格斗斗殴基础值=25）
    return baseValue || 0
  },

  // 构建显示用的武器列表，确保至少有格斗斗殴
  buildDisplayWeapons(weapons, skills, db) {
    const BRAWL_SKILL_KEY = '格斗（斗殴）'   // coc-data.js 中的标准名称（全角括号）
    const BRAWL_BASE_VALUE = 25              // 格斗斗殴基础值

    const hasBrawl = weapons && weapons.some(w => w.name === '格斗斗殴')

    const processDamage = (damage) => applyDB(damage, db)

    // 格斗斗殴的技能值：优先用已编辑的值，否则用基础值
    const brawlSkillValue = this._getSkillValue(skills, BRAWL_SKILL_KEY, BRAWL_BASE_VALUE)

    if (!weapons || weapons.length === 0) {
      return [{
        id: 'default-brawl',
        name: '格斗斗殴',
        damage: processDamage('1D3+DB'),
        range: '接触',
        attacks: '1',
        ammo: '-',
        malfunction: '-',
        skillKey: BRAWL_SKILL_KEY,
        skillValue: brawlSkillValue
      }]
    } else if (!hasBrawl) {
      const defaultBrawl = {
        id: 'default-brawl',
        name: '格斗斗殴',
        damage: processDamage('1D3+DB'),
        range: '接触',
        attacks: '1',
        ammo: '-',
        malfunction: '-',
        skillKey: BRAWL_SKILL_KEY,
        skillValue: brawlSkillValue
      }
      return [defaultBrawl, ...weapons.map(w => ({
        ...w,
        damage: processDamage(w.damage)
      }))]
    } else {
      // 已有格斗斗殴的武器记录：修正其 skillValue（也要带基础值兜底）
      return weapons.map(w => {
        if (w.name === '格斗斗殴') {
          return {
            ...w,
            damage: processDamage(w.damage),
            skillKey: w.skillKey || BRAWL_SKILL_KEY,
            skillValue: w.skillValue > 0 ? w.skillValue : brawlSkillValue
          }
        }
        return { ...w, damage: processDamage(w.damage) }
      })
    }
  },

  // ─── 技能分组构建 ──
  // 将扁平技能列表按 category 分组，支持搜索过滤
  buildGroupedSkills(rawList, keyword = '') {
    const kw = (keyword || '').trim().toLowerCase()
    // 搜索过滤
    const filtered = kw
      ? rawList.filter(s => s.name.toLowerCase().includes(kw))
      : rawList

    // 按 category 归组
    const groupMap = {}
    filtered.forEach(skill => {
      const cat = skill.category || '其他'
      if (!groupMap[cat]) groupMap[cat] = []
      groupMap[cat].push(skill)
    })

    // 转成有序数组
    return Object.entries(groupMap)
      .map(([category, skills]) => {
        const groupInfo = SKILL_GROUP_MAP[category] || { key: 'other', label: category, order: 99 }
        return {
          ...groupInfo,
          category,
          skills,
          count: skills.length,
        }
      })
      .sort((a, b) => a.order - b.order)
  },

  // ─── 技能搜索 ──
  onSkillSearchInput(e) {
    const keyword = e.detail.value || ''
    this.setData({ skillSearchKeyword: keyword })
    if (!keyword) {
      this.setData({ skillSearchMatches: [], skillSearchIndex: -1, skillScrollTo: '' })
      this.refreshGroupedSkills('')
      return
    }
    this.refreshGroupedSkills(keyword)
    // 延迟一帧后计算匹配列表（等 refreshGroupedSkills 更新完 skillGroupedList）
    setTimeout(() => {
      const matches = this._buildSkillSearchMatches(keyword)
      const newIndex = matches.length > 0 ? 0 : -1
      this.setData({
        skillSearchMatches: matches,
        skillSearchIndex: newIndex,
        skillScrollTo: newIndex >= 0 ? 'skv-' + matches[newIndex] : ''
      })
    }, 50)
  },

  onSkillSearchClear() {
    this.setData({ skillSearchKeyword: '', skillSearchMatches: [], skillSearchIndex: -1, skillScrollTo: '' })
    this.refreshGroupedSkills('')
  },

  onSkillSearchNext() {
    const { skillSearchMatches, skillSearchIndex } = this.data
    if (skillSearchMatches.length === 0) return
    const next = (skillSearchIndex + 1) % skillSearchMatches.length
    this.setData({
      skillSearchIndex: next,
      skillScrollTo: 'skv-' + skillSearchMatches[next]
    })
  },

  // 构建匹配技能名列表（按分组顺序）
  _buildSkillSearchMatches(keyword) {
    const { skillGroupedList } = this.data
    const matches = []
    skillGroupedList.forEach(group => {
      group.skills.forEach(sk => {
        if (sk.name.indexOf(keyword) !== -1) matches.push(sk.name)
      })
    })
    return matches
  },

  refreshGroupedSkills(keyword) {
    const rawList = (this.data.skillList || []).map(s => {
      // 尊重已有的 category 覆盖和自定义技能
      if (CATEGORY_OVERRIDE[s.name]) {
        return { ...s, category: CATEGORY_OVERRIDE[s.name] }
      }
      const skillDef = SKILLS.find(sk => sk.name === s.name)
      return { ...s, category: (skillDef && skillDef.category) || 'credits' }
    })
    this.setData({ skillGroupedList: this.buildGroupedSkills(rawList, keyword) })
  },

  // ─── 分组折叠切换 ──
  onToggleSkillGroup(e) {
    const groupKey = e.currentTarget.dataset.group
    this.setData({
      [`skillCollapsed.${groupKey}`]: !this.data.skillCollapsed[groupKey]
    })
  },

  // ─── 记事本（防抖自动保存）───
  _notepadTimer: null,
  onNotepadInput(e) {
    const content = e.detail.value || ''
    this.setData({ notepadContent: content })
    clearTimeout(this._notepadTimer)
    this._notepadTimer = setTimeout(() => {
      const { id } = getCurrentPages()[getCurrentPages().length - 1].options
      if (!id) return
      const latest = getCharacterById(id)
      if (!latest) return
      const updated = { ...latest, notepad: content }
      saveCharacter(updated)
    }, 500)
  },

  onTabChange(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },

  // 显示武器选择器
  onShowWeaponPicker() {
    this.setData({ showWeaponPicker: true })
  },

  // 武器选择确认
  onWeaponConfirm(e) {
    this.setData({ selectedWeaponIndex: parseInt(e.detail.value), showWeaponPicker: false })
  },

  // 武器选择取消
  onWeaponCancel() {
    this.setData({ showWeaponPicker: false })
  },

  // ── HP/SAN/MP 滚轮选择 ──
  onHpTap(e) {
    const { field } = e.currentTarget.dataset
    const { character } = this.data
    const current = character.combat[field] !== undefined ? character.combat[field] : 0
    // 根据字段确定最大值，range 从 max 到 0，方便选择
    const maxMap = {
      hpCurrent: character.combat.hpMax || 0,
      sanCurrent: character.combat.sanMax || 0,
      mpCurrent: character.combat.mpMax || 0
    }
    const max = maxMap[field] || 0
    const range = []
    for (let i = max; i >= 0; i--) range.push(i)
    // current 在 range 中的 index = max - current
    // 如果当前值超过极值，默认选中极值（第一项）
    const pickerIdx = current > max ? 0 : Math.max(0, Math.min(max, max - current))
    this.setData({
      hpPickerField: field,
      hpPickerRange: range,
      hpPickerValue: pickerIdx
    }, () => {
      this.setData({ showHpPicker: true })
    })
  },

  onHpPickerConfirm(e) {
    const { item } = e.detail
    const { hpPickerField } = this.data
    const value = item
    this.setData({ showHpPicker: false })
    this._saveCombatField(hpPickerField, value)
  },

  onHpPickerCancel() {
    this.setData({ showHpPicker: false })
  },

  _saveCombatField(field, value) {
    const { id } = getCurrentPages()[getCurrentPages().length - 1].options
    if (!id) return
    const latest = getCharacterById(id)
    if (!latest) return
    const combat = { ...latest.combat, [field]: value }
    let character = { ...latest, combat }

    // HP 变化时自动添加状态标签
    if (field === 'hpCurrent') {
      const oldHp = latest.combat.hpCurrent || 0
      const newHp = value
      let statusList = character.status ? [...character.status] : []

      // HP 降到 0 → 濒死
      if (newHp <= 0 && !statusList.includes('nearDeath') && !statusList.includes('dead')) {
        statusList = addStatus(statusList, 'nearDeath')
        wx.showToast({ title: '状态：濒死', icon: 'none' })
      }
      // 一次性减少 ≥ 原值 1/2 → 重伤（濒死/死亡已覆盖则跳过）
      else if (oldHp - newHp >= Math.ceil(oldHp / 2) && oldHp > 0 && newHp > 0
        && !statusList.includes('seriouslyInjured') && !statusList.includes('nearDeath') && !statusList.includes('dead')) {
        statusList = addStatus(statusList, 'seriouslyInjured')
        wx.showToast({ title: '状态：重伤', icon: 'none' })
      }

      character = { ...character, status: statusList }
    }

    saveCharacter(character)
    this.setData({ character })
    this.syncAttributeToDesktop(field, value)
  },

  // ── 幸运值滚轮选择 ──
  onLuckTap() {
    const { character } = this.data
    const current = character.attributes.LUK || 0
    const range = []
    for (let i = 100; i >= 0; i--) range.push(i)
    this.setData({
      luckPickerRange: range,
      luckPickerValue: 100 - current
    }, () => {
      this.setData({ showLuckPicker: true })
    })
  },

  onLuckPickerConfirm(e) {
    const { item } = e.detail
    this.setData({ showLuckPicker: false })
    const { id } = getCurrentPages()[getCurrentPages().length - 1].options
    if (!id) return
    const latest = getCharacterById(id)
    if (!latest) return
    const attributes = { ...latest.attributes, LUK: item }
    const character = { ...latest, attributes }
    saveCharacter(character)
    this.setData({ character })
    // 重新计算 derived 和 attrWithThresholds
    const derived = calcDerived(character.attributes)
    const attrWithThresholds = {}
    this.data.attrKeys.forEach(key => {
      const val = character.attributes[key] || 0
      attrWithThresholds[key] = { value: val, hard: Math.floor(val / 2), extreme: Math.floor(val / 5) }
    })
    this.setData({ derived, attrWithThresholds })
  },

  onLuckPickerCancel() {
    this.setData({ showLuckPicker: false })
  },

  // ── 属性值骰子检定（调用 dice-tool 组件） ──
  _doD100Check(name, val) {
    const diceTool = this.selectComponent('#diceTool')
    if (diceTool) diceTool.doD100Check(name, val)
  },

  onAttrDiceTap(e) {
    const { name, value } = e.currentTarget.dataset
    this._doD100Check(name, parseInt(value) || 0)
  },

  onAttrCellTap(e) {
    const { key } = e.currentTarget.dataset
    const name = this.data.attrNames[key]
    const val = this.data.character.attributes[key] || 0
    this._doD100Check(name, val)
  },

  onDodgeDiceTap() {
    this._doD100Check('闪避', this.data.derived.dodge || 0)
  },

  onSanDiceTap() {
    this._doD100Check('SAN', this.data.derived.sanStart || 0)
  },

  // 战斗数值（HP/SAN/MP 当前值）输入（已废弃，保留以防回退）
  onCombatInput(e) {
    const { field } = e.currentTarget.dataset
    let value = parseInt(e.detail.value) || 0
    if (value < 0) value = 0
    // 从 storage 读最新数据再写回，避免用 this.data.character 过期快照覆盖其他修改
    const { id } = getCurrentPages()[getCurrentPages().length - 1].options
    if (!id) return
    const latest = getCharacterById(id)
    if (!latest) return
    const combat = { ...latest.combat, [field]: value }
    const character = { ...latest, combat }
    saveCharacter(character)
    this.setData({ character })
    // 同步 HP/SAN/MP 变更到桌面端
    this.syncAttributeToDesktop(field, value)
  },

  onEdit() {
    const { character } = this.data
    wx.navigateTo({
      url: `/pages/character-edit/character-edit?id=${character.id}`
    })
  },

  // ── 状态管理 ──

  // 显示状态选择器
  onShowStatusPicker() {
    this.setData({ showStatusPicker: true })
  },

  // 选择状态
  onSelectStatus(e) {
    const status = e.currentTarget.dataset.status
    const { id } = getCurrentPages()[getCurrentPages().length - 1].options
    if (!id) return
    const latest = getCharacterById(id)
    if (!latest) return
    
    let newStatus
    if (latest.status && latest.status.includes(status)) {
      // 已选中的状态，取消选择（不移除，保留弹窗让用户确认）
      wx.showModal({
        title: '确认移除状态',
        content: `确定要移除「${StatusLabels[status]}」状态吗？`,
        confirmText: '移除',
        confirmColor: '#c0392b',
        success: (res) => {
          if (res.confirm) {
            newStatus = removeStatus(latest.status, status)
            const updatedCharacter = { ...latest, status: newStatus }
            saveCharacter(updatedCharacter)
            this.setData({ character: updatedCharacter })
            // 同步到桌面端
            this.syncStatusToDesktop('status', newStatus)
          }
        }
      })
      return
    } else {
      // 添加状态
      newStatus = addStatus(latest.status || [], status)
    }

    // 更新角色
    const updatedCharacter = { ...latest, status: newStatus }
    saveCharacter(updatedCharacter)
    this.setData({ 
      character: updatedCharacter,
      showStatusPicker: false
    })

    // 同步到桌面端（如果在房间中）
    this.syncStatusToDesktop('status', newStatus)
  },

  // 长按状态标签，显示删除确认
  onLongPressStatus(e) {
    const status = e.currentTarget.dataset.status
    const label = StatusLabels[status] || status
    
    wx.showModal({
      title: '删除状态',
      content: `确定要删除「${label}」状态吗？`,
      confirmText: '删除',
      confirmColor: '#c0392b',
      success: (res) => {
        if (res.confirm) {
          const { id } = getCurrentPages()[getCurrentPages().length - 1].options
          if (!id) return
          const latest = getCharacterById(id)
          if (!latest) return
          const newStatus = removeStatus(latest.status, status)
          const updatedCharacter = { ...latest, status: newStatus }
          saveCharacter(updatedCharacter)
          this.setData({ character: updatedCharacter })
          // 同步到桌面端
          this.syncStatusToDesktop('status', newStatus)
        }
      }
    })
  },

  // 关闭状态选择器
  onCloseStatusPicker() {
    this.setData({ showStatusPicker: false })
  },

  // 同步状态到桌面端（V1: 使用 pushEvent 云函数）
  syncStatusToDesktop(type, value) {
    const currentRoom = wx.getStorageSync('current_room')
    if (!currentRoom) return

    const character = this.data.character
    const roomId = currentRoom.roomId || ''
    const roomCode = currentRoom.roomCode || ''

    cloud.syncPushEvent({
      roomId,
      roomCode,
      characterId: character.id,
      source: 'player-app',
      type: 'status_replace',
      payload: { statuses: value },
    }).then(res => {
      if (res.success) {
      }
    })
  },

  // 同步 HP/SAN/MP 变更到桌面端
  syncAttributeToDesktop(field, value) {
    const currentRoom = wx.getStorageSync('current_room')
    if (!currentRoom) return

    // 字段名 → 事件类型 映射
    const eventTypeMap = {
      hpCurrent: { type: 'hp_change', attrKey: 'hp', maxKey: 'hp' },
      sanCurrent: { type: 'san_change', attrKey: 'san', maxKey: 'sanStart' },
      mpCurrent: { type: 'mp_change', attrKey: 'mp', maxKey: 'mp' },
    }

    const mapping = eventTypeMap[field]
    if (!mapping) return

    const character = this.data.character
    const derived = this.data.derived

    cloud.syncPushEvent({
      roomId: currentRoom.roomId || '',
      roomCode: currentRoom.roomCode || '',
      characterId: character.id,
      source: 'player-app',
      type: mapping.type,
      payload: {
        value: value,
        max: derived?.[mapping.maxKey] ?? value,
      },
    }).then(res => {
      if (res.success) {
      }
    })
  },

  // ── 房间相关 ──

  // 点击房间按钮（加入/显示房间号）
  onRoomAction() {
    const { isInRoom, roomCode } = this.data
    if (isInRoom) {
      // 已加入房间，显示操作选项
      wx.showModal({
        title: '当前房间',
        content: `房间号：${roomCode}`,
        showCancel: true,
        confirmText: '退出房间',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.onLeaveRoom()
          }
        }
      })
    } else {
      // 未加入房间，显示输入弹窗
      this.setData({ 
        showRoomInputModal: true,
        inputRoomCode: ''
      })
    }
  },

  // 退出房间
  onLeaveRoom() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出当前房间吗？',
      success: (res) => {
        if (res.confirm) {
          // 推送离开事件到桌面端
          const currentRoom = wx.getStorageSync('current_room')
          const character = this.data.character
          if (currentRoom && character) {
            cloud.syncPushEvent({
              roomId: currentRoom.roomId || '',
              roomCode: currentRoom.roomCode || '',
              characterId: character.id,
              source: 'player-app',
              type: 'player_leave',
              payload: { reason: '主动退出' },
            }).catch(err => console.warn('[同步] 退出事件推送失败:', err))
          }

          // 清除本地存储的房间信息
          wx.removeStorageSync('current_room')
          wx.removeStorageSync('player_room_character')
          
          this.setData({
            isInRoom: false,
            roomCode: null
          })
          
          wx.showToast({ title: '已退出房间', icon: 'success' })
        }
      }
    })
  },

  // 关闭房间输入弹窗
  onCloseRoomInputModal() {
    this.setData({ 
      showRoomInputModal: false,
      inputRoomCode: ''
    })
  },

  // 阻止触摸滑动穿透
  preventTouchMove() {
    // 阻止弹窗背景的滑动穿透
  },

  // 房间号输入
  onRoomCodeInput(e) {
    this.setData({ inputRoomCode: e.detail.value.replace(/\D/g, '') })
  },

  // 确认加入房间
  onConfirmJoinRoom() {
    // 未登录先跳转登录
    if (!cloud.checkLogin()) {
      this.setData({ showRoomInputModal: false })
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    const { inputRoomCode, character } = this.data
    
    if (!inputRoomCode || inputRoomCode.length !== 4) {
      wx.showToast({ title: '请输入4位房间号', icon: 'none' })
      return
    }

    this.setData({ isJoining: true })

    // 计算派生属性（用于闪避值）
    const derived = calcDerived(character.attributes || {})
    const skills = character.skills || {}

    // 格斗斗殴常量（与 buildDisplayWeapons 保持一致）
    const BRAWL_SKILL_KEY = '格斗（斗殴）'
    const BRAWL_BASE_VALUE = 25
    // 获取格斗斗殴技能值（带基础值兜底）
    const getBrawlSkillValue = () => {
      if (skills[BRAWL_SKILL_KEY] !== undefined && skills[BRAWL_SKILL_KEY] > 0) {
        return skills[BRAWL_SKILL_KEY]
      }
      return BRAWL_BASE_VALUE
    }

    // 构建武器列表（确保包含格斗斗殴，与角色详情页展示一致）
    const rawWeapons = character.weapons || []
    const hasBrawl = rawWeapons.some(w => w.name === '格斗斗殴')
    const buildWeaponData = (w) => ({
      name: w.name || '',
      damage: applyDB(w.damage, derived.db),
      attacksPerRound: parseInt(w.attacks) || 1,
      range: w.range || '',
      malfunction: w.malfunction && w.malfunction !== '-' ? parseInt(w.malfunction) : undefined,
      ammo: w.ammo && w.ammo !== '-' ? parseInt(w.ammo) : undefined,
      skillKey: w.skillKey || '',
      skillValue: w.skillValue > 0 ? w.skillValue : 0,
    })

    let weaponsToSend = []
    if (!hasBrawl) {
      // 补充默认格斗斗殴到列表头部（与小程序展示一致）
      weaponsToSend.push({
        name: '格斗斗殴',
        damage: applyDB('1D3+DB', derived.db),
        attacksPerRound: 1,
        range: '接触',
        skillKey: BRAWL_SKILL_KEY,
        skillValue: getBrawlSkillValue(),
      })
    }
    // 追加用户已有武器，已有的格斗斗殴也修正 skillValue
    rawWeapons.forEach(w => {
      if (w.name === '格斗斗殴') {
        weaponsToSend.push({
          ...buildWeaponData(w),
          skillKey: w.skillKey || BRAWL_SKILL_KEY,
          skillValue: w.skillValue > 0 ? w.skillValue : getBrawlSkillValue(),
        })
      } else {
        weaponsToSend.push(buildWeaponData(w))
      }
    })

    // 传递完整角色数据用于导入到桌面端
    cloud.callCloudFunction('joinRoom', {
      roomCode: inputRoomCode,
      characterData: {
        id: character.id,
        name: character.name,
        occupation: character.occupation || '',
        // 完整属性数据
        attributes: character.attributes || {},
        skills: character.skills || {},
        // HP/SAN/MP 当前值和满值（优先使用存储的满值）
        hp: character.combat?.hpCurrent || 0,
        maxHp: character.combat?.hpMax || (character.attributes?.CON ? Math.ceil((character.attributes.CON + character.attributes.SIZ) / 2) : 0),
        san: character.combat?.sanCurrent || 0,
        maxSan: character.combat?.sanMax || 99,
        mp: character.combat?.mpCurrent || 0,
        maxMp: character.combat?.mpMax || (character.attributes?.POW ? Math.ceil(character.attributes.POW / 5) : 0),
        // 闪避值（从 DEX/2 计算）
        dodge: derived.dodge,
        // 武器列表（与小程序角色详情页战斗下拉弹窗一致，确保含格斗斗殴）
        weapons: weaponsToSend,
        // 状态
        status: character.status || [],
        // 备注（包含背景信息，从 background 子对象读取）
        notes: [
          character.notes || '',
          '【个人描述】' + ((character.background && character.background.story) || ''),
          '【重要之人】' + ((character.background && character.background.keyPeople) || ''),
          '【重要之物】' + ((character.background && character.background.gear) || ''),
          '【重要地点】' + ((character.background && character.background.beliefs) || ''),
          '【特质】' + ((character.background && character.background.traits) || ''),
          '【意识形态与信仰】' + ((character.background && character.background.ideology) || ''),
          '【重要伤疤与创伤】' + ((character.background && character.background.wounds) || '')
        ].filter(s => s && s !== '【】' && s !== '').join('\n'),
        // 背景信息单独字段（用于桌面端识别）
        // 数据在 character.background 子对象中，必须从这里读
        background: {
          story: (character.background && character.background.story) || '',
          keyPeople: (character.background && character.background.keyPeople) || '',
          gear: (character.background && character.background.gear) || '',
          beliefs: (character.background && character.background.beliefs) || '',
          traits: (character.background && character.background.traits) || '',
          ideology: (character.background && character.background.ideology) || '',
          wounds: (character.background && character.background.wounds) || ''
        },
        // 年龄/性别（如果有）
        age: character.age || 0,
        gender: character.gender || ''
      },
    }).then(result => {
      this.setData({ isJoining: false })
      if (result.code === 0 && result.data.success) {
        // 保存房间信息
        wx.setStorageSync('current_room', {
          roomId: result.data.roomId,
          roomCode: result.data.roomCode,
          campaignId: result.data.campaignId,
          campaignName: result.data.campaignName
        })
        wx.setStorageSync('player_room_character', {
          id: character.id,
          name: character.name
        })
        
        this.setData({ 
          isInRoom: true,
          roomCode: result.data.roomCode,
          showRoomInputModal: false
        })
        wx.showToast({ title: result.data.isRejoin ? '已重新加入房间' : '加入成功', icon: 'success' })
      } else {
        wx.showToast({ title: result.message || '加入失败', icon: 'none' })
      }
    }).catch(err => {
      console.error('加入房间失败:', err)
      this.setData({ isJoining: false })
      wx.showToast({ title: '加入失败，请重试', icon: 'none' })
    })
  },

  // ── 编辑 ──
  onEditTap() {
    // 未登录先跳转登录
    if (!cloud.checkLogin()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    if (!this.data.character) return
    wx.navigateTo({ url: `/pages/character-edit/character-edit?id=${this.data.character.id}` })
  },

  onBackTap() {
    wx.navigateBack({ delta: 1 })
  },

  // ── 主区域滚动：控制导航栏背景 ──
  onMainScroll(e) {
    const scrollTop = e.detail.scrollTop
    const navHeight = this.data.statusBarHeight + this.data.navHeight
    const targetBg = scrollTop > navHeight ? 'rgba(37,37,51,0.92)' : 'transparent'
    if (this.data.navBarBg !== targetBg) {
      this.setData({ navBarBg: targetBg })
    }
  },

  // ── 技能检定（D100）──
  // CoC 第7版 D100 判定逻辑（保留在页面中，属于业务规则）
  calcSkillCheckResult(roll, skill) {
    // 大成功：投掷值 = 1
    if (roll === 1) return { text: '大成功', class: 'critical-success' }

    const hard = Math.floor(skill / 2)
    const extreme = Math.floor(skill / 5)

    // 极难成功
    if (roll <= extreme) return { text: '极难成功', class: 'extreme-success' }
    // 困难成功
    if (roll <= hard) return { text: '困难成功', class: 'hard-success' }
    // 常规成功
    if (roll <= skill) return { text: '成功', class: 'success' }

    // 大失败判定
    if (skill >= 50) {
      if (roll >= 96) return { text: '大失败', class: 'fumble' }
    } else {
      if (roll === 100) return { text: '大失败', class: 'fumble' }
    }

    // 普通失败
    return { text: '失败', class: 'failure' }
  },

  onSkillDiceTap(e) {
    const name = e.currentTarget.dataset.name
    const value = parseInt(e.currentTarget.dataset.value) || 0
    if (value <= 0) {
      wx.showToast({ title: '该技能无数值', icon: 'none' })
      return
    }
    this._doD100Check(name, value)
  },

  onCloseSkillCheckModal() {
    const diceTool = this.selectComponent('#diceTool')
    if (diceTool) diceTool.close()
    this.setData({ showSkillCheckModal: false, skillCheckResult: null, skillCheckMode: false })
  },

  // ── 骰子组件事件处理 ──

  /**
   * 接收组件的 D100 检定结果事件
   * 使用本页面的 calcSkillCheckResult 计算判定，然后显示弹窗
   */
  onSkillCheckResultEvent(e) {
    const { skillName, skillValue, rollValue } = e.detail
    const checkResult = this.calcSkillCheckResult(rollValue, skillValue)
    this.setData({
      skillCheckResult: {
        skillName: skillName,
        skillValue: skillValue,
        rollValue: rollValue,
        resultText: checkResult.text,
        resultClass: checkResult.class
      },
      showSkillCheckModal: true,
      skillCheckBgLoaded: false
    })
  },

  onSkillCheckBgLoaded() {
    this.setData({ skillCheckBgLoaded: true })
  },

  /**
   * 骰子组件关闭事件回调（预留扩展点）
   */
  onDiceToolClose(e) {
    // e.detail.source === 'overlay-tap' | 'collapse'
    // 如果 skill check 弹窗仍然打开，也需要关闭
    if (this.data.showSkillCheckModal) {
      this.setData({ showSkillCheckModal: false, skillCheckResult: null, skillCheckMode: false })
    }
  }
})
