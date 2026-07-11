// pages/occupation/occupation.js
const { OCCUPATIONS } = require('../../utils/coc-data')
const { getCharacterById, saveCharacter, saveDraft, loadDraft, clearDraft, isDraftNewer } = require('../../utils/character')
const { saveThenBack } = require('../../utils/nav')

Page({
  data: {
    occupations: OCCUPATIONS,
    filteredOccupations: OCCUPATIONS,
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
    const filtered = OCCUPATIONS.filter(o =>
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
