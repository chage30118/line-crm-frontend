import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'

export const useMessagesStore = defineStore('messages', {
  state: () => ({
    messages: [],
    loading: false,
    hasMore: true,
    currentUserId: null,
    realtimeChannel: null
  }),

  getters: {
    /**
     * 訊息總數
     */
    totalMessages: (state) => state.messages.length,

    /**
     * 按日期分組的訊息
     */
    messagesByDate: (state) => {
      const groups = {}

      state.messages.forEach(message => {
        const date = new Date(message.timestamp).toLocaleDateString('zh-TW')
        if (!groups[date]) {
          groups[date] = []
        }
        groups[date].push(message)
      })

      return groups
    }
  },

  actions: {
    /**
     * 取得指定客戶的訊息
     * @param {string} userId - 用戶 ID
     * @param {object} options - 選項（limit, offset）
     */
    async fetchMessages(userId, { limit = 50, offset = 0 } = {}) {
      this.loading = true

      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            user:users(*)
          `)
          .eq('user_id', userId)
          .order('timestamp', { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) throw error

        if (offset === 0) {
          this.messages = data || []
          this.currentUserId = userId
          console.log('載入訊息:', data?.length || 0, '則')
        } else {
          this.messages.push(...(data || []))
          console.log('載入更多訊息:', data?.length || 0, '則')
        }

        this.hasMore = data && data.length === limit
      } catch (error) {
        console.error('載入訊息失敗:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 訂閱即時訊息
     * @param {string} userId - 用戶 ID
     */
    subscribeToMessages(userId) {
      // 取消先前的訂閱
      this.unsubscribeFromMessages()

      console.log('訂閱即時訊息:', userId)

      this.realtimeChannel = supabase
        .channel(`messages:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log('收到新訊息:', payload.new)
            this.messages.unshift(payload.new)
          }
        )
        .subscribe()
    },

    /**
     * 取消訂閱即時訊息
     */
    unsubscribeFromMessages() {
      if (this.realtimeChannel) {
        console.log('取消訂閱即時訊息')
        supabase.removeChannel(this.realtimeChannel)
        this.realtimeChannel = null
      }
    },

    /**
     * 發送訊息（透過 LINE API）
     * @param {string} userId - 用戶 ID
     * @param {string} content - 訊息內容
     */
    async sendMessage(userId, content) {
      try {
        // TODO: 實作透過後端 API 發送 LINE 訊息
        console.log('發送訊息至:', userId, '內容:', content)

        // 暫時模擬發送成功
        const newMessage = {
          id: Date.now(),
          user_id: userId,
          text_content: content,
          message_type: 'text',
          timestamp: new Date().toISOString(),
          direction: 'outgoing'
        }

        this.messages.unshift(newMessage)
        return newMessage
      } catch (error) {
        console.error('發送訊息失敗:', error)
        throw error
      }
    },

    /**
     * 清空訊息列表
     */
    clearMessages() {
      this.messages = []
      this.currentUserId = null
      this.hasMore = true
      this.unsubscribeFromMessages()
    }
  }
})
