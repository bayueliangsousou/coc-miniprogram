// pages/join-room/join-room.js
// 加入房间页面

const cloud = require('../../utils/cloud')
const { loadCharacters, getCharacterById } = require('../../utils/character')

Page({
  data: {
    roomCode: '',
    characters: [],
    selectedCharacterId: '',
    isJoining: false,
    error: '',
    // 使用真正的云函数调用（HTTP API）
    useMock: false
  },

  onLoad() {
    // 未登录不允许进入加入房间页
    if (!cloud.checkLogin()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    // 加载本地角色列表
    const characters = loadCharacters()
    this.setData({ characters })
  },

  // 房间号输入
  onRoomCodeInput(e) {
    const value = e.detail.value.replace(/\D/g, '')
    this.setData({ roomCode: value, error: '' })
  },

  // 角色选择
  onCharacterSelect(e) {
    const characterId = e.currentTarget.dataset.id
    this.setData({ selectedCharacterId: characterId })
  },

  // 确认加入
  async onJoinRoom() {
    const { roomCode, selectedCharacterId, useMock } = this.data

    if (!roomCode || roomCode.length !== 4) {
      this.setData({ error: '请输入4位数字房间号' })
      return
    }

    if (!selectedCharacterId) {
      this.setData({ error: '请选择要加入的角色' })
      return
    }

    this.setData({ isJoining: true, error: '' })

    try {
      const character = getCharacterById(selectedCharacterId)
      if (!character) {
        this.setData({ error: '角色不存在', isJoining: false })
        return
      }

      if (useMock) {
        // 本地模拟模式
        const result = await this.mockJoinRoom(roomCode, character)
        this.handleJoinResult(result)
      } else {
        // 云函数模式
        const result = await cloud.callCloudFunction('joinRoom', {
          roomCode,
          characterData: character
        })
        this.handleJoinResult(result)
      }
    } catch (err) {
      console.error('加入房间失败:', err)
      this.setData({ error: '加入失败: ' + err.message, isJoining: false })
    }
  },

  // 本地模拟加入房间
  mockJoinRoom(roomCode, character) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // 模拟：房间号 ABC123 可以加入，其他拒绝
        if (roomCode === 'ABC123') {
          resolve({
            code: 0,
            data: {
              success: true,
              campaignId: 'mock_campaign_' + roomCode,
              campaignName: '克苏鲁跑团 #' + roomCode,
              message: '加入成功！'
            }
          })
        } else {
          // 尝试从桌面端 localStorage 读取房间信息（需要同源）
          const rooms = wx.getStorageSync('coc_desktop_rooms') || []
          const room = rooms.find(r => r.roomCode === roomCode && r.status === 'active')
          
          if (room) {
            // 保存房间信息
            wx.setStorageSync('current_room', room)
            wx.setStorageSync('player_room_character', character)
            
            resolve({
              code: 0,
              data: {
                success: true,
                campaignId: room.campaignId,
                campaignName: room.campaignName,
                message: '加入成功！'
              }
            })
          } else {
            resolve({
              code: -1,
              message: '房间不存在或已关闭'
            })
          }
        }
      }, 500)
    })
  },

  // 处理加入结果
  handleJoinResult(result) {
    this.setData({ isJoining: false })
    
    if (result.code === 0 && result.data.success) {
      // 保存房间信息
      const { campaignId, campaignName } = result.data
      wx.setStorageSync('current_room', {
        campaignId,
        campaignName,
        roomCode: this.data.roomCode
      })
      wx.setStorageSync('player_room_character', {
        id: this.data.selectedCharacterId
      })
      
      wx.showToast({
        title: result.data.message || '加入成功',
        icon: 'success'
      })
      
      // 跳转到角色详情页
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' })
      }, 1500)
    } else {
      this.setData({ error: result.message || '加入失败' })
    }
  },

  // 返回
  onBack() {
    wx.navigateBack()
  }
})
