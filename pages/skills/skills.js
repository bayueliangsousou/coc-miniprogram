// pages/skills/skills.js
const { SKILLS, getSkillsByCategory, OCCUPATIONS } = require('../../utils/coc-data')
const { getCharacterById, saveCharacter, calcSkillThresholds, calcSkillPoints } = require('../../utils/character')

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
    invalidSkillName: '',   // 有错误的技能名（空=全部合法）
    // 职业配置解析结果
    occConfig: {
      lockedSkills: [],     // 锁定的职业技能
      optionalCount: 0,     // 可选择的职业技能数量
      optionalSkills: []    // 用户已选择的可选职业技能
    }
  },

  onLoad(options) {
    this.setData({ characterId: options.id || '' })
    this.initSkills()
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
    let value = e.detail.value === '' ? '' : parseInt(e.detail.value)
    const { creditRatingRange, character } = this.data
    
    // 空值不处理
    if (value === '') {
      this.setData({ creditRatingValue: '' })
      return
    }
    
    if (creditRatingRange) {
      const [min, max] = creditRatingRange
      // 限制在职业信用评级区间内
      if (value < min) {
        value = min
      }
      if (value > max) {
        value = max
      }
    }
    
    // 更新角色数据
    const skills = { ...character.skills, '信用评级': value }
    const newCharacter = { ...character, skills }
    saveCharacter(newCharacter)
    
    this.setData({ creditRatingValue: value, character: newCharacter })
  },

  // 社会信用评级失去焦点时强制修正
  onCreditRatingBlur(e) {
    let value = parseInt(e.detail.value) || 0
    const { creditRatingRange, character } = this.data
    
    if (creditRatingRange) {
      const [min, max] = creditRatingRange
      let corrected = false
      
      if (value < min) {
        value = min
        corrected = true
      }
      if (value > max) {
        value = max
        corrected = true
      }
      
      if (corrected) {
        wx.showToast({ title: `已调整为 ${value}`, icon: 'none' })
      }
    }
    
    // 更新角色数据
    const skills = { ...character.skills, '信用评级': value }
    const newCharacter = { ...character, skills }
    saveCharacter(newCharacter)
    
    this.setData({ creditRatingValue: value, character: newCharacter })
  },

  // ── 输入中：只更新值 + 实时算剩余点数，不做任何校验拦截 ──
  onSkillInput(e) {
    const { name } = e.currentTarget.dataset
    const value = parseInt(e.detail.value) || 0
    const { skillCategories: oldCats, character } = this.data

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

    this.setData({ skillCategories, points: newPoints })
  },

  // ── 输入框失焦时：执行完整校验 ──
  onSkillBlur(e) {
    const { name } = e.currentTarget.dataset
    let value = parseInt(e.detail.value) || 0

    const { points, skillCategories: oldCats, occConfig, character } = this.data

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

    // 校验1：不能低于基础值
    if (value < baseValue) {
      error = `不能低于基础值 ${baseValue}`
      finalValue = baseValue
    }

    // 校验2：上限
    const max = (isLocked || isOptional) ? 85 : 50
    if (!error && value > max) {
      error = `${(isLocked || isOptional) ? '职业' : '兴趣'}技能最大${max}点`
      finalValue = max
    }

    // 校验3：可选技能名额
    if (!error && !isLocked && value > 50 && !isOptional) {
      const count = this.countOptionalSkillsOverThreshold(oldCats, occConfig.optionalSkills)
      if (count >= occConfig.optionalCount) {
        error = `可选技能已达${occConfig.optionalCount}门`
        finalValue = 50
      }
    }

    // 校验4：技能点余额（职业点不足时可用兴趣点补）
    if (!error) {
      const oldUsed = Math.max(0, oldCurrent - baseValue)
      const newUsed = Math.max(0, finalValue - baseValue)
      const delta = newUsed - oldUsed
      if (delta > 0) {
        if (isLocked || isOptional) {
          // 优先用职业点，不够时用兴趣点补
          const occAvailable = Math.max(0, points.occRemaining)
          const intAvailable = Math.max(0, points.intRemaining)
          const totalAvailable = occAvailable + intAvailable

          if (delta > totalAvailable) {
            // 两边都不够
            finalValue = baseValue + oldUsed + totalAvailable
            if (finalValue > 99) finalValue = 99
            error = '技能点不足'
          } else if (delta > occAvailable) {
            // 职业点不够但兴趣点够——允许，不报错
          }
        } else {
          if (delta > points.intRemaining) {
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

    // 有错误则标记该技能为非法状态（标红）
    this.setData({
      skillCategories,
      points: newPoints,
      invalidSkillName: error ? name : ''
    })

    if (error) {
      wx.showToast({ title: error, icon: 'none', duration: 2000 })
    }
  },

  // ── 输入框聚焦时：如果其他输入框有错误，拦截不让切走 ──
  onSkillFocus(e) {
    const { name } = e.currentTarget.dataset
    const { invalidSkillName } = this.data

    if (invalidSkillName && invalidSkillName !== name) {
      // 其他输入框有错误，拦截
      wx.showToast({ title: `请先修正「${invalidSkillName}」的数值`, icon: 'none', duration: 2000 })
      // 阻止焦点切换：通过 blur 当前触发的 focus 来实现
      // 小程序没有 preventDefault，但可以立即 blur 掉刚获得的焦点
      setTimeout(() => {
        // 让用户回到错误的输入框
      }, 100)
      return false
    }

    // 清除当前技能的错误标记（用户准备修改了）
    if (invalidSkillName === name) {
      this.setData({ invalidSkillName: '' })
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

        // 随机分配职业技能点（只分给职业技能）
        let occLeft = points.occRemaining
        if (occLeft > 0 && occSkills.length > 0) {
          occLeft = this._randomDistributePoints(cats, occSkills, occLeft)
        }

        // 随机分配兴趣技能点（只分给非职业技能）
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

        this.setData({ skillCategories: cats }, () => {
          this.calcPoints()
          wx.showToast({ title: '随机分配完成！', icon: 'success' })
        })
      }
    })
  },

  // 内部：将 totalPoints 随机分配到 skillList 对应的 cats 里，返回剩余点数
  _randomDistributePoints(cats, skillList, totalPoints, isOcc = false) {
    // 洗牌打乱顺序
    const shuffled = skillList.slice().sort(() => Math.random() - 0.5)
    let left = totalPoints

    shuffled.forEach(({ ci, si }) => {
      if (left <= 0) return
      const sk = cats[ci].skills[si]

      // 判断技能上限
      let max = isOcc ? 85 : 50
      if (sk.isLocked || sk.isOptional) {
        max = 85
      }

      const maxCanAdd = max - sk.current
      if (maxCanAdd <= 0) return

      // 随机分配 1 ~ min(left, maxCanAdd) 点
      // 确保不会超过剩余点数
      const add = Math.min(Math.floor(Math.random() * maxCanAdd) + 1, left)
      if (add > 0) {
        cats[ci].skills[si] = { ...sk, current: sk.current + add }
        left -= add
      }
    })

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

  onSave() {
    const { character, skillCategories, characterId, occConfig, invalidSkillName } = this.data

    // 如果有不合法的值，阻止保存
    if (invalidSkillName) {
      wx.showToast({ title: `请先修正「${invalidSkillName}」的数值`, icon: 'none', duration: 2000 })
      return
    }

    // 收集所有技能值
    const skills = {}
    skillCategories.forEach(cat => {
      cat.skills.forEach(sk => {
        skills[sk.name] = sk.current
      })
    })
    // 保存可选技能信息
    const updated = {
      ...character,
      skills,
      optionalSkills: occConfig.optionalSkills
    }
    saveCharacter(updated)
    wx.showToast({ title: '技能已保存', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 600)
  }
})
