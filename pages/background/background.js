// pages/background/background.js
const { getCharacterById, saveCharacter } = require('../../utils/character')
const { saveThenBack } = require('../../utils/nav')

Page({
  data: {
    characterId: '',
    background: {
      story: '',
      keyPeople: '',
      gear: '',
      beliefs: '',
      traits: '',
      ideology: '',
      wounds: ''
    },
    fields: [
      { key: 'story',     label: '个人描述',     placeholder: '描述这位调查员的外貌、性格、过往经历……',    rows: 5 },
      { key: 'keyPeople', label: '重要之人',     placeholder: '简要记录对调查员重要的人物……',           rows: 3 },
      { key: 'gear',      label: '重要之物',     placeholder: '对你而言最珍贵的物品或记忆……',           rows: 3 },
      { key: 'beliefs',   label: '重要地点',     placeholder: '对你有重要意义的地点……',                 rows: 3 },
      { key: 'traits',    label: '特质',         placeholder: '你有什么独特的习惯、口头禅、或行为特征……', rows: 3 },
      { key: 'ideology',  label: '意识形态与信仰', placeholder: '你信仰什么？秉持怎样的价值观……',         rows: 3 },
      { key: 'wounds',    label: '重要伤疤与创伤', placeholder: '记录遭受的肉体伤害或心理创伤……',         rows: 3 },
    ]
  },

  onLoad(options) {
    const { id } = options
    const character = getCharacterById(id)
    if (character) {
      this.setData({
        characterId: id,
        background: { ...this.data.background, ...character.background }
      })
    }
  },

  onInput(e) {
    const { key } = e.currentTarget.dataset
    const value = e.detail.value
    const background = { ...this.data.background, [key]: value }
    this.setData({ background })
  },

  onSave() {
    const { characterId, background } = this.data
    const character = getCharacterById(characterId)
    if (!character) return
    character.background = background
    saveCharacter(character)
    saveThenBack({ title: '背景已保存' })
  }
})
