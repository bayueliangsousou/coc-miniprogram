// pages/skills/skills.js
const { SKILLS, getSkillsByCategory, OCCUPATIONS, getOccupationSkillNames } = require('../../utils/coc-data')
const { getCharacterById, saveCharacter, calcSkillThresholds, calcSkillPoints, saveDraft, loadDraft, clearDraft, isDraftNewer } = require('../../utils/character')
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
    _editingStart: {},     // 记录每个技能开始编辑前的值，供 onBlur delta 计算
    // 职业配置解析结果
    occConfig: {
      lockedSkills: [],       // 锁定的职业技能
      chooseFrom: [],         // 名单型选多（减法：进入全★，超名额摘星）
      mutualExclusion: [],    // 互斥对（减法：进入全★，一方>50摘另一方）
      chooseAny: 0,           // 全技能选 N（加法：进不★）
      categoryLimits: {}      // 分类限制：{ '社交': 1, '艺术': 1, '科学': 2 }
    },
    // 新建技能弹窗
    showNewSkillModal: false,
    newSkillName: '',
    newSkillValue: '',
    creditRatingError: false,
    isRandomized: false,      // 随机按钮状态：false=随机, true=清除
    preRandomState: null,     // 随机前的快照 { skillCategories, creditRatingValue, character }
    // 底纹输入功能
    focusedSkill: '',         // 当前聚焦的技能名
    ghostValue: 0,            // 聚焦前旧值，用于底纹显示
    // 自定义数字键盘
    numpadVisible: false,
    numpadTarget: '',         // 当前编辑的技能名
    numpadValue: '',          // 键盘输入值（字符串）
    numpadOldValue: 0,        // 编辑前的值
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
    let character = getCharacterById(characterId)
    if (!character) return
    // 草稿优先：用草稿里的字段覆盖存档，避免 onShow 无条件重载丢失未保存编辑
    const draft = loadDraft(characterId)
    if (draft && draft.character && isDraftNewer(draft, character)) {
      character = { ...character, ...draft.character }
    }

    // 清理旧数据：删除 optionalSkills（手动选择逻辑已废弃）
    if (character.optionalSkills) {
      delete character.optionalSkills
      saveCharacter(character)
    }

    // 找当前职业技能
    const occ = OCCUPATIONS.find(o => o.id === character.occupationId)
    const occupationSkills = occ ? getOccupationSkillNames(occ.skillSpec) : []
    const pointFormula = occ ? occ.pointFormula : ''
    const creditRatingRange = occ ? occ.creditRating : null
    // 默认填入社会信用评级最低值（CoC 规则：职业授予的信用评级下限须从职业点扣除）
    // 仅当角色尚未设置信用评级时才默认填最低值，已设置（含草稿）则保留用户值
    let creditRatingValue = character.skills['信用评级']
    if (creditRatingValue === undefined || creditRatingValue === null || creditRatingValue === '' || creditRatingValue === 0) {
      if (creditRatingRange && creditRatingRange.length === 2) {
        creditRatingValue = creditRatingRange[0]
        // 同步写回 character.skills，保证点数计算与最终存档一致
        character = { ...character, skills: { ...character.skills, '信用评级': creditRatingValue } }
      } else {
        creditRatingValue = 0
      }
    }

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

    // 固定分类展示顺序（战斗类放最前面）
    const CATEGORY_ORDER = ['战斗', '调查', '社交', '知识', '技术', '运动', '科学', '艺术', '其他']
    skillCategories.sort((a, b) => {
      const idxA = CATEGORY_ORDER.indexOf(a.category)
      const idxB = CATEGORY_ORDER.indexOf(b.category)
      if (idxA === -1 && idxB === -1) return 0
      if (idxA === -1) return 1
      if (idxB === -1) return -1
      return idxA - idxB
    })

    // 重新计算 displayAsOcc 和 limitText（包含自定义技能）
    skillCategories = this.updateSkillDisplayState(skillCategories, occConfig)

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
      occConfig,
      isRandomized: false,
      preRandomState: null
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
    // 补回信用评级（不在 skillCategories 中，但消耗职业点）
    tempSkills['信用评级'] = character.skills['信用评级'] || 0

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
  // ═══════════════════════════════════════════════════════════
  // 职业配置解析：直读声明式 skillSpec，不再做中文串正则解析
  // ═══════════════════════════════════════════════════════════
  parseOccupationConfig(occ) {
    const spec = (occ && occ.skillSpec) || {}
    return {
      lockedSkills: spec.locked || [],
      chooseFrom: spec.chooseFrom || [],          // 名单型选多（减法：进入全★，超名额摘星）
      mutualExclusion: spec.mutualExclusion || [], // 互斥对（减法：进入全★，一方>50摘另一方）
      categoryLimits: spec.categoryLimits || {},  // 分类型选多（加法：进不★）
      chooseAny: spec.chooseAny || 0               // 全技能选 N（加法：进不★）
    }
  },

  // 判断技能是否为锁定职业技能
  isLockedSkill(skillName, lockedSkills) {
    return lockedSkills.some(locked => {
      // 带括号的锁定项（如 科学（生物学）、艺术与手艺（摄影）、格斗（斗殴））
      // 只精确匹配该具体子技能，避免「锁一个、整类全★」的误判
      if (locked.includes('（') || locked.includes('(')) {
        return locked === skillName
      }
      // 裸名（如 射击、其他语言、医学）按基础名（括号前）匹配，覆盖全部子类
      const lockedBase = locked.split('（')[0].split('(')[0]
      const skillBase = skillName.split('（')[0].split('(')[0]
      return lockedBase === skillBase
    })
  },

  // 判断技能名是否命中名单型选多（下列选N）的某条候选
  // 按基础名前缀匹配，兼容「射击」裸名覆盖全部射击子类、且「格斗（斗殴）」与「格斗（剑）」同基础名的情况
  skillBaseMatch(skName, listNames) {
    const skBase = skName.split('（')[0].split('(')[0]
    return listNames.some(ln => {
      const lnBase = ln.split('（')[0].split('(')[0]
      return skBase === lnBase
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
        // 局部选n：按分类内「出现顺序」，前 N 个 >50 的非锁定技能为职业技能（★）。
        // 不按数值排序，避免「数值高的后来者挤掉先填的技能」——
        // 用户若想让后面的技能入选，需主动把前面的技能降到 50 或以下来腾出名额（系统绝不替用户改值）。
        let granted = 0
        cat.skills.forEach(sk => {
          if (!sk.isLocked && sk.name !== '母语' && sk.current > 50 && granted < limit) {
            categoryOccupied.add(sk.name)
            granted++
          }
        })
      }
    })

    // 1.5 计算名单型选多 chooseFrom（跨类别选多，减法模型：候选初始全★，超名额摘星）
    const listOccupied = new Set()
    const listMembers = {}
    const listTag = {}
    const listRemoveStar = new Set()
    ;(occConfig.chooseFrom || []).forEach(group => {
      const groupSkills = []
      skillCategories.forEach(cat => cat.skills.forEach(sk => {
        if (this.skillBaseMatch(sk.name, group.members)) groupSkills.push(sk)
      }))
      groupSkills.forEach(sk => { listMembers[sk.name] = true })
      const over50 = groupSkills
        .filter(sk => sk.current > 50 && !sk.isLocked && sk.name !== '母语')
        .sort((a, b) => b.current - a.current)
      const occupied = over50.slice(0, group.count)
      occupied.forEach(sk => listOccupied.add(sk.name))
      const x = Math.min(over50.length, group.count)
      groupSkills.forEach(sk => { listTag[sk.name] = `可选职业技能${x}/${group.count}` })
      // 名额已满（已选数 == count）时，组内未入选成员一律摘星（即便 current<=50）
      // 即「选 N 选多」：如士兵 急救/机械维修/其他语言 3选2，前两个>50 后第三个摘星
      if (occupied.length >= group.count) {
        groupSkills.forEach(sk => { if (!occupied.includes(sk)) listRemoveStar.add(sk.name) })
      }
    })

    // 1.6 互斥成员初始全★（减法模型：进入编辑页即双星，一方>50后摘另一方）
    const mutualMembers = {}
    ;(occConfig.mutualExclusion || []).forEach(pair => pair.forEach(m => { mutualMembers[m] = true }))

    // 2. 计算全局自选覆盖的技能（全局选N：与局部选n 同逻辑）
    //    按分类→技能「出现顺序」取前 N 个 >50 的非锁定技能为职业技能（★）；
    //    第 (N+1) 个即便数值更高也不★、无法超过 50，除非用户主动把前面的降到 50 以下腾出名额。
    //    不按数值排序，避免「数值高的后来者挤掉先选的」（与局部选n 一致）。
    //    处于有限分类（categoryLimits）内的技能整体不参与全局自选——它们只能走各自的分类名额，
    //    超名额者已是兴趣技能，不能被「自由选 N」提拔。
    const globalOccupied = new Set()
    if (occConfig.chooseAny > 0) {
      let granted = 0
      skillCategories.forEach(cat => {
        if (occConfig.categoryLimits[cat.category]) return
        cat.skills.forEach(sk => {
          if (!sk.isLocked && sk.name !== '母语' && sk.current > 50 && granted < occConfig.chooseAny) {
            globalOccupied.add(sk.name)
            granted++
          }
        })
      })
    }

    // 3. 计算全局剩余名额
    const globalUsed = globalOccupied.size
    const globalRemaining = Math.max(0, occConfig.chooseAny - globalUsed)

    // 4. 更新每个技能的 displayAsOcc 和分类的 limitText
    const result = skillCategories.map(cat => {
      const catLimit = occConfig.categoryLimits[cat.category]
      let limitText = ''

      if (catLimit) {
        // 实时算该分类已选数（categoryOccupied 已按名额封顶），显示剩余可选数，选满归 0
        const selectedInCat = cat.skills.filter(sk => categoryOccupied.has(sk.name)).length
        const remaining = Math.max(0, catLimit - selectedInCat)
        limitText = `（${cat.category}技能可选${remaining}）`
      } else if (occConfig.chooseAny > 0) {
        limitText = `（所有技能里另选${globalRemaining}个作为职业技能）`
      }

      return {
        ...cat,
        limitText,
        skills: cat.skills.map(sk => {
          const inList = !!listMembers[sk.name]
          // isLocked 恒★；自选/分类候选需 current>50 才★；名单型选多/互斥候选初始即★（减法模型）
          let displayAsOcc = sk.isLocked || (
            sk.current > 50 && (
              categoryOccupied.has(sk.name) ||
              globalOccupied.has(sk.name) ||
              listOccupied.has(sk.name)
            )
          ) || inList || !!mutualMembers[sk.name]
          // 跨类别选多：名额已满时未入选的候选摘星，但保留进度标签
          if (inList && listRemoveStar.has(sk.name)) {
            displayAsOcc = false
          }
          const skillLimitText = listTag[sk.name] || ''
          return { ...sk, displayAsOcc, skillLimitText }
        })
      }
    })

    // 互斥职业技能：一对中某方 current > 50，则摘除另一方的 ★
    const mutEx = occConfig.mutualExclusion || []
    mutEx.forEach(pair => {
      const [nameA, nameB] = pair
      let skillA, skillB
      result.forEach(cat => cat.skills.forEach(sk => {
        if (sk.name === nameA) skillA = sk
        if (sk.name === nameB) skillB = sk
      }))
      if (!skillA || !skillB) return
      if (skillA.current > 50) skillB.displayAsOcc = false
      if (skillB.current > 50) skillA.displayAsOcc = false
    })

    return result
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

    // 同步到 character.skills 让 calcPoints 感知消耗
    const { character } = this.data
    if (character) {
      const skills = { ...character.skills, '信用评级': value === '' ? 0 : value }
      const newCharacter = { ...character, skills }
      this.setData({ creditRatingValue: value, creditRatingError: false, character: newCharacter }, () => {
        this.calcPoints()
      })
    } else {
      this.setData({ creditRatingValue: value, creditRatingError: false })
    }
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

  // ═══════════════════════════════════════════════════════════
  // 铁律：此函数中绝不 this.setData({ skillCategories: 全量数组 })
  //      全量 setData 会导致所有 input 重渲染，覆盖用户输入
  // 允许：this.setData({ points, ['skillCategories[i].skills[j].current']: val })
  //      路径更新只影响单个 input，且值 = 用户输入，不会覆盖
  // ═══════════════════════════════════════════════════════════
  onSkillInput(e) {
    const { name } = e.currentTarget.dataset

    // 🔍 调试日志：记录输入开始时的状态
    console.log('[onSkillInput]', name, '| _lastScrollTop:', this._lastScrollTop, '| value:', e.detail.value)

    // 1. 过滤用户输入：只允许数字，最多2位
    let filtered = String(e.detail.value).replace(/[^\d]/g, '').slice(0, 2)
    const value = parseInt(filtered) || 0

    const { skillCategories: oldCats, character, occConfig, ghostValue } = this.data

    // 2. 找到当前技能在嵌套数组中的索引
    let catIdx = -1, skIdx = -1
    oldCats.forEach((cat, ci) => {
      cat.skills.forEach((sk, si) => {
        if (sk.name === name) { catIdx = ci; skIdx = si }
      })
    })

    // 3. 构建临时拷贝（不影响 data 中的 skillCategories）
    const tempCats = oldCats.map(cat => ({
      ...cat,
      skills: cat.skills.map(sk => {
        if (sk.name !== name) return sk
        const thresholds = calcSkillThresholds(value)
        return { ...sk, current: value, hard: thresholds.hard, extreme: thresholds.extreme }
      })
    }))

    // 4. 在临时拷贝上跑 displayAsOcc（自选职业逻辑）
    const updatedCats = this.updateSkillDisplayState(tempCats, occConfig)

    // 5. 用临时拷贝的结果计算剩余点数
    const tempSkills = {}
    const extraOccSkills = []
    updatedCats.forEach(cat => {
      cat.skills.forEach(sk => {
        tempSkills[sk.name] = sk.current
        if (sk.displayAsOcc) extraOccSkills.push(sk.name)
      })
    })
    const points = calcSkillPoints({ ...character, skills: tempSkills }, extraOccSkills)

    // 6. 更新点数 + 路径更新当前技能值 + 首次输入时清除底纹（一次 setData 避免闪烁）
    this.setData({
      points,
      [`skillCategories[${catIdx}].skills[${skIdx}].current`]: value,
      ghostValue: 0  // 用户已输入，清除底纹
    })

    // 7. return 过滤后的字符串，框架原生替换（不触发 setData 重渲染）
    return filtered
  },

  // ── 失焦时：统一执行校验 + 截断 + 标红（delta 差量） ──
  // 保留此方法用于底层兼容（新建技能弹窗等场景仍使用原生 input）
  onSkillBlur(e) {
    const { name } = e.currentTarget.dataset
    const inputValue = parseInt(e.detail.value) || 0
    const { ghostValue, skillCategories: oldCats } = this.data

    // 底纹恢复：聚焦后未输入就失焦 → 还原旧值
    if (inputValue === 0 && ghostValue > 0) {
      this._updateSkillValue(name, ghostValue)
      let ci = -1, si = -1
      oldCats.forEach((c, i) => c.skills.forEach((_, j) => { if (c.skills[j].name === name) { ci = i; si = j } }))
      const setDataObj = { focusedSkill: '', ghostValue: 0 }
      if (ci >= 0) setDataObj[`skillCategories[${ci}].skills[${si}].current`] = ghostValue
      this.setData(setDataObj)
      return
    }

    this._validateAndApply(name, inputValue)
  },

  // 共享校验：数字键盘「确定」和原生 onSkillBlur 共用此方法
  _validateAndApply(name, inputValue) {
    const { skillCategories: oldCats, character, occConfig, invalidSkills, _editingStart } = this.data

    // 找到当前技能
    let baseValue = 0, isLocked = false
    oldCats.forEach(cat => {
      cat.skills.forEach(sk => {
        if (sk.name === name) { baseValue = sk.baseValue; isLocked = sk.isLocked }
      })
    })

    const oldValue = (_editingStart && _editingStart[name]) || baseValue
    let finalValue = inputValue
    let error = ''

    // ── 用 oldValue 状态跑 updateSkillDisplayState，判定：剩余自选名额 > 0？──
    const catsAtOld = oldCats.map(cat => ({
      ...cat,
      skills: cat.skills.map(sk => ({
        ...sk,
        current: sk.name === name ? oldValue : sk.current
      }))
    }))
    const oldDisplayCats = this.updateSkillDisplayState(catsAtOld, occConfig)
    const occSkillNames = []
    oldDisplayCats.forEach(cat => {
      cat.skills.forEach(sk => {
        if (sk.displayAsOcc && !sk.isLocked) occSkillNames.push(sk.name)
      })
    })

    // 关键修复：职业技能上限（85）必须按技能「所属机制」分别判定，
    // 不能用单一 chooseAny 剩余名额笼统判断——否则社交分类占用会被错误扣到自由选 N 名额上
    // （如律师：社交选2 + 自由选2 应各自独立，互不覆盖）。
    // 做法：假设本技能加到 finalValue，重跑 display 状态，取本技能是否成为★（displayAsOcc）。
    const catsAtFinal = oldCats.map(cat => ({
      ...cat,
      skills: cat.skills.map(sk => ({
        ...sk,
        current: sk.name === name ? finalValue : sk.current
      }))
    }))
    const finalDisplayCats = this.updateSkillDisplayState(catsAtFinal, occConfig)
    let displayAsOccFinal = false
    finalDisplayCats.forEach(cat => cat.skills.forEach(sk => {
      if (sk.name === name) displayAsOccFinal = sk.displayAsOcc
    }))
    // 输入 > 50 且按本机制可成为职业技能 → 职业技能（上限85）；否则 → 兴趣技能（上限50）
    const isOcc = isLocked || (finalValue > 50 && displayAsOccFinal)
    const maxCap = isOcc ? 85 : 50

    // ── 用 baseValue 状态重算可用点数池子 ──
    const skillsAtBase = {}
    oldCats.forEach(cat => {
      cat.skills.forEach(sk => {
        skillsAtBase[sk.name] = sk.name === name ? baseValue : sk.current
      })
    })
    const basePoints = calcSkillPoints(
      { ...character, skills: skillsAtBase },
      occSkillNames
    )

    const maxFromBase = isOcc
      ? baseValue + basePoints.occRemaining + basePoints.intRemaining
      : baseValue + basePoints.intRemaining

    // ── 三段校验 ──
    // 1. 上限截断（硬限制，不标红）
    if (finalValue > maxCap) { finalValue = maxCap }

    // 2. 点数够不够（截断到最大可达值，标红）
    if (finalValue > maxFromBase) {
      finalValue = maxFromBase
      error = '技能点不足'
    }

    // 3. 基础值兜底（硬下限，不标红）
    if (finalValue < baseValue) { finalValue = baseValue }

    // 更新值（含 updateSkillDisplayState 重算 ★）
    // 注意：只更新「正在编辑的这一个技能」的值，绝不动同分类的其他技能（无挤下逻辑）
    let skillCategories = oldCats.map(cat => ({
      ...cat,
      skills: cat.skills.map(sk => {
        if (sk.name !== name) return { ...sk }
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

    // 清理本技能的 _editingStart
    const newEditingStart = { ..._editingStart }
    delete newEditingStart[name]

    this.setData({ skillCategories, points: newPoints, invalidSkills: newInvalidSkills, _editingStart: newEditingStart, focusedSkill: '', ghostValue: 0 })
  },

  // ═══════════════════════════════════════════════════════════
  // 自定义数字键盘事件
  // ═══════════════════════════════════════════════════════════
  onNumpadTap(e) {
    const key = e.currentTarget.dataset.key
    let { numpadValue } = this.data
    if (numpadValue.length >= 2) return   // 最多2位（0-99）
    numpadValue += key
    this.setData({ numpadValue })
  },

  onNumpadBackspace() {
    let { numpadValue } = this.data
    numpadValue = numpadValue.slice(0, -1)
    this.setData({ numpadValue })
  },

  onNumpadConfirm() {
    const { numpadTarget, numpadValue } = this.data
    const inputValue = numpadValue === '' ? 0 : parseInt(numpadValue)
    // 执行与原生 onSkillBlur 完全相同的校验逻辑
    this._validateAndApply(numpadTarget, inputValue)
    this.setData({ numpadVisible: false, numpadTarget: '', numpadValue: '', numpadOldValue: 0 })
  },

  onNumpadCancel() {
    this.setData({ numpadVisible: false, numpadTarget: '', numpadValue: '', numpadOldValue: 0 })
  },

  // 底纹辅助：直接写入技能值（不走校验）
  _updateSkillValue(name, value) {
    const { skillCategories } = this.data
    skillCategories.forEach(cat => {
      cat.skills.forEach(sk => {
        if (sk.name === name) {
          sk.current = value
          const thresholds = calcSkillThresholds(value)
          sk.hard = thresholds.hard
          sk.extreme = thresholds.extreme
        }
      })
    })
  },

  // ── 点击技能值：弹出自定义数字键盘 ──
  onSkillTap(e) {
    const { name } = e.currentTarget.dataset
    console.log('[onSkillTap] 技能:', name)
    const { skillCategories, _editingStart } = this.data

    // 记录编辑前的值
    let oldValue = 0
    skillCategories.forEach(cat => {
      cat.skills.forEach(sk => {
        if (sk.name === name) oldValue = sk.current
      })
    })

    // 保存到 _editingStart 供后续校验使用
    const newEditingStart = { ...(_editingStart || {}), [name]: oldValue }

    this.setData({
      invalidSkills: {},
      _editingStart: newEditingStart,
      numpadVisible: true,
      numpadTarget: name,
      numpadValue: '',
      numpadOldValue: oldValue
    })
  },

  // 随机分配技能点（点击后按钮变「清除」，再点还原）
  onRandomDistribute() {
    const { isRandomized } = this.data

    // 已是随机状态 → 执行清除
    if (isRandomized) {
      return this._onClearRandom()
    }

    const { points, skillCategories } = this.data
    if (!points || (points.occTotal === 0 && points.intTotal === 0)) {
      wx.showToast({ title: '请先选择职业并设置属性', icon: 'none' })
      return
    }

    // 保存随机前的快照
    this.setData({
      preRandomState: {
        skillCategories: JSON.parse(JSON.stringify(skillCategories)),
        creditRatingValue: this.data.creditRatingValue,
        character: JSON.parse(JSON.stringify(this.data.character))
      }
    })

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
          occLeft = this._randomDistributePoints(cats, occSkills, occLeft, true)
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

        this.setData({ skillCategories: cats, creditRatingValue: newCreditRating, character: newCharacter, invalidSkills: {}, creditRatingError: false, isRandomized: true }, () => {
          this.calcPoints()
          wx.showToast({ title: '随机分配完成！可点清除还原', icon: 'success' })
        })
      }
    })
  },

  // 清除随机：还原到随机前的状态
  _onClearRandom() {
    const { preRandomState } = this.data
    if (!preRandomState) return

    wx.showModal({
      title: '清除随机分配',
      content: '将还原到随机之前的技能数值，确定？',
      confirmText: '还原',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (!res.confirm) return

        this.setData({
          skillCategories: preRandomState.skillCategories,
          creditRatingValue: preRandomState.creditRatingValue,
          character: preRandomState.character,
          isRandomized: false,
          preRandomState: null,
          invalidSkills: {},
          creditRatingError: false
        }, () => {
          this.calcPoints()
          wx.showToast({ title: '已还原！', icon: 'success' })
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
      this.setData({ searchText: '', searchMatches: [], searchIndex: -1 })
      return
    }
    const matches = this._buildSearchMatches(text)
    const newIndex = matches.length > 0 ? 0 : -1
    this.setData({
      searchText: text,
      searchMatches: matches,
      searchIndex: newIndex
    })
  },

  // 点击搜索框右侧数字/箭头，切换到下一个匹配
  onSearchNext() {
    const { searchMatches, searchIndex } = this.data
    if (searchMatches.length === 0) return
    const next = (searchIndex + 1) % searchMatches.length
    this.setData({
      searchIndex: next
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

    // 1. 检查信用评级（唯一拦截项）
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

    return errors
  },

  // 保存/落草稿前，把「非职业技能（displayAsOcc=false）却 current>50」的技能归 50，
  // 确保「第 N+1 个技能」永远存不进 >50（符合「局部选n / 全局选N」规则）。
  // 只降超编技能的值，绝不改动已占名额的 N 个职业技能（不挤下原则）。
  clampOverflowSkills(skillCategories) {
    const occConfig = this.data.occConfig
    if (!occConfig) return { cats: skillCategories, changed: 0 }
    const cats = this.updateSkillDisplayState(skillCategories, occConfig)
    let changed = 0
    cats.forEach(cat => cat.skills.forEach(sk => {
      if (!sk.displayAsOcc && sk.current > 50 && sk.name !== '母语') {
        sk.current = 50
        const th = calcSkillThresholds(50)
        sk.hard = th.hard
        sk.extreme = th.extreme
        changed++
      }
    }))
    return { cats, changed }
  },

  // 从 skillCategories 收集技能值，供 onHide 落草稿 / onSave 写存档复用
  // skillCategoriesParam 可选：传入则用它，否则用 this.data.skillCategories
  collectSkills(skillCategoriesParam) {
    const skillCategories = skillCategoriesParam || this.data.skillCategories
    const { creditRatingValue } = this.data
    const skills = {}
    skillCategories.forEach(cat => {
      cat.skills.forEach(sk => {
        let name = sk.name
        if (name === '其他语言' && sk.languageName) {
          name = `其他语言（${sk.languageName}）`
        }
        skills[name] = sk.current
      })
    })
    skills['信用评级'] = creditRatingValue
    return skills
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

    const { cats: clamped, changed } = this.clampOverflowSkills(skillCategories)
    this.setData({ skillCategories: clamped })
    if (changed > 0) {
      wx.showToast({ title: `已自动将 ${changed} 个超出职业上限的技能归为50`, icon: 'none' })
    }
    this._doSave(character, clamped)
  },

  // 页面隐藏/关闭时落草稿（含当前编辑的技能值），防未保存丢失
  onHide() {
    const { characterId, character } = this.data
    if (!characterId || !character) return
    const { cats: clamped } = this.clampOverflowSkills(this.data.skillCategories)
    this.setData({ skillCategories: clamped })
    const skills = this.collectSkills(clamped)
    saveDraft({ ...character, skills })
  },

  _doSave(character, skillCategories) {
    // 收集所有技能值（clampOverflowSkills 已在 onSave 中执行，这里直接收集）
    const skills = this.collectSkills(skillCategories)
    const updated = {
      ...character,
      skills
    }
    saveCharacter(updated)
    clearDraft(this.data.characterId)
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

  preventBubble() {},
})
