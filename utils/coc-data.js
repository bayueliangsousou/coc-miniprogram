// utils/coc-data.js
// CoC 七版规则数据：职业列表、技能列表

/**
 * 职业列表
 * creditRating: [min, max] 信用评级范围
 * pointFormula: 技能点计算公式描述
 * skillSpec: 职业技能声明式配置（纯声明式，解析层直读，不再用中文串解析）
 *   - locked:        固定锁定技能（恒★，占用职业点池）
 *   - chooseFrom:    名单型选多（减法模型：进入全★，超名额摘星，候选名后挂进度标签）
 *                    互斥（二选一）即 chooseFrom{members:[a,b], count:1}
 *   - categoryLimits: 分类型选多（加法模型：进入不★，加到50+才★），键为分类名
 *   - chooseAny:     全技能选 N（加法模型：进入不★，加到50+才★）
 */
const OCCUPATIONS = [
  {
    id: 'antiquarian',
    name: '古物研究者',
    desc: '专门研究古代文物、艺术品和历史遗迹的专家。',
    creditRating: [30, 70],
    pointFormula: 'EDU × 4',
    skillSpec: {
      locked: ['估价', '历史', '图书馆使用', '其他语言', '侦察', '信用评级'],
      categoryLimits: { '艺术': 1 },
      chooseAny: 1
    }
  },
  {
    id: 'author',
    name: '作家',
    desc: '以写作为职业，创作小说、剧本或非虚构作品。',
    creditRating: [9, 30],
    pointFormula: 'EDU × 4',
    skillSpec: {
      locked: ['艺术与手艺（写作）', '历史', '图书馆使用', '神秘学', '其他语言', '心理学', '信用评级'],
      chooseAny: 1
    }
  },
  {
    id: 'dilettante',
    name: '花花公子',
    desc: '有闲有钱、兴趣广泛的富家子弟。',
    creditRating: [50, 99],
    pointFormula: 'APP × 2 + EDU × 2',
    skillSpec: {
      locked: ['射击', '骑乘', '其他语言', '心理学', '信用评级'],
      categoryLimits: { '艺术': 1 },
      chooseAny: 1
    }
  },
  {
    id: 'doctor',
    name: '医生',
    desc: '受过正规医学训练、拥有执照的医疗从业者。',
    creditRating: [30, 80],
    pointFormula: 'EDU × 4',
    skillSpec: {
      locked: ['急救', '图书馆使用', '医学', '心理学', '科学（生物学）', '科学（药学）', '信用评级'],
      chooseAny: 2
    }
  },
  {
    id: 'driver',
    name: '司机',
    desc: '以驾驶各类交通工具为职业的人。',
    creditRating: [9, 20],
    pointFormula: 'DEX × 2 + EDU × 2',
    skillSpec: {
      locked: ['电器修理', '驾驶（汽车）', '射击', '锁匠', '机械修理', '导航', '信用评级'],
      chooseAny: 2
    }
  },
  {
    id: 'editor',
    name: '编辑',
    desc: '在报社、出版社或杂志社工作的文字从业者。',
    creditRating: [9, 35],
    pointFormula: 'EDU × 4',
    skillSpec: {
      locked: ['历史', '图书馆使用', '母语', '其他语言', '心理学', '信用评级'],
      chooseAny: 3
    }
  },
  {
    id: 'engineer',
    name: '工程师',
    desc: '受过专业工程技术训练的技术人员。',
    creditRating: [30, 60],
    pointFormula: 'EDU × 4',
    skillSpec: {
      locked: ['电器修理', '图书馆使用', '机械修理', '操作重型机械', '科学（物理学）', '信用评级'],
      chooseAny: 3
    }
  },
  {
    id: 'gangster',
    name: '黑帮成员',
    desc: '活跃于犯罪地下世界的成员。',
    creditRating: [5, 40],
    pointFormula: 'STR × 2 + DEX × 2',
    skillSpec: {
      locked: ['驾驶（汽车）', '射击', '恐吓', '格斗（斗殴）', '锁匠', '侦察', '信用评级'],
      chooseAny: 2
    }
  },
  {
    id: 'hunter',
    name: '猎人',
    desc: '以打猎或追踪为生的户外生存专家。',
    creditRating: [9, 20],
    pointFormula: 'STR × 2 + DEX × 2',
    skillSpec: {
      locked: ['急救', '导航', '自然学', '侦察', '射击', '追踪', '信用评级'],
      chooseAny: 2
    }
  },
  {
    id: 'investigator',
    name: '私人侦探',
    desc: '受雇调查各类私人案件的专业侦探。',
    creditRating: [9, 30],
    pointFormula: 'EDU × 2 + STR × 2 或 DEX × 2',
    skillSpec: {
      locked: ['艺术与手艺（摄影）', '乔装', '格斗（斗殴）', '射击', '法律', '图书馆使用', '心理学', '侦察', '信用评级']
    }
  },
  {
    id: 'journalist',
    name: '记者',
    desc: '为报纸、电台或杂志采集和报道新闻的职业。',
    creditRating: [9, 30],
    pointFormula: 'EDU × 4',
    skillSpec: {
      locked: ['艺术与手艺（摄影）', '历史', '图书馆使用', '母语', '心理学', '信用评级'],
      chooseAny: 3
    }
  },
  {
    id: 'lawyer',
    name: '律师',
    desc: '拥有法律从业资格、提供法律服务的专业人士。',
    creditRating: [30, 80],
    pointFormula: 'EDU × 4',
    skillSpec: {
      locked: ['会计学', '图书馆使用', '法律', '心理学', '信用评级'],
      categoryLimits: { '社交': 2 },
      chooseAny: 2
    }
  },
  {
    id: 'librarian',
    name: '图书管理员',
    desc: '在图书馆或档案馆负责管理文献资料的人员。',
    creditRating: [9, 35],
    pointFormula: 'EDU × 4',
    skillSpec: {
      locked: ['图书馆使用', '其他语言', '母语', '信用评级'],
      chooseAny: 5
    }
  },
  {
    id: 'military',
    name: '军人',
    desc: '在陆海空等武装力量中服役的现役或退役军人。',
    creditRating: [9, 30],
    pointFormula: 'EDU × 2 + STR × 2 或 DEX × 2',
    skillSpec: {
      locked: ['急救', '格斗（斗殴）', '射击', '侦察', '信用评级'],
      chooseAny: 4
    }
  },
  {
    id: 'missionary',
    name: '传教士',
    desc: '以传播宗教信仰为使命的人员。',
    creditRating: [0, 30],
    pointFormula: 'EDU × 4',
    skillSpec: {
      locked: ['急救', '历史', '图书馆使用', '医学', '神秘学', '心理学', '信用评级'],
      chooseAny: 2
    }
  },
  {
    id: 'musician',
    name: '音乐家',
    desc: '以表演、创作或教授音乐为职业的艺术家。',
    creditRating: [9, 30],
    pointFormula: 'APP × 2 + EDU × 2',
    skillSpec: {
      locked: ['艺术与手艺（乐器）', '艺术与手艺（唱歌）', '心理学', '侦察', '信用评级'],
      chooseAny: 4
    }
  },
  {
    id: 'nurse',
    name: '护士',
    desc: '协助医生提供医疗护理服务的专业人员。',
    creditRating: [9, 30],
    pointFormula: 'EDU × 4',
    skillSpec: {
      locked: ['急救', '图书馆使用', '听觉', '医学', '心理学', '信用评级'],
      categoryLimits: { '科学': 1 },
      chooseAny: 2
    }
  },
  {
    id: 'occultist',
    name: '神秘学家',
    desc: '研究超自然现象和秘密知识的人。',
    creditRating: [9, 65],
    pointFormula: 'EDU × 4',
    skillSpec: {
      locked: ['人类学', '历史', '图书馆使用', '神秘学', '其他语言', '信用评级'],
      chooseAny: 3
    }
  },
  {
    id: 'parapsychologist',
    name: '超自然研究员',
    desc: '研究心灵感应、幽灵等超自然现象的科学家。',
    creditRating: [9, 30],
    pointFormula: 'EDU × 4',
    skillSpec: {
      locked: ['人类学', '艺术与手艺（摄影）', '历史', '图书馆使用', '神秘学', '心理学', '信用评级'],
      chooseAny: 2
    }
  },
  {
    id: 'pilot',
    name: '飞行员',
    desc: '具备飞行资质的航空器驾驶人员。',
    creditRating: [20, 70],
    pointFormula: 'DEX × 2 + EDU × 2',
    skillSpec: {
      locked: ['导航', '驾驶（飞机）', '驾驶（汽车）', '电器修理', '机械修理', '操作重型机械', '信用评级'],
      chooseAny: 2
    }
  },
  {
    id: 'police',
    name: '警察',
    desc: '维护社会治安、执行法律的执法人员。',
    creditRating: [9, 30],
    pointFormula: 'EDU × 2 + STR × 2 或 DEX × 2',
    skillSpec: {
      locked: ['格斗（斗殴）', '射击', '急救', '法律', '心理学', '侦察', '信用评级'],
      categoryLimits: { '社交': 1 },
      mutualExclusion: [['驾驶（汽车）', '骑乘']]
    }
  },
  {
    id: 'detective',
    name: '警探（原作向）',
    desc: '负责调查与侦破案件的侦探。',
    creditRating: [20, 50],
    pointFormula: 'EDU × 2 + STR × 2 或 DEX × 2',
    skillSpec: {
      locked: ['射击', '法律', '聆听', '心理学', '侦察', '信用评级'],
      categoryLimits: { '社交': 1 },
      mutualExclusion: [['艺术与手艺（表演）', '乔装']],
      chooseAny: 1
    }
  },
  {
    id: 'criminal',
    name: '罪犯',
    desc: '游走于法律边缘、以非法手段牟利的人员。',
    creditRating: [5, 65],
    pointFormula: 'EDU × 2 + DEX × 2 或 STR × 2',
    skillSpec: {
      locked: ['心理学', '侦察', '潜行', '信用评级'],
      categoryLimits: { '社交': 1 },
      chooseFrom: [{ members: ['估价', '乔装', '格斗（斗殴）', '射击', '锁匠', '机械修理', '妙手'], count: 4 }]
    }
  },
  {
    id: 'professor',
    name: '大学教授',
    desc: '在高等院校从事教学与研究的学者。',
    creditRating: [20, 70],
    pointFormula: 'EDU × 4',
    skillSpec: {
      locked: ['图书馆使用', '其他语言', '母语', '心理学', '信用评级'],
      chooseAny: 4
    }
  },
  {
    id: 'scientist',
    name: '科学家',
    desc: '从事自然科学研究的专业人员。',
    creditRating: [9, 40],
    pointFormula: 'EDU × 4',
    skillSpec: {
      locked: ['电器修理', '图书馆使用', '其他语言', '信用评级'],
      categoryLimits: { '科学': 2 },
      chooseAny: 3
    }
  },
  {
    id: 'sailor',
    name: '水手',
    desc: '在海上从事航行或捕捞工作的人员。',
    creditRating: [9, 20],
    pointFormula: 'EDU × 2 + STR × 2',
    skillSpec: {
      locked: ['急救', '格斗（斗殴）', '射击', '导航', '侦察', '游泳', '信用评级'],
      chooseAny: 2
    }
  },
  {
    id: 'soldier',
    name: '士兵',
    desc: '普通士官或列兵级别的军事人员。',
    creditRating: [9, 20],
    pointFormula: 'EDU × 2 + STR × 2 或 DEX × 2',
    skillSpec: {
      locked: ['急救', '格斗（斗殴）', '射击', '投掷', '信用评级'],
      chooseAny: 4
    }
  },
  {
    id: 'spy',
    name: '间谍',
    desc: '秘密收集情报或执行渗透任务的特工人员。',
    creditRating: [20, 60],
    pointFormula: 'EDU × 2 + APP × 2 或 DEX × 2',
    skillSpec: {
      locked: ['艺术与手艺（摄影）', '乔装', '射击', '格斗（斗殴）', '其他语言', '心理学', '侦察', '信用评级'],
      chooseAny: 1
    }
  },
  {
    id: 'student',
    name: '学生',
    desc: '正在接受高等教育的在校生。',
    creditRating: [5, 10],
    pointFormula: 'EDU × 4',
    skillSpec: {
      locked: ['图书馆使用', '母语', '信用评级'],
      chooseAny: 6
    }
  },
  {
    id: 'accountant',
    name: '会计师',
    desc: '会计师可能在企业工作或作为自由会计师，为个体经营者和企业客户担任顾问。',
    creditRating: [30, 70],
    pointFormula: 'EDU × 4',
    skillSpec: {
      locked: ['会计学', '法律', '图书馆使用', '聆听', '说服', '侦察', '信用评级'],
      chooseAny: 1
    }
  },
  {
    id: 'animal_trainer',
    name: '动物训练师',
    desc: '动物训练师可能在电影工作室、巡回马戏团、马厩工作或自由工作。',
    creditRating: [10, 40],
    pointFormula: 'EDU × 2 + APP × 2 或 POW × 2',
    skillSpec: {
      locked: ['跳跃', '聆听', '自然学', '心理学', '科学（动物学）', '潜行', '追踪', '信用评级']
    }
  },
  {
    id: 'hacker',
    name: '黑客（现代）',
    desc: '利用计算机和网络进行干扰或破坏以达成目的的技术人员。',
    creditRating: [10, 70],
    pointFormula: 'EDU × 4',
    skillSpec: {
      locked: ['计算机', '电气维修', '电子学', '图书馆使用', '侦察', '信用评级'],
      categoryLimits: { '社交': 1 },
      chooseAny: 1
    }
  },
  {
    id: 'programmer',
    name: '程序员（现代）',
    desc: '设计、编写、测试、调试和维护计算机程序源代码的职业。',
    creditRating: [10, 70],
    pointFormula: 'EDU × 4',
    skillSpec: {
      locked: ['计算机', '电气维修', '电子学', '图书馆使用', '科学（数学）', '侦察', '信用评级'],
      chooseAny: 1
    }
  },
  {
    id: 'idol',
    name: '偶像（现代）',
    desc: '以歌舞表演为职业的艺人。',
    creditRating: [9, 70],
    pointFormula: 'EDU × 2 + APP × 2',
    skillSpec: {
      locked: ['艺术与手艺（表演）', '艺术与手艺（唱歌）', '乔装', '聆听', '心理学', '信用评级'],
      categoryLimits: { '社交': 1 },
      chooseAny: 1
    }
  },
  {
    id: 'thug',
    name: '打手',
    desc: '犯罪组织的兵卒，被犯罪组织豢养。',
    creditRating: [5, 30],
    pointFormula: 'EDU × 2 + STR × 2',
    skillSpec: {
      locked: ['驾驶（汽车）', '格斗（斗殴）', '射击', '心理学', '潜行', '侦察', '信用评级'],
      categoryLimits: { '社交': 1 }
    }
  },
  {
    id: 'athlete',
    name: '运动员',
    desc: '效力于职业运动队伍的专业运动员。',
    creditRating: [9, 70],
    pointFormula: 'EDU × 2 + STR × 2 或 DEX × 2',
    skillSpec: {
      locked: ['攀爬', '跳跃', '格斗（斗殴）', '骑乘', '游泳', '投掷', '信用评级'],
      categoryLimits: { '社交': 1 }
    }
  },
  {
    id: 'cowboy',
    name: '牛仔',
    desc: '在西部的牧区和牧场工作的人员。',
    creditRating: [9, 20],
    pointFormula: 'EDU × 2 + STR × 2 或 DEX × 2',
    skillSpec: {
      locked: ['闪避', '格斗（斗殴）', '射击', '跳跃', '骑乘', '生存', '投掷', '信用评级']
    }
  },
  {
    id: 'artist',
    name: '艺术家',
    desc: '从事视觉、表演或文学艺术创作的人。',
    creditRating: [9, 50],
    pointFormula: 'EDU × 2 + DEX × 2 或 POW × 2',
    skillSpec: {
      locked: ['艺术与手艺（任一）', '其他语言', '心理学', '侦察', '信用评级'],
      categoryLimits: { '社交': 1, '艺术': 1 },
      mutualExclusion: [['历史', '博物学']],
      chooseAny: 2
    }
  },
  {
    id: 'cleric',
    name: '神职人员',
    desc: '从事宗教职务、主持仪式与布道的神职者。',
    creditRating: [9, 60],
    pointFormula: 'EDU × 4',
    skillSpec: {
      locked: ['会计学', '历史', '图书馆使用', '聆听', '其他语言', '心理学', '信用评级'],
      categoryLimits: { '社交': 1 },
      chooseAny: 1
    }
  },
  {
    id: 'drifter',
    name: '流浪者',
    desc: '无固定居所、四处漂泊谋生的人。',
    creditRating: [0, 5],
    pointFormula: 'EDU × 2 + APP × 2 或 DEX × 2 或 STR × 2',
    skillSpec: {
      locked: ['攀爬', '跳跃', '聆听', '导航', '潜行', '信用评级'],
      categoryLimits: { '社交': 1 },
      chooseAny: 2
    }
  },
  {
    id: 'farmer',
    name: '农民',
    desc: '以耕种、养殖为业的农业从业者。',
    creditRating: [9, 30],
    pointFormula: 'EDU × 2 + DEX × 2 或 STR × 2',
    skillSpec: {
      locked: ['驾驶（汽车）', '机械修理', '博物学', '操作重型机械', '追踪', '信用评级'],
      categoryLimits: { '社交': 1, '艺术': 1 },
      chooseAny: 1
    }
  },
  {
    id: 'tribesman',
    name: '部落成员',
    desc: '生活在部落社会中、依循传统狩猎与生存的族人。',
    creditRating: [0, 15],
    pointFormula: 'EDU × 2 + DEX × 2 或 STR × 2',
    skillSpec: {
      locked: ['攀爬', '博物学', '聆听', '神秘学', '侦察', '游泳', '生存', '信用评级'],
      mutualExclusion: [['格斗（斗殴）', '投掷']]
    }
  },
  {
    id: 'fanatic',
    name: '狂热者',
    desc: '为某种信念或信仰极端献身的人。',
    creditRating: [0, 30],
    pointFormula: 'EDU × 2 + APP × 2 或 POW × 2',
    skillSpec: {
      locked: ['历史', '心理学', '潜行', '信用评级'],
      categoryLimits: { '社交': 2 },
      chooseAny: 3
    }
  }
]

/**
 * 技能列表（CoC 七版标准技能）
 * baseValue: 基础值
 * category: 分类
 */
const SKILLS = [
  // 战斗类（按PDF武器列表顺序排列）
  // 射击类
  { name: '射击（冲锋枪）', baseValue: 15, category: '战斗' },
  { name: '射击（喷射器）', baseValue: 10, category: '战斗' },
  { name: '射击（弓术）', baseValue: 15, category: '战斗' },
  { name: '射击（手枪）', baseValue: 20, category: '战斗' },
  { name: '射击（机枪）', baseValue: 10, category: '战斗' },
  { name: '射击（步枪/霰弹枪）', baseValue: 25, category: '战斗' },
  { name: '射击（炮术）', baseValue: 1, category: '战斗' },
  { name: '射击（重武器）', baseValue: 10, category: '战斗' },
  // 格斗类
  { name: '格斗（剑）', baseValue: 20, category: '战斗' },
  { name: '格斗（斗殴）', baseValue: 25, category: '战斗' },
  { name: '格斗（斧）', baseValue: 15, category: '战斗' },
  { name: '格斗（电锯）', baseValue: 10, category: '战斗' },
  { name: '格斗（绞索）', baseValue: 15, category: '战斗' },
  { name: '格斗（链枷）', baseValue: 10, category: '战斗' },
  { name: '格斗（鞭子）', baseValue: 5, category: '战斗' },
  // 其他战斗技能
  { name: '投掷', baseValue: 20, category: '战斗' },
  { name: '投掷（矛）', baseValue: 20, category: '战斗' },
  { name: '爆破', baseValue: 1, category: '战斗' },
  { name: '闪避', baseValue: 0, category: '战斗', note: '等于DEX/2' },

  // 调查类
  { name: '侦察', baseValue: 25, category: '调查' },
  { name: '聆听', baseValue: 20, category: '调查' },
  { name: '追踪', baseValue: 10, category: '调查' },
  { name: '图书馆使用', baseValue: 20, category: '调查' },
  { name: '导航', baseValue: 10, category: '调查' },
  { name: '乔装', baseValue: 5, category: '调查' },

  // 社交类
  { name: '话术', baseValue: 5, category: '社交' },
  { name: '取悦', baseValue: 15, category: '社交' },
  { name: '恐吓', baseValue: 15, category: '社交' },
  { name: '说服', baseValue: 10, category: '社交' },

  // 知识类
  { name: '神秘学', baseValue: 5, category: '知识' },
  { name: '心理学', baseValue: 10, category: '知识' },
  { name: '历史', baseValue: 5, category: '知识' },
  { name: '法律', baseValue: 5, category: '知识' },
  { name: '会计学', baseValue: 5, category: '知识' },
  { name: '博物学', baseValue: 10, category: '知识' },
  { name: '其他语言', baseValue: 1, category: '知识' },
  { name: '母语', baseValue: 0, category: '知识', note: '等于EDU' },
  { name: '人类学', baseValue: 1, category: '知识' },
  { name: '考古学', baseValue: 1, category: '知识' },
  { name: '克苏鲁神话', baseValue: 0, category: '知识' },

  // 科学类
  { name: '科学（天文学）', baseValue: 1, category: '科学' },
  { name: '科学（生物学）', baseValue: 1, category: '科学' },
  { name: '科学（化学）', baseValue: 1, category: '科学' },
  { name: '科学（地质学）', baseValue: 1, category: '科学' },
  { name: '科学（数学）', baseValue: 10, category: '科学' },
  { name: '科学（药学）', baseValue: 1, category: '科学' },
  { name: '科学（物理学）', baseValue: 1, category: '科学' },
  { name: '科学（动物学）', baseValue: 1, category: '科学' },

  // 技术类
  { name: '急救', baseValue: 30, category: '技术' },
  { name: '医学', baseValue: 1, category: '技术' },
  { name: '电器修理', baseValue: 10, category: '技术' },
  { name: '机械修理', baseValue: 10, category: '技术' },
  { name: '操作重型机械', baseValue: 1, category: '技术' },
  { name: '锁匠', baseValue: 1, category: '技术' },
  { name: '妙手', baseValue: 10, category: '技术' },
  { name: '计算机', baseValue: 1, category: '技术' },
  { name: '电气维修', baseValue: 10, category: '技术' },
  { name: '电子学', baseValue: 1, category: '技术' },

  // 运动类
  { name: '攀爬', baseValue: 20, category: '运动' },
  { name: '游泳', baseValue: 20, category: '运动' },
  { name: '跳跃', baseValue: 20, category: '运动' },
  { name: '骑马', baseValue: 5, category: '运动' },
  { name: '骑乘', baseValue: 5, category: '运动' },
  { name: '驾驶（汽车）', baseValue: 20, category: '运动' },
  { name: '驾驶（飞机）', baseValue: 1, category: '运动' },
  { name: '驾驶（船）', baseValue: 1, category: '运动' },
  { name: '潜行', baseValue: 20, category: '运动' },
  { name: '生存', baseValue: 10, category: '运动' },

  // 艺术类
  { name: '艺术与手艺（绘画）', baseValue: 5, category: '艺术' },
  { name: '艺术与手艺（摄影）', baseValue: 5, category: '艺术' },
  { name: '艺术与手艺（写作）', baseValue: 5, category: '艺术' },
  { name: '艺术与手艺（乐器）', baseValue: 5, category: '艺术' },
  { name: '艺术与手艺（表演）', baseValue: 5, category: '艺术' },
  { name: '艺术与手艺（唱歌）', baseValue: 5, category: '艺术' },
  { name: '艺术与手艺（任一）', baseValue: 5, category: '艺术' },

  // 其他
  { name: '估价', baseValue: 5, category: '其他' },
  { name: '自然学', baseValue: 10, category: '其他' },
  { name: '信用评级', baseValue: 0, category: '其他' },
]

/**
 * 属性名称映射（英文 → 中文）
 */
const ATTR_NAMES = {
  STR: '力量',
  CON: '体质',
  SIZ: '体型',
  DEX: '敏捷',
  APP: '外貌',
  INT: '智力',
  POW: '意志',
  EDU: '教育',
  LUK: '幸运'
}

/**
 * 属性骰子规则说明
 */
const ATTR_DICE_RULES = {
  STR: '40/50/60/70/80',
  CON: '40/50/60/70/80',
  SIZ: '40/50/60/70/80',
  DEX: '40/50/60/70/80',
  APP: '40/50/60/70/80',
  INT: '40/50/60/70/80',
  POW: '40/50/60/70/80',
  EDU: '40/50/60/70/80',
  LUK: '15~90(5的倍数)'
}

/**
 * 掷骰：nDm
 */
function rollDice(n, m) {
  let total = 0
  for (let i = 0; i < n; i++) {
    total += Math.floor(Math.random() * m) + 1
  }
  return total
}

/**
 * 随机生成属性值
 * 规则：40、3个50、2个60、70、80 分配到8个属性上
 * 幸运值：15~90之间任意5的整倍数
 */
function rollAttributes() {
  const attrKeys = ['STR', 'CON', 'SIZ', 'DEX', 'APP', 'INT', 'POW', 'EDU']
  const values = [40, 50, 50, 50, 60, 60, 70, 80]
  // Fisher-Yates 洗牌
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]]
  }
  const attributes = {}
  attrKeys.forEach((key, idx) => {
    attributes[key] = values[idx]
  })
  // 幸运值：15~90，5的整倍数
  const luckMultiples = []
  for (let v = 15; v <= 90; v += 5) luckMultiples.push(v)
  attributes.LUK = luckMultiples[Math.floor(Math.random() * luckMultiples.length)]
  return attributes
}

/**
 * 获取技能分类列表（已按 category 分组）
 */
function getSkillsByCategory() {
  const map = {}
  SKILLS.forEach(skill => {
    if (!map[skill.category]) {
      map[skill.category] = []
    }
    map[skill.category].push(skill)
  })
  return map
}

/**
 * 从声明式 skillSpec 提取职业指定的技能名 / 分类占位串
 * 用于 isOccSkill 判断与职业点识别的基础名前缀匹配等价
 */
function getOccupationSkillNames(spec) {
  if (!spec) return []
  const names = [...(spec.locked || [])]
  ;(spec.chooseFrom || []).forEach(g => {
    ;(g.members || []).forEach(m => names.push(m))
  })
  ;(spec.mutualExclusion || []).forEach(pair => {
    pair.forEach(m => names.push(m))
  })
  const catMap = {
    '艺术': '艺术与手艺（任一）',
    '科学': '科学（专业，两种）',
    '社交': '一项社交技能（取悦、话术、恐吓、说服）'
  }
  Object.keys(spec.categoryLimits || {}).forEach(cat => {
    if (catMap[cat]) names.push(catMap[cat])
  })
  return names
}

module.exports = {
  OCCUPATIONS,
  SKILLS,
  ATTR_NAMES,
  ATTR_DICE_RULES,
  rollAttributes,
  rollDice,
  getSkillsByCategory,
  getOccupationSkillNames
}
