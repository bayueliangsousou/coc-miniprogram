// pages/skills/skills.js
const { SKILLS, getSkillsByCategory, OCCUPATIONS } = require('../../utils/coc-data')
const { getCharacterById, saveCharacter, calcSkillThresholds, calcSkillPoints } = require('../../utils/character')
const { saveThenBack } = require('../../utils/nav')

Page({
  data: {
    characterId: '',
    character: null,
    skillCategories: [],    // [{category, skills:[{name, baseValue, current, ...}]}]
    occupationSkills: [],   // 当前职业的技能名列表
    searchText: '',
    searchMatches: [],   // 匹配的技能名列表，按分类顺序排列
    searchIndex: -1,     // 当前定位到第几个（0-based），-1表示无定位
    scrollToSkill: '',   // scroll-into-view 目标 id
    expandedCategories: {}, // {category: true/false}
    pointFormula: '',      // 职业技能点数公式
    points: {             // 技能点数信息（与 calcSkillPoints 返回值匹配）
      occTotal: 0,
      occUsed: 0,
      occRemaining: 0,
      intTotal: 0,
      intUsed: 0,
      intRemaining: 0,
      total: 0,
      used: 0,
      remaining: 0
    },
    // 校验错误状态
    invalidSkills: {},     // { skillName: errorMsg } 多个技能可同时标红
    // 职业配置解析结果
    occConfig: {
      lockedSkills: [],     // 锁定的职业技能
      optionalCount: 0,     // 可选择的职业技能数量
      optionalSkills: []    // 用户已选择的可选职业技能
    },
    // 新建技能弹窗
    showNewSkillModal: false,
    newSkillName: '',
    newSkillValue: '',
    creditRatingError: false
  },

  onLoad(options) {
    this.setData({ characterId: options.id || '' })
    this.initSkills()
    // 启用页面离开确认
    wx.enableAlertBeforeUnload({
      message: '您有未保存的修改，确定要离开吗？'
    })
  },

  onShow() {
    this.initSkills()
  },

  initSkills() {
    const { characterId } = this.data
    const character = getCharacterById(characterId)
    if (!character) return

    // 找当前职业技能
    const occ = OCCUPATIONS.find(o => o.id === character.occupationId)
    const occupationSkills = occ ? occ.skills : []
    const pointFormula = occ ? occ.pointFormula : ''
    const creditRatingRange = occ ? occ.creditRating : null
    const creditRatingValue = character.skills['信用评级'] || 0

    // 解析职业配置
    const occConfig = this.parseOccupationConfig(occ)
    // 从存储加载用户已选择的可选职业技能
    const savedOptionalSkills = character.optionalSkills || []

    // 构建技能列表，合并角色已有值
    const skillsByCat = getSkillsByCategory()
    const skillCategories = Object.keys(skillsByCat).map(category => {
      const skills = skillsByCat[category]
        .filter(sk => sk.name !== '信用评级') // 信用评级由顶部独立区域管理，不在列表中重复显示
        .map(sk => {
        // 闪避特殊处理：基础值 = DEX/2
        let baseValue = sk.baseValue
        if (sk.name === '闪避') baseValue = Math.floor((character.attributes.DEX || 0) / 2)
        if (sk.name === '母语') baseValue = character.attributes.EDU || 0

        const current = character.skills[sk.name] !== undefined
          ? character.skills[sk.name]
          : baseValue

        const thresholds = calcSkillThresholds(current)
        const isOccSkill = occupationSkills.some(os => os.includes(sk.name.split('（')[0]))

        // 判断是否为锁定职业技能
        const isLocked = this.isLockedSkill(sk.name, occConfig.lockedSkills)
        // 判断是否为用户选择的可选职业技能
        const isOptional = savedOptionalSkills.includes(sk.name)

        return {
          ...sk,
          baseValue,
          current,
          hard: thresholds.hard,
          extreme: thresholds.extreme,
          isOccSkill,
          isLocked,
          isOptional
        }
      })
      return { category, skills }
    })

    // 加载自定义「其他语言（XX）」技能：character.skills 里有但标准列表里没有的
    Object.keys(character.skills).forEach(skillName => {
      // 检查是否已出现在 skillCategories 中
      let exists = false
      skillCategories.forEach(cat => {
        cat.skills.forEach(sk => {
          if (sk.name === skillName) exists = true
        })
      })
      if (exists) return

      // 仅处理「其他语言（XX）」格式
      if (!skillName.match(/^其他语言（.+）$/)) return

      const current = character.skills[skillName]
      const thresholds = calcSkillThresholds(current)
      const cat = skillCategories.find(c => c.category === '知识')
      if (cat) {
        cat.skills.push({
          name: skillName,
          baseValue: 1,
          current,
          hard: thresholds.hard,
          extreme: thresholds.extreme,
          isOccSkill: false,
          isLocked: false,
          isOptional: false,
          isCustom: true
        })
      }
    })

    // 加载通过「新技能」创建的自定义职业技能
    const customSkills = character.customSkills || []
    customSkills.forEach(cs => {
      // 检查是否已存在
      let exists = false
      skillCategories.forEach(cat => {
        cat.skills.forEach(sk => {
          if (sk.name === cs.name) exists = true
        })
      })
      if (exists) return

      const current = character.skills[cs.name] || 0
      const thresholds = calcSkillThresholds(current)
      // 自建技能放到「其他」分类
      let otherCat = skillCategories.find(c => c.category === '其他')
      if (!otherCat) {
        otherCat = { category: '其他', skills: [] }
        skillCategories.push(otherCat)
      }
      otherCat.skills.unshift({
        name: cs.name,
        baseValue: cs.baseValue || 0,
        current,
        hard: thresholds.hard,
        extreme: thresholds.extreme,
        isOccSkill: cs.isOccSkill,
        isLocked: false,
        isOptional: false,
        isCustom: true
      })
    })

    // 固定分类展示顺序
    const CATEGORY_ORDER = ['侦查', '社交', '知识', '技术', '运动', '科学', '艺术', '战斗', '其他']
    skillCategories.sort((a, b) => {
      const idxA = CATEGORY_ORDER.indexOf(a.category)
      const idxB = CATEGORY_ORDER.indexOf(b.category)
      if (idxA === -1 && idxB === -1) return 0
      if (idxA === -1) return 1
      if (idxB === -1) return -1
      return idxA - idxB
    })

    // 默认展开所有分类
    const expandedCategories = {}
    skillCategories.forEach(c => { expandedCategories[c.category] = true })

    this.setData({
      character,
      skillCategories,
      occupationSkills,
      expandedCategories,
      pointFormula,
      creditRatingRange,
      creditRatingValue,
      occConfig: {
        ...occConfig,
        optionalSkills: savedOptionalSkills
      }
    })
    // 计算技能点数
    this.calcPoints()
  },

  // 计算技能点数
  calcPoints() {
    const { character, skillCategories } = this.data
    if (!character) return

    // 构建临时技能对象
    const tempSkills = {}
    skillCategories.forEach(cat => {
      cat.skills.forEach(sk => {
        tempSkills[sk.name] = sk.current
      })
    })

    const tempCharacter = { ...character, skills: tempSkills }
    const points = calcSkillPoints(tempCharacter)

    this.setData({ points })
  },

  // 解析职业配置
  parseOccupationConfig(occ) {
    if (!occ || !occ.skills) {
      return { lockedSkills: [], optionalCount: 0 }
    }

    const lockedSkills = []
    let optionalCount = 0

    occ.skills.forEach(skill => {
      // 解析 "点X门技能"
      if (skill.includes('点') && skill.includes('门技能')) {
        const match = skill.match(/点(\d+)门技能/)
        if (match) {
          optionalCount = parseInt(match[1])
        }
      } else {
        // 其他都是锁定技能（包括"任一"类型的）
        lockedSkills.push(skill)
      }
    })

    return { lockedSkills, optionalCount }
  },

  // 判断技能是否为锁定职业技能
  isLockedSkill(skillName, lockedSkills) {
    return lockedSkills.some(locked => {
      // 处理 "艺术与手艺（任一）" vs "艺术与手艺（摄影）"
      const lockedBase = locked.split('（')[0].split('(')[0]
      const skillBase = skillName.split('（')[0].split('(')[0]
      return lockedBase === skillBase
    })
  },

  // 判断技能是否为用户选择的可选职业技能
  isOptionalSkill(skillName) {
    const { occConfig } = this.data
    return occConfig.optionalSkills.includes(skillName)
  },

  // 获取技能的最大值
  getSkillMax(skill) {
    // 如果是锁定职业技能，或用户选择的可选职业技能，上限85
    if (skill.isLocked || skill.isOptional) {
      return 85
    }
    // 非职业技能，上限50
    return 50
  },

  onToggleCategory(e) {
    const { category } = e.currentTarget.dataset
    const expandedCategories = { ...this.data.expandedCategories }
    expandedCategories[category] = !expandedCategories[category]
    this.setData({ expandedCategories })
  },

  // 社会信用评级输入
  onCreditRatingInput(e) {
    // 输入中只更新显示值，不做校验拦截
    const raw = e.detail.value
    const value = raw === '' ? '' : parseInt(raw)
    this.setData({ creditRatingValue: value, creditRatingError: false })
  },

  // 社会信用评级失去焦点时校验修正
  onCreditRatingBlur(e) {
    const raw = e.detail.value
    let value = raw === '' ? 0 : parseInt(raw)
    const { creditRatingRange, character } = this.data

    let hasError = false

    // 空值校验
    if (raw === '' || raw === undefined || raw === null) {
      hasError = true
    }

    if (creditRatingRange) {
      const [min, max] = creditRatingRange
      if (value < min || value > max) {
        hasError = true
        // 自动修正
        if (value < min) value = min
        if (value > max) value = max
      }
    }

    this.setData({ creditRatingError: hasError })

    // 更新角色数据
    const skills = { ...character.skills, '信用评级': value }
    const newCharacter = { ...character, skills }
    saveCharacter(newCharacter)

    this.setData({ creditRatingValue: value, character: newCharacter }, () => this.calcPoints())
  },

  // ── 输入中：只更新值 + 实时算剩余点数，不做任何校验拦截 ──
  onSkillInput(e) {
    const { name } = e.currentTarget.dataset
    const value = parseInt(e.detail.value) || 0
    const { skillCategories: oldCats, character, invalidSkills } = this.data

    // 清除该技能的错误标记
    const newInvalidSkills = { ...invalidSkills }
    delete newInvalidSkills[name]

    // 直接用输入值更新，不做任何截断或限制
    const skillCategories = oldCats.map(cat => ({
      ...cat,
      skills: cat.skills.map(sk => {
        if (sk.name !== name) return sk
        const thresholds = calcSkillThresholds(value)
        return { ...sk, current: value, hard: thresholds.hard, extreme: thresholds.extreme }
      })
    }))

    // 同步计算剩余点数
    const tempSkills = {}
    skillCategories.forEach(cat => {
      cat.skills.forEach(sk => { tempSkills[sk.name] = sk.current })
    })
    const newPoints = calcSkillPoints({ ...character, skills: tempSkills })

    this.setData({ skillCategories, points: newPoints, invalidSkills: newInvalidSkills })
  },

  // ── 输入框失焦时：执行完整校验 ──
  onSkillBlur(e) {
    const { name } = e.currentTarget.dataset
    let value = parseInt(e.detail.value) || 0

    const { points, skillCategories: oldCats, occConfig, character, invalidSkills } = this.data

    let baseValue = 0, oldCurrent = 0
    let isLocked = false, isOptional = false

    oldCats.forEach(cat => {
      cat.skills.forEach(sk => {
        if (sk.name === name) {
          baseValue = sk.baseValue
          oldCurrent = sk.current
          isLocked = sk.isLocked
          isOptional = sk.isOptional
        }
      })
    })

    let error = ''       // 错误信息
    let finalValue = value

    // 校验1：不能低于基础值 → 自动修正到基础值
    if (value < baseValue) {
      error = `不能低于基础值 ${baseValue}`
      finalValue = baseValue
    }

    // 校验2：超过上限 → 自动修正到基础值（重置）
    const max = (isLocked || isOptional) ? 85 : 50
    if (!error && value > max) {
      error = `${(isLocked || isOptional) ? '职业' : '兴趣'}技能最大${max}点`
      finalValue = baseValue
    }

    // 校验3：可选技能名额已满 → 自动修正到基础值
    if (!error && !isLocked && value > 50 && !isOptional) {
      const count = this.countOptionalSkillsOverThreshold(oldCats, occConfig.optionalSkills)
      if (count >= occConfig.optionalCount) {
        error = `可选技能已达${occConfig.optionalCount}门`
        finalValue = baseValue
      }
    }

    // 校验4：职业点+兴趣点都不够 → 花光所有剩余点
    if (!error) {
      const oldUsed = Math.max(0, oldCurrent - baseValue)
      const newUsed = Math.max(0, finalValue - baseValue)
      const delta = newUsed - oldUsed
      if (delta > 0) {
        if (isLocked || isOptional) {
          const occAvailable = Math.max(0, points.occRemaining)
          const intAvailable = Math.max(0, points.intRemaining)
          const totalAvailable = occAvailable + intAvailable

          if (delta > totalAvailable) {
            // 花光所有剩余点
            finalValue = baseValue + oldUsed + totalAvailable
            if (finalValue > 99) finalValue = 99
            error = '技能点不足'
          } else if (delta > occAvailable) {
            // 职业点不够但兴趣点够——允许
          }
        } else {
          if (delta > points.intRemaining) {
            // 花光所有剩余兴趣点
            const allowed = Math.max(0, points.intRemaining)
            finalValue = baseValue + oldUsed + allowed
            if (finalValue > 99) finalValue = 99
            error = '兴趣技能点不足'
          }
        }
      }
    }

    // 更新值（可能被修正）
    const skillCategories = oldCats.map(cat => ({
      ...cat,
      skills: cat.skills.map(sk => {
        if (sk.name !== name) return sk
        const thresholds = calcSkillThresholds(finalValue)
        return { ...sk, current: finalValue, hard: thresholds.hard, extreme: thresholds.extreme }
      })
    }))

    // 重算剩余点数
    const tempSkills = {}
    skillCategories.forEach(cat => {
      cat.skills.forEach(sk => { tempSkills[sk.name] = sk.current })
    })
    const newPoints = calcSkillPoints({ ...character, skills: tempSkills })

    // 更新错误标记（支持多个技能同时标红）
    const newInvalidSkills = { ...invalidSkills }
    if (error) {
      newInvalidSkills[name] = error
    } else {
      delete newInvalidSkills[name]
    }

    this.setData({
      skillCategories,
      points: newPoints,
      invalidSkills: newInvalidSkills
    })
  },

  // ── 输入框聚焦时：清除该技能的错误标记 ──
  onSkillFocus(e) {
    const { name } = e.currentTarget.dataset
    const { invalidSkills } = this.data
    if (invalidSkills[name]) {
      const newInvalidSkills = { ...invalidSkills }
      delete newInvalidSkills[name]
      this.setData({ invalidSkills: newInvalidSkills })
    }
  },

  // 统计已超过50的可选技能数量
  countOptionalSkillsOverThreshold(skillCategories, optionalSkills) {
    let count = 0
    skillCategories.forEach(cat => {
      cat.skills.forEach(sk => {
        // 如果这个技能在可选技能列表中，且当前值>50
        if (optionalSkills.includes(sk.name) && sk.current > 50) {
          count++
        }
      })
    })
    return count
  },

  // 标记技能为可选职业技能
  markAsOptionalSkill(skillName) {
    const { occConfig } = this.data
    const optionalSkills = [...occConfig.optionalSkills]

    if (!optionalSkills.includes(skillName)) {
      optionalSkills.push(skillName)

      this.setData({
        'occConfig.optionalSkills': optionalSkills
      })

      // 同时更新 character 中的 optionalSkills
      const { character } = this.data
      const updatedCharacter = {
        ...character,
        optionalSkills
      }
      saveCharacter(updatedCharacter)
      this.setData({ character: updatedCharacter })

      wx.showToast({
        title: `已标记为职业技能`,
        icon: 'success',
        duration: 1500
      })
    }
  },

  // 随机分配技能点
  onRandomDistribute() {
    const { points, skillCategories } = this.data
    if (!points || (points.occTotal === 0 && points.intTotal === 0)) {
      wx.showToast({ title: '请先选择职业并设置属性', icon: 'none' })
      return
    }

    wx.showModal({
      title: '随机分配技能点',
      content: `将随机把 ${points.occRemaining} 点职业技能点和 ${points.intRemaining} 点兴趣技能点分配出去，确定？`,
      confirmText: '随机分配',
      success: (res) => {
        if (!res.confirm) return

        // 深拷贝技能列表
        let cats = skillCategories.map(cat => ({
          ...cat,
          skills: cat.skills.map(sk => ({ ...sk }))
        }))

        // 分离职业技能和全部技能（可用兴趣点的）
        const occSkills = []   // 可分职业点的技能
        const allSkills = []   // 可分兴趣点的技能（所有）

        cats.forEach((cat, ci) => {
          cat.skills.forEach((sk, si) => {
            if (sk.isOccSkill) occSkills.push({ ci, si, sk })
            allSkills.push({ ci, si, sk })
          })
        })

        // 第一步：先随机设置社会信用评级（消耗职业技能点，需先占位）
        const { creditRatingRange, character } = this.data
        let newCreditRating = character.skills['信用评级'] || 0
        let occLeft = points.occRemaining
        if (creditRatingRange && creditRatingRange.length === 2) {
          const [min, max] = creditRatingRange
          const creditBase = min  // 基础值 = 区间最小值
          // 在区间内随机，但受剩余职业点约束
          const maxByPoints = Math.min(max, creditBase + occLeft)
          if (maxByPoints >= min) {
            newCreditRating = Math.floor(Math.random() * (maxByPoints - min + 1)) + min
          } else {
            newCreditRating = min  // 点数不足，给最低值
          }
          // 扣除信用评级超过基础值的部分（消耗职业点）
          const creditPointsUsed = Math.max(0, newCreditRating - creditBase)
          occLeft -= creditPointsUsed
        }

        // 第二步：随机分配职业技能点（只分给职业技能）
        if (occLeft > 0 && occSkills.length > 0) {
          occLeft = this._randomDistributePoints(cats, occSkills, occLeft)
        }

        // 第三步：随机分配兴趣技能点（只分给非职业技能）
        let intLeft = points.intRemaining
        if (intLeft > 0 && allSkills.length > 0) {
          // 只收集非职业技能
          const intSkills = []
          cats.forEach((cat, ci) => {
            cat.skills.forEach((sk, si) => {
              if (!sk.isOccSkill) {
                intSkills.push({ ci, si })
              }
            })
          })
          intLeft = this._randomDistributePoints(cats, intSkills, intLeft)
        }

        // 重新计算困难/极难阈值
        cats = cats.map(cat => ({
          ...cat,
          skills: cat.skills.map(sk => {
            const t = calcSkillThresholds(sk.current)
            return { ...sk, hard: t.hard, extreme: t.extreme }
          })
        }))

        const newSkills = { ...character.skills, '信用评级': newCreditRating }
        const newCharacter = { ...character, skills: newSkills }

        this.setData({ skillCategories: cats, creditRatingValue: newCreditRating, character: newCharacter, invalidSkills: {}, creditRatingError: false }, () => {
          this.calcPoints()
          wx.showToast({ title: '随机分配完成！', icon: 'success' })
        })
      }
    })
  },

  // 内部：将 totalPoints 随机分配到 skillList 对应的 cats 里，返回剩余点数
  _randomDistributePoints(cats, skillList, totalPoints, isOcc = false) {
    let left = totalPoints
    const maxRounds = 20  // 防死循环

    for (let round = 0; round < maxRounds && left > 0; round++) {
      // 每轮洗牌
      const shuffled = skillList.slice().sort(() => Math.random() - 0.5)
      let added = false

      for (const { ci, si } of shuffled) {
        if (left <= 0) break
        const sk = cats[ci].skills[si]

        // 判断技能上限
        let max = isOcc ? 85 : 50
        if (sk.isLocked || sk.isOptional) {
          max = 85
        }

        const maxCanAdd = max - sk.current
        if (maxCanAdd <= 0) continue

        // 随机分配 1 ~ min(left, maxCanAdd) 点
        const add = Math.min(Math.floor(Math.random() * maxCanAdd) + 1, left)
        if (add > 0) {
          cats[ci].skills[si] = { ...sk, current: sk.current + add }
          left -= add
          added = true
        }
      }

      // 本轮没有任何技能能加点，退出
      if (!added) break
    }

    return left
  },

  onSearch(e) {
    const text = e.detail.value.trim()
    if (!text) {
      this.setData({ searchText: '', searchMatches: [], searchIndex: -1, scrollToSkill: '' })
      return
    }
    const matches = this._buildSearchMatches(text)
    const newIndex = matches.length > 0 ? 0 : -1
    this.setData({
      searchText: text,
      searchMatches: matches,
      searchIndex: newIndex,
      scrollToSkill: newIndex >= 0 ? 'skill-' + matches[newIndex] : ''
    })
  },

  // 点击搜索框右侧数字/箭头，切换到下一个匹配
  onSearchNext() {
    const { searchMatches, searchIndex } = this.data
    if (searchMatches.length === 0) return
    const next = (searchIndex + 1) % searchMatches.length
    this.setData({
      searchIndex: next,
      scrollToSkill: 'skill-' + searchMatches[next]
    })
  },

  // 构建按分类顺序的匹配技能名列表
  _buildSearchMatches(text) {
    const { skillCategories } = this.data
    const matches = []
    skillCategories.forEach(cat => {
      cat.skills.forEach(sk => {
        if (sk.name.indexOf(text) !== -1) {
          matches.push(sk.name)
        }
      })
    })
    return matches
  },

  // 全局校验：检查所有错误，返回错误列表
  validateAll() {
    const { skillCategories, points, creditRatingRange, creditRatingValue } = this.data
    const errors = []

    // 1. 检查已标记的技能错误
    const { invalidSkills } = this.data
    Object.keys(invalidSkills).forEach(name => {
      errors.push(`「${name}」${invalidSkills[name]}`)
    })

    // 2. 检查技能点负值
    if (points.occRemaining < 0) {
      errors.push(`职业技能点超出 ${Math.abs(points.occRemaining)} 点`)
    }
    if (points.intRemaining < 0) {
      errors.push(`兴趣技能点超出 ${Math.abs(points.intRemaining)} 点`)
    }

    // 3. 检查信用评级
    if (creditRatingRange) {
      if (creditRatingValue === '' || creditRatingValue === undefined || creditRatingValue === null) {
        errors.push('社会信用评级不能为空')
      } else {
        const [min, max] = creditRatingRange
        const val = parseInt(creditRatingValue) || 0
        if (val < min || val > max) {
          errors.push(`信用评级应在 ${min}~${max} 之间`)
        }
      }
    }

    // 4. 逐技能重新校验（防止漏检）
    skillCategories.forEach(cat => {
      cat.skills.forEach(sk => {
        if (sk.current < sk.baseValue) {
          const err = `「${sk.name}」低于基础值 ${sk.baseValue}`
          if (!errors.some(e => e.includes(`「${sk.name}」`))) {
            errors.push(err)
          }
        }
      })
    })

    return errors
  },

  onSave() {
    const { character, skillCategories, characterId, occConfig } = this.data

    // 全局校验
    const errors = this.validateAll()
    if (errors.length > 0) {
      const errorList = errors.map((e, i) => `${i + 1}. ${e}`).join('\n')
      wx.showModal({
        title: '数据有误',
        content: errorList,
        showCancel: true,
        cancelText: '返回修改',
        confirmText: '强制保存',
        success: (res) => {
          if (!res.confirm) return
          // 强制保存
          this._doSave(character, skillCategories, occConfig)
        }
      })
      return
    }

    this._doSave(character, skillCategories, occConfig)
  },

  _doSave(character, skillCategories, occConfig) {
    // 收集所有技能值
    const skills = {}
    skillCategories.forEach(cat => {
      cat.skills.forEach(sk => {
        let name = sk.name
        // 「其他语言」如果填了语言名，保存为「其他语言（XX）」
        if (name === '其他语言' && sk.languageName) {
          name = `其他语言（${sk.languageName}）`
        }
        skills[name] = sk.current
      })
    })
    // 保存可选技能信息
    const updated = {
      ...character,
      skills,
      optionalSkills: occConfig.optionalSkills
    }
    saveCharacter(updated)
    saveThenBack({ title: '技能已保存' })
  },

  // 其他语言名称输入
  onLanguageNameInput(e) {
    const langName = e.detail.value.trim()
    const skillCategories = this.data.skillCategories.map(cat => {
      return {
        ...cat,
        skills: cat.skills.map(sk => {
          if (sk.name === '其他语言') {
            return { ...sk, languageName: langName }
          }
          return sk
        })
      }
    })
    this.setData({ skillCategories })
  },

  // ========== 新建职业技能弹窗 ==========
  onShowNewSkill() {
    this.setData({ showNewSkillModal: true, newSkillName: '', newSkillValue: '' })
  },

  onNewSkillNameInput(e) {
    this.setData({ newSkillName: e.detail.value })
  },

  onNewSkillValueInput(e) {
    this.setData({ newSkillValue: e.detail.value })
  },

  onConfirmNewSkill() {
    const name = this.data.newSkillName.trim()
    const val = parseInt(this.data.newSkillValue, 10)

    if (!name) {
      wx.showToast({ title: '请输入技能名称', icon: 'none' })
      return
    }
    if (isNaN(val) || val < 1) {
      wx.showToast({ title: '请输入有效数值', icon: 'none' })
      return
    }

    // 检查是否已存在
    let exists = false
    this.data.skillCategories.forEach(cat => {
      cat.skills.forEach(sk => {
        if (sk.name === name) exists = true
      })
    })
    if (exists) {
      wx.showToast({ title: '该技能已存在', icon: 'none' })
      return
    }

    // 检查职业点数是否足够
    const { points } = this.data
    if (points.occRemaining < val) {
      wx.showToast({ title: '职业技能点数不足', icon: 'none' })
      return
    }

    const thresholds = calcSkillThresholds(val)

    // 新建技能插入到第一个分类（侦查）的最前面
    const skillCategories = this.data.skillCategories.map((cat, idx) => {
      if (idx === 0) {
        return {
          ...cat,
          skills: [
            {
              name,
              baseValue: 0,
              current: val,
              hard: thresholds.hard,
              extreme: thresholds.extreme,
              isOccSkill: true,
              isLocked: false,
              isOptional: false,
              isCustom: true
            },
            ...cat.skills
          ]
        }
      }
      return cat
    })

    // 保存自定义技能信息到 character
    const character = { ...this.data.character }
    character.customSkills = character.customSkills || []
    character.customSkills.push({ name, baseValue: 0, isOccSkill: true })
    character.skills = character.skills || {}
    character.skills[name] = val

    this.setData({
      skillCategories,
      character,
      showNewSkillModal: false,
      newSkillName: '',
      newSkillValue: ''
    }, () => {
      this.calcPoints()
      this.setData({ scrollToSkill: `skill-${name}` })
    })
  },

  onCancelNewSkill() {
    this.setData({ showNewSkillModal: false, newSkillName: '', newSkillValue: '' })
  },

  onDeleteCustomSkill(e) {
    const name = e.currentTarget.dataset.name
    wx.showModal({
      title: '删除技能',
      content: `确定删除「${name}」？`,
      success: (res) => {
        if (!res.confirm) return
        const skillCategories = this.data.skillCategories.map(cat => {
          return {
            ...cat,
            skills: cat.skills.filter(sk => sk.name !== name)
          }
        })
        // 同时从 character.skills 中删除
        const character = { ...this.data.character }
        delete character.skills[name]
        saveCharacter(character)
        this.setData({ skillCategories, character }, () => {
          this.calcPoints()
        })
      }
    })
  },

  preventBubble() {}
})
