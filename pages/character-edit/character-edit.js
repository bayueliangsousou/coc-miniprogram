// pages/character-edit/character-edit.js
const { createEmptyCharacter, saveCharacter, getCharacterById, calcDerived, calcSkillPoints, saveDraft, saveNewDraft, loadDraft, loadNewDraft, clearDraft, clearNewDraft, isDraftNewer } = require('../../utils/character')
const { ATTR_NAMES, ATTR_DICE_RULES, rollAttributes, SKILLS } = require('../../utils/coc-data')
const { WEAPONS_BY_SKILL } = require('../../utils/weapons-data')
const { saveThenBack } = require('../../utils/nav')

Page({
  data: {
    character: null,
    derived: {},
    scrollTarget: '',
    attrKeys: ['STR', 'CON', 'SIZ', 'DEX', 'APP', 'INT', 'POW', 'EDU', 'LUK'],
    attrNames: ATTR_NAMES,
    attrDiceRules: ATTR_DICE_RULES,
    isNew: true,
    skillPoints: { occTotal: 0, intTotal: 0 },
    // 武器相关
    showWeaponForm: false,  // 是否显示武器输入表单
    editingWeaponIndex: -1,  // -1 = 新增，>=0 = 编辑
    weaponForm: { name: '', skillKey: '', skillValue: 0, damage: '' },
    // 战斗技能列表（用于下拉选择）
    combatSkills: [],
    // 是否已编辑过技能
    hasEditedSkills: false,
    // 当前选中的武器（用于展示模式）
    selectedWeaponIndex: -1,
    // 当前选中的战斗技能索引（用于picker）
    skillIndex: -1,
    // 当前选中的武器索引（用于picker）
    weaponIndex: -1,
    // 可选武器列表（根据选择的战斗技能动态加载）
    availableWeapons: [],
    // 性别选项
    genderOptions: ['男', '女'],
    genderIndex: -1,
    // 自定义 picker 显示状态
    showGenderPicker: false,
    showCombatSkillPicker: false,
    showWeaponPicker: false
  },

  onLoad(options) {
    const { id } = options
    if (id) {
      const character = getCharacterById(id)
      if (character) {
        // 兼容旧数据：确保 combat/weapons 字段存在
        if (!character.combat) {
          const d = calcDerived(character.attributes)
          character.combat = { hpCurrent: d.hp, sanCurrent: d.sanStart, mpCurrent: d.mp }
        }
        if (!character.weapons) character.weapons = []
        // 检查是否已编辑过技能
        const hasEditedSkills = character.skills && Object.keys(character.skills).length > 0
        // 设置性别索引
        const genderIndex = character.gender ? this.data.genderOptions.indexOf(character.gender) : -1
        this.setData({
          character,
          derived: calcDerived(character.attributes),
          isNew: false,
          hasEditedSkills,
          genderIndex
        }, () => { 
          this.calcSkillPoints()
          this.updateCombatSkills()
        })
        return
      }
    }
    const character = createEmptyCharacter()
    const derived = calcDerived(character.attributes)
    character.combat = { hpCurrent: derived.hp, sanCurrent: derived.sanStart, mpCurrent: derived.mp }
    this.setData({ character, derived, skillPoints: { occTotal: 0, intTotal: 0 }, hasEditedSkills: false })
  },

  onShow() {
    const { character } = this.data
    if (!character) return
    const latest = getCharacterById(character.id)
    if (latest) {
      // 已存档角色：优先用比存档更新的未保存草稿
      const draft = loadDraft(character.id)
      const useDraft = !!(draft && isDraftNewer(draft, latest))
      this.restoreCharacterData(useDraft ? draft.character : latest, useDraft)
    } else {
      // 尚未首次存档的新角色：尝试恢复新建草稿
      const newDraft = loadNewDraft()
      if (newDraft && newDraft.character) {
        this.restoreCharacterData(newDraft.character, true)
      }
    }
  },

  // 应用角色数据到页面（兼容旧数据 + 重算衍生/技能点），可选提示已恢复草稿
  restoreCharacterData(character, showToast) {
    if (!character) return
    if (!character.combat) {
      const d = calcDerived(character.attributes)
      character.combat = { hpCurrent: d.hp, sanCurrent: d.sanStart, mpCurrent: d.mp }
    }
    if (!character.weapons) character.weapons = []
    const hasEditedSkills = !!(character.skills && Object.keys(character.skills).length > 0)
    const genderIndex = character.gender ? this.data.genderOptions.indexOf(character.gender) : -1
    this.setData({
      character,
      derived: calcDerived(character.attributes),
      hasEditedSkills,
      genderIndex
    }, () => {
      this.calcSkillPoints()
      this.updateCombatSkills()
      if (showToast) wx.showToast({ title: '已恢复未保存的草稿', icon: 'none' })
    })
  },

  // 页面隐藏/卸载时落地未存档草稿（App 进后台、跳转子页、返回关闭都会触发）
  onHide() {
    this.flushDraft()
  },

  onUnload() {
    this.flushDraft()
  },

  // 将当前编辑态写入本地草稿；已存档角色清掉可能残留的新建草稿
  flushDraft() {
    if (this._justSaved) return
    const character = this.data.character
    if (!character || !character.id) return
    if (getCharacterById(character.id)) {
      saveDraft(character)
      clearNewDraft()
    } else {
      saveNewDraft(character)
    }
  },

  // 更新战斗技能列表
  updateCombatSkills() {
    const { character } = this.data
    if (!character) return

    const combatSkills = []

    // 从 SKILLS 定义中获取所有战斗技能（含基础值）
    SKILLS.forEach(skill => {
      if (skill.category === '战斗') {
        let value = skill.baseValue
        // 如果有编辑过的值，使用编辑后的值
        if (character.skills && character.skills[skill.name] !== undefined) {
          value = character.skills[skill.name]
        }
        // 闪避特殊处理：基础值 = DEX/2
        if (skill.name === '闪避' && character.attributes && character.attributes.DEX) {
          value = Math.floor(character.attributes.DEX / 2)
        }
        combatSkills.push({
          name: skill.name,
          value: value,
          display: `${skill.name} ${value}`  // 用于picker显示：技能名+鉴定值
        })
      }
    })

    this.setData({ combatSkills })
  },

  // 基本信息输入
  onBaseInput(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value
    const character = { ...this.data.character, [field]: value }
    this.setData({ character })
  },

  // 显示性别选择器
  onShowGenderPicker() {
    this.setData({ showGenderPicker: true })
  },

  // 性别选择确认
  onGenderConfirm(e) {
    const index = e.detail.value
    const gender = this.data.genderOptions[index]
    const character = { ...this.data.character, gender }
    this.setData({ character, genderIndex: index, showGenderPicker: false })
  },

  // 性别选择取消
  onGenderCancel() {
    this.setData({ showGenderPicker: false })
  },

  // 属性值输入
  onAttrInput(e) {
    const { key } = e.currentTarget.dataset
    let value = parseInt(e.detail.value) || 0
    if (value > 99) value = 99
    if (value < 0) value = 0
    const attributes = { ...this.data.character.attributes, [key]: value }
    const character = { ...this.data.character, attributes }
    const derived = calcDerived(attributes)
    // 同步 HP/SAN/MP 满值变化时更新当前值（仅当当前值等于旧满值时跟随）
    const oldDerived = this.data.derived
    const combat = { ...character.combat }
    if (combat.hpCurrent === oldDerived.hp) combat.hpCurrent = derived.hp
    if (combat.sanCurrent === oldDerived.sanStart) combat.sanCurrent = derived.sanStart
    if (combat.mpCurrent === oldDerived.mp) combat.mpCurrent = derived.mp
    character.combat = combat
    this.setData({ character, derived }, () => { this.calcSkillPoints(); this.updateCombatSkills() })
  },

  // 战斗数值（HP/SAN/MP 当前值）输入
  onCombatInput(e) {
    const { field } = e.currentTarget.dataset
    let value = parseInt(e.detail.value) || 0
    if (value < 0) value = 0
    const combat = { ...this.data.character.combat, [field]: value }
    const character = { ...this.data.character, combat }
    this.setData({ character })
  },

  // 计算技能点数
  calcSkillPoints() {
    const { character } = this.data
    if (!character) {
      this.setData({ skillPoints: { occTotal: 0, intTotal: 0 } })
      return
    }
    const points = calcSkillPoints(character)
    this.setData({
      skillPoints: {
        occTotal: points.occTotal,
        intTotal: points.intTotal
      }
    })
  },

  // 随机骰所有属性
  onRollAll() {
    wx.showModal({
      title: '随机车卡',
      content: '将随机分配属性值（40、3个50、2个60、70、80），确定？',
      success: (res) => {
        if (res.confirm) {
          const attributes = rollAttributes()
          const character = { ...this.data.character, attributes }
          const derived = calcDerived(attributes)
          character.combat = { hpCurrent: derived.hp, sanCurrent: derived.sanStart, mpCurrent: derived.mp }
          this.setData({ character, derived }, () => { this.calcSkillPoints(); this.updateCombatSkills() })
          wx.showToast({ title: '骰子已投出！', icon: 'success' })
        }
      }
    })
  },

  // ── 武器管理 ──

  // 显示武器输入表单
  onAddWeapon() {
    this.setData({
      showWeaponForm: true,
      editingWeaponIndex: -1,
      weaponForm: { name: '', skillKey: '', skillValue: 0, damage: '' },
      skillIndex: -1,
      weaponIndex: -1,
      availableWeapons: []
    })
  },

  // 编辑武器（编辑模式下）
  onEditWeapon(e) {
    const { index } = e.currentTarget.dataset
    const w = this.data.character.weapons[index]
    this.setData({
      showWeaponForm: true,
      editingWeaponIndex: index,
      weaponForm: { 
        name: w.name, 
        skillKey: w.skillKey || '', 
        skillValue: w.skillValue || 0,
        damage: w.damage 
      }
    })
  },

  // 删除武器
  onDeleteWeapon(e) {
    const { index } = e.currentTarget.dataset
    wx.showModal({
      title: '删除武器',
      content: '确定删除这件武器？',
      confirmColor: '#c0392b',
      success: (res) => {
        if (res.confirm) {
          const weapons = this.data.character.weapons.filter((_, i) => i !== index)
          const character = { ...this.data.character, weapons }
          this.setData({ character, selectedWeaponIndex: -1 })
        }
      }
    })
  },

  // 武器表单输入
  onWeaponFormInput(e) {
    const { field } = e.currentTarget.dataset
    const weaponForm = { ...this.data.weaponForm, [field]: e.detail.value }
    this.setData({ weaponForm })
  },

  // 显示战斗技能选择器
  onShowCombatSkillPicker() {
    this.setData({ showCombatSkillPicker: true })
  },

  // 战斗技能选择确认
  onCombatSkillConfirm(e) {
    const index = e.detail.value
    const skill = this.data.combatSkills[index]
    if (skill) {
      // 根据技能加载可用武器列表
      const weapons = WEAPONS_BY_SKILL[skill.name] || []
      const availableWeapons = weapons.map(w => ({
        name: w.name,
        damage: w.damage,
        era: w.era,
        display: `${w.name} (${w.damage})`
      }))

      this.setData({
        skillIndex: index,
        weaponIndex: -1,
        availableWeapons,
        weaponForm: {
          ...this.data.weaponForm,
          skillKey: skill.name,
          skillValue: skill.value,
          name: '',
          damage: ''
        },
        showCombatSkillPicker: false
      })
    }
  },

  // 战斗技能选择取消
  onCombatSkillCancel() {
    this.setData({ showCombatSkillPicker: false })
  },

  // 显示武器选择器
  onShowWeaponPicker() {
    this.setData({ showWeaponPicker: true })
  },

  // 武器选择确认
  onWeaponConfirmFromPicker(e) {
    const index = e.detail.value
    const weapon = this.data.availableWeapons[index]
    if (weapon) {
      this.setData({
        weaponIndex: index,
        weaponForm: {
          ...this.data.weaponForm,
          name: weapon.name,
          damage: weapon.damage
        },
        showWeaponPicker: false
      })
    }
  },

  // 武器选择取消
  onWeaponCancelFromPicker() {
    this.setData({ showWeaponPicker: false })
  },

  // 确认保存武器
  onWeaponConfirm() {
    const { weaponForm, editingWeaponIndex, character } = this.data
    if (!weaponForm.skillKey) {
      wx.showToast({ title: '请选择战斗技能', icon: 'none' })
      return
    }
    if (!weaponForm.name.trim()) {
      wx.showToast({ title: '请填写武器名称', icon: 'none' })
      return
    }
    const w = {
      name: weaponForm.name.trim(),
      skillKey: weaponForm.skillKey,
      skillValue: weaponForm.skillValue,
      skillDisplay: `${weaponForm.skillValue}%`,
      damage: weaponForm.damage.trim() || '1d4'
    }
    const weapons = [...(character.weapons || [])]
    if (editingWeaponIndex >= 0) {
      weapons[editingWeaponIndex] = w
    } else {
      weapons.push(w)
    }
    this.setData({
      character: { ...character, weapons },
      showWeaponForm: false,
      weaponForm: { name: '', skillKey: '', skillValue: 0, damage: '' }
    })
    wx.showToast({ title: '武器已添加', icon: 'success' })
  },

  // 取消武器表单
  onWeaponCancel() {
    this.setData({
      showWeaponForm: false,
      weaponForm: { name: '', skillKey: '', skillValue: 0, damage: '' },
      skillIndex: -1,
      weaponIndex: -1,
      availableWeapons: []
    })
  },

  // 选择要展示的武器（保存后模式）
  onSelectWeaponDisplay(e) {
    const index = parseInt(e.detail.value)
    this.setData({ selectedWeaponIndex: index })
  },

  // 去职业选择
  onSelectOccupation() {
    const character = saveCharacter(this.data.character)
    this.setData({ character })
    wx.navigateTo({ url: `/pages/occupation/occupation?id=${character.id}` })
  },

  // 去技能编辑
  onEditSkills() {
    const character = this.data.character

    // 检查1：未选择职业 → 弹窗阻拦，跳转职业选择页
    if (!character.occupation) {
      wx.showModal({
        title: '请先选择职业',
        content: '编辑技能前需要先选择职业，职业决定了可分配的技能点。',
        confirmText: '去选择',
        showCancel: false,
        success: () => {
          const saved = saveCharacter(character)
          this.setData({ character: saved })
          wx.navigateTo({ url: `/pages/occupation/occupation?id=${saved.id}` })
        }
      })
      return
    }

    // 检查2：未填写属性 → 弹窗阻拦，滚动到属性区域
    const attrs = character.attributes || {}
    const hasAnyAttr = Object.values(attrs).some(v => v > 0)
    if (!hasAnyAttr) {
      wx.showModal({
        title: '请先填写属性',
        content: '技能点数由属性决定，请先填写属性值。',
        confirmText: '去填写',
        showCancel: false,
        success: () => {
          this.setData({ scrollTarget: 'attr-section' })
        }
      })
      return
    }

    const saved = saveCharacter(character)
    this.setData({ character: saved })
    wx.navigateTo({ url: `/pages/skills/skills?id=${saved.id}` })
  },

  // 去背景编辑
  onEditBackground() {
    const character = saveCharacter(this.data.character)
    this.setData({ character })
    wx.navigateTo({ url: `/pages/background/background?id=${character.id}` })
  },

  // 保存
  onSave() {
    const { name } = this.data.character
    if (!name || !name.trim()) {
      wx.showToast({ title: '请填写调查员姓名', icon: 'none' })
      return
    }
    const saved = saveCharacter(this.data.character)
    clearDraft(saved.id)
    clearNewDraft()
    this._justSaved = true
    saveThenBack({ title: '保存成功' })
  }
})

