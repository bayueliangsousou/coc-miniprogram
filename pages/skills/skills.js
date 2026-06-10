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
      optionalCount: 0,     // 全局自选名额（动态逻辑用）
      categoryLimits: {}    // 分类限制：{ '社交': 1, '艺术': 1, '科学': 2 }
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

    // 清理旧数据：删除 optionalSkills（手动选择逻辑已废弃）
    if (character.optionalSkills) {
      delete character.optionalSkills
      saveCharacter(character)
    }

    // 找当前职业技能
    const occ = OCCUPATIONS.find(o => o.id === character.occupationId)
    const occupationSkills = occ ? occ.skills : []
    const pointFormula = occ ? occ.pointFormula : ''
    const creditRatingRange = occ ? occ.creditRating : null
    const creditRatingValue = character.skills['信用评级'] || 0

    // 解析职业配置
    const occConfig = this.parseOccupationConfig(occ)

    // 构建技能列表，合并角色已有值
    const skillsByCat = getSkillsByCategory()
    let skillCategories = Object.keys(skillsByCat).map(category => {
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

        return {
          ...sk,
          baseValue,
          current,
          hard: thresholds.hard,
          extreme: thresholds.extreme,
          isOccSkill,
          isLocked
        }
      })
      return { category, skills }
    })

    // 计算 displayAsOcc（用于样式：五角星 + 金色）
    // 注意：必须传 occConfig 参数，不能依赖 this.data.occConfig（还没写入）
    skillCategories = this.updateSkillDisplayState(skillCategories, occConfig)

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
        isCustom: true
      })
    })

    // 固定分类展示顺序
    const CATEGORY_ORDER = ['调查', '社交', '知识', '技术', '运动', '科学', '艺术', '战斗', '其他']
    skillCategories.sort((a, b) => {
      const idxA = CATEGORY_ORDER.indexOf(a.category)
      const idxB = CATEGORY_ORDER.indexOf(b.category)
      if (idxA === -1 && idxB === -1) return 0
      if (idxA === -1) return 1
      if (idxB === -1) return -1
      return idxA - idxB
    })

    // 重新计算 displayAsOcc 和 limitText（包含自定义技能）
    skillCategories = this.updateSkillDisplayState(skillCategories, this.data.occConfig)

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
      occConfig
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
    const extraOccSkills = []
    skillCategories.forEach(cat => {
      cat.skills.forEach(sk => {
        if (sk.displayAsOcc) extraOccSkills.push(sk.name)
      })
    })
    const points = calcSkillPoints(tempCharacter, extraOccSkills)

    this.setData({ points })
  },

  // 解析职业配置
  parseOccupationConfig(occ) {
    if (!occ || !occ.skills) {
      return { lockedSkills: [], optionalCount: 0, categoryLimits: {} }
    }

    const lockedSkills = []
    let optionalCount = 0
    const categoryLimits = {}

    occ.skills.forEach(skill => {
      // 解析 "点X门技能"
      if (skill.includes('点') && skill.includes('门技能')) {
        const match = skill.match(/点([一二三四五六七八九十\d]+)门技能/)
        if (match) {
          optionalCount = this.parseChineseNum(match[1])
        }
      } else if (skill.includes('社交技能')) {
        // 解析 "一项社交技能（取悦、话术、恐吓、说服）"
        const match = skill.match(/([一二两三四五六七八九\d]+).*社交技能/)
        if (match) {
          categoryLimits['社交'] = this.parseChineseNum(match[1])
        }
      } else if (skill.includes('艺术与手艺（任一）')) {
        categoryLimits['艺术'] = 1
      } else if (skill.includes('科学（专业，两种）')) {
        categoryLimits['科学'] = 2
      } else if (skill.includes('科学（化学或生物）')) {
        categoryLimits['科学'] = 1
      } else {
        // 其他都是锁定技能
        lockedSkills.push(skill)
      }
    })

    return { lockedSkills, optionalCount, categoryLimits }
  },

  // 中文数字转阿拉伯数字
  parseChineseNum(str) {
    const map = { '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 }
    return map[str] || parseInt(str) || 0
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

  // 更新所有技能的 displayAsOcc 状态（是否显示为职业技能样式）
  // 接收 occConfig 参数，避免依赖 this.data.occConfig 的时序问题
  updateSkillDisplayState(skillCategories, occConfig) {

    // 1. 计算分类限制覆盖的技能
    const categoryOccupied = new Set()
    skillCategories.forEach(cat => {
      const limit = occConfig.categoryLimits[cat.category]
      if (limit) {
        const over50 = cat.skills
          .filter(sk => sk.current > 50 && !sk.isLocked)
          .sort((a, b) => b.current - a.current)
        over50.slice(0, limit).forEach(sk => categoryOccupied.add(sk.name))
      }
    })

    // 2. 计算全局自选覆盖的技能
    const globalOccupied = new Set()
    if (occConfig.optionalCount > 0) {
      const allOver50 = []
      skillCategories.forEach(cat => {
        cat.skills.forEach(sk => {
          if (sk.current > 50 && !sk.isLocked && !categoryOccupied.has(sk.name)) {
            allOver50.push(sk)
          }
        })
      })
      allOver50.sort((a, b) => b.current - a.current)
      allOver50.slice(0, occConfig.optionalCount).forEach(sk => globalOccupied.add(sk.name))
    }

    // 3. 计算全局剩余名额
    const globalUsed = globalOccupied.size
    const globalRemaining = Math.max(0, occConfig.optionalCount - globalUsed)

    // 4. 更新每个技能的 displayAsOcc 和分类的 limitText
    return skillCategories.map(cat => {
      const catLimit = occConfig.categoryLimits[cat.category]
      let limitText = ''

      if (catLimit) {
        limitText = `（需选${catLimit}）`
      }

      if (occConfig.optionalCount > 0) {
        limitText = `（所有技能里选${globalRemaining}个作为职业技能）`
      }

      return {
        ...cat,
        limitText,
        skills: cat.skills.map(sk => {
          // isLocked 的技能始终显示为职业技能样式（金色+★）
          // 自选职业技能需要 current > 50
          const displayAsOcc = sk.isLocked || (
            sk.current > 50 && (
              categoryOccupied.has(sk.name) ||
              globalOccupied.has(sk.name)
            )
          )
          return { ...sk, displayAsOcc }
        })
      }
    })
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

  // ── 输入中：只更新显示值，不截断不校验（失焦时统一处理）──
  onSkillInput(e) {
    const { name } = e.currentTarget.dataset
    const value = parseInt(e.detail.value) || 0

    const { skillCategories: oldCats, character } = this.data

    // 找到当前技能的基础值
    let baseValue = 0, oldCurrent = 0
    oldCats.forEach(cat => {
      cat.skills.forEach(sk => {
        if (sk.name === name) {
          baseValue = sk.baseValue
          oldCurrent = sk.current
        }
      })
    })

    // 基础值是硬下限，输入中仅此一项保护
    const current = Math.max(value, baseValue)
    const thresholds = calcSkillThresholds(current)

    const skillCategories = oldCats.map(cat => ({
      ...cat,
      skills: cat.skills.map(sk => {
        if (sk.name !== name) return sk
        return { ...sk, current, hard: thresholds.hard, extreme: thresholds.extreme }
      })
    }))

    // 轻量刷新剩余点数（使用编辑前的 displayAsOcc，不重排序）
    const tempSkills = {}
    const extraOccSkills = []
    oldCats.forEach(cat => {
      cat.skills.forEach(sk => {
        // 被编辑技能的当前值已在上方更新
        const skillName = sk.name === name ? name : sk.name
        tempSkills[sk.name] = sk.name === name ? current : sk.current
        if (sk.displayAsOcc) extraOccSkills.push(sk.name)
      })
    })
    const points = calcSkillPoints({ ...character, skills: tempSkills }, extraOccSkills)

    this.setData({ skillCategories, points })
  },

  // ── 输入框失焦时：统一执行校验 + 截断 + 标红 ──
  onSkillBlur(e) {
    const { name } = e.currentTarget.dataset

    const { skillCategories: oldCats, points, character, occConfig, invalidSkills } = this.data

    // 找到当前技能
    let baseValue = 0, oldCurrent = 0, isLocked = false
    oldCats.forEach(cat => {
      cat.skills.forEach(sk => {
        if (sk.name === name) {
          baseValue = sk.baseValue
          oldCurrent = sk.current
          isLocked = sk.isLocked
        }
      })
    })

    const inputValue = oldCurrent
    let finalValue = inputValue
    let error = ''

    // 校验1：不能低于基础值
    if (inputValue < baseValue) {
      finalValue = baseValue
      error = `不能低于基础值 ${baseValue}`
    }

    // 判断职业/兴趣上限
    let isOccLevel = isLocked
    if (!isLocked && occConfig) {
      const simulatedCats = oldCats.map(cat => ({
        ...cat,
        skills: cat.skills.map(sk =>
          sk.name !== name ? sk : { ...sk, current: inputValue }
        )
      }))
      const updatedCats = this.updateSkillDisplayState(simulatedCats, occConfig)
      let updatedSkill = null
      updatedCats.forEach(c =>
        c.skills.forEach(sk => { if (sk.name === name) updatedSkill = sk })
      )
      if (updatedSkill && updatedSkill.displayAsOcc) isOccLevel = true
    }

    const maxSkillCap = isOccLevel ? 85 : 50

    // 校验2：点数不足时截断
    if (!error && inputValue > baseValue) {
      const oldUsed = Math.max(0, inputValue - baseValue)
      if (isOccLevel) {
        const available = points.rawOccRemaining + points.rawIntRemaining
        if (oldUsed > available) {
          finalValue = baseValue + available
          if (finalValue > maxSkillCap) finalValue = maxSkillCap
          error = '技能点不足'
        }
      } else {
        const available = points.rawIntRemaining
        if (oldUsed > available) {
          finalValue = baseValue + available
          if (finalValue > maxSkillCap) finalValue = maxSkillCap
          error = '兴趣技能点不足'
        }
      }
    }

    // 校验3：超过技能上限
    if (!error && inputValue > maxSkillCap) {
      finalValue = maxSkillCap
      error = `${isOccLevel ? '职业' : '兴趣'}技能最大${maxSkillCap}点`
    }

    // 更新值（含 updateSkillDisplayState 重排序）
    let skillCategories = oldCats.map(cat => ({
      ...cat,
      skills: cat.skills.map(sk => {
        if (sk.name !== name) return sk
        const thresholds = calcSkillThresholds(finalValue)
        return { ...sk, current: finalValue, hard: thresholds.hard, extreme: thresholds.extreme }
      })
    }))

    skillCategories = this.updateSkillDisplayState(skillCategories, occConfig)

    // 同步计算剩余点数
    const tempSkills = {}
    skillCategories.forEach(cat => {
      cat.skills.forEach(sk => { tempSkills[sk.name] = sk.current })
    })
    const extraOccSkills = []
    skillCategories.forEach(cat => {
      cat.skills.forEach(sk => {
        if (sk.displayAsOcc) extraOccSkills.push(sk.name)
      })
    })
    const newPoints = calcSkillPoints({ ...character, skills: tempSkills }, extraOccSkills)

    // 更新错误标记
    const newInvalidSkills = { ...invalidSkills }
    if (error) {
      newInvalidSkills[name] = error
    } else {
      delete newInvalidSkills[name]
    }

    this.setData({ skillCategories, points: newPoints, invalidSkills: newInvalidSkills })
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
        if (sk.isLocked) {
          max = 85
        }

        const maxCanAdd = max - sk.current
        if (maxCanAdd < 5) continue  // 至少能加5点才处理

        // 增量为5的倍数
        const maxMultiple = Math.floor(Math.min(maxCanAdd, left) / 5)
        if (maxMultiple <= 0) continue

        const add = Math.floor(Math.random() * maxMultiple + 1) * 5
        cats[ci].skills[si] = { ...sk, current: sk.current + add }
        left -= add
        added = true
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

    // 2. 检查总消耗是否超过总可用（核心防负数校验）
    const totalAvailable = points.occTotal + points.intTotal
    let totalUsed = 0
    skillCategories.forEach(cat => {
      cat.skills.forEach(sk => {
        totalUsed += Math.max(0, sk.current - sk.baseValue)
      })
    })
    if (totalUsed > totalAvailable) {
      errors.push(`技能总消耗 ${totalUsed} 超过可用点数 ${totalAvailable}，超出 ${totalUsed - totalAvailable} 点`)
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
        showCancel: false,
        confirmText: '返回修改'
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
      skills
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

    // 新建技能插入到第一个分类（调查）的最前面
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
