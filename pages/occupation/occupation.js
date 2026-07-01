// pages/occupation/occupation.js
const { OCCUPATIONS } = require('../../utils/coc-data')
const { getCharacterById, saveCharacter, saveDraft, loadDraft, clearDraft, isDraftNewer } = require('../../utils/character')
const { saveThenBack } = require('../../utils/nav')

// 从声明式 skillSpec 生成职业选择页的技能标签（纯展示用）
function buildSkillChips(spec) {
  if (!spec) return []
  const chips = []
  ;(spec.locked || []).forEach(s => chips.push(s))
  ;(spec.chooseFrom || []).forEach(g => {
    if (g.count === 1) {
      chips.push(`二选一：${g.members.join(' / ')}`)
    } else {
      chips.push(`下列选${g.count}：${g.members.join('、')}`)
    }
  })
  const catLabel = { '社交': '社交', '艺术': '艺术', '科学': '科学' }
  Object.keys(spec.categoryLimits || {}).forEach(cat => {
    const n = spec.categoryLimits[cat]
    chips.push(`${catLabel[cat] || cat}选${n}`)
  })
  if (spec.chooseAny) {
    chips.push(`自选${spec.chooseAny}项技能`)
  }
  return chips
}

const DECORATED = OCCUPATIONS.map(o => ({
  ...o,
  skillChips: buildSkillChips(o.skillSpec)
}))

Page({
  data: {
    occupations: DECORATED,
    filteredOccupations: DECORATED,
    searchText: '',
    selectedId: '',
    characterId: ''
  },

  onLoad(options) {
    const { id } = options
    if (id) {
      const character = getCharacterById(id)
      let occupationId = character ? character.occupationId : ''
      // 草稿优先：用草稿里的 occupationId 覆盖存档
      const draft = loadDraft(id)
      if (draft && draft.character && isDraftNewer(draft, character)) {
        occupationId = draft.character.occupationId || occupationId
      }
      this.setData({
        characterId: id,
        selectedId: occupationId
      })
    }
  },

  onSearch(e) {
    const text = e.detail.value
    const filtered = DECORATED.filter(o =>
      o.name.includes(text) || o.desc.includes(text)
    )
    this.setData({ searchText: text, filteredOccupations: filtered })
  },

  onSelectOccupation(e) {
    const { id } = e.currentTarget.dataset
    this.setData({ selectedId: id })
  },

  onConfirm() {
    const { selectedId, characterId } = this.data
    if (!selectedId) {
      wx.showToast({ title: '请选择一个职业', icon: 'none' })
      return
    }
    const occ = OCCUPATIONS.find(o => o.id === selectedId)
    const character = getCharacterById(characterId)
    if (character && occ) {
      character.occupation = occ.name
      character.occupationId = occ.id
      saveCharacter(character)
      clearDraft(characterId)
      saveThenBack({ title: `已选择：${occ.name}` })
    }
  },

  // 页面隐藏/关闭时落草稿，防未保存丢失
  onHide() {
    const { characterId, selectedId } = this.data
    if (!characterId) return
    const character = getCharacterById(characterId) || { id: characterId }
    saveDraft({ ...character, occupationId: selectedId })
  }
})
