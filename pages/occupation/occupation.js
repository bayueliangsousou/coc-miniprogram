// pages/occupation/occupation.js
const { OCCUPATIONS } = require('../../utils/coc-data')
const { getCharacterById, saveCharacter } = require('../../utils/character')

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
      this.setData({
        characterId: id,
        selectedId: character ? character.occupationId : ''
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
      wx.showToast({ title: `已选择：${occ.name}`, icon: 'success' })
      setTimeout(() => wx.navigateBack(), 600)
    }
  }
})
