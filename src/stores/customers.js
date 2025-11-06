import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'

export const useCustomersStore = defineStore('customers', {
  state: () => ({
    customers: [],
    loading: false,
    selectedCustomerId: null,
    searchKeyword: '',
    filterTag: '',
    realtimeChannel: null // Realtime 訂閱頻道
  }),

  getters: {
    /**
     * 取得目前選中的客戶
     */
    selectedCustomer: (state) => {
      return state.customers.find(c => c.id === state.selectedCustomerId)
    },

    /**
     * 客戶總數
     */
    totalCustomers: (state) => state.customers.length,

    /**
     * 未讀訊息數量
     */
    unreadCount: (state) => {
      return state.customers.filter(c => c.unread_count > 0).length
    },

    /**
     * 過濾後的客戶列表
     */
    filteredCustomers: (state) => {
      let result = state.customers

      // 關鍵字搜尋
      if (state.searchKeyword) {
        const keyword = state.searchKeyword.toLowerCase()
        result = result.filter(customer => {
          return (
            customer.display_name?.toLowerCase().includes(keyword) ||
            customer.line_user_id?.toLowerCase().includes(keyword) ||
            customer.group_display_name?.toLowerCase().includes(keyword) ||
            customer.erp_bi_code?.toLowerCase().includes(keyword) ||
            customer.erp_bi_name?.toLowerCase().includes(keyword)
          )
        })
      }

      // 標籤過濾
      if (state.filterTag) {
        result = result.filter(customer => {
          return customer.tags?.includes(state.filterTag)
        })
      }

      return result
    }
  },

  actions: {
    /**
     * 取得所有客戶
     */
    async fetchCustomers() {
      this.loading = true
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('last_message_at', { ascending: false, nullsFirst: false })

        if (error) throw error

        console.log('成功載入客戶列表:', data?.length || 0, '位')
        this.customers = data || []
      } catch (error) {
        console.error('載入客戶列表失敗:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 選擇客戶
     * @param {string} customerId - 客戶 ID
     */
    async selectCustomer(customerId) {
      console.log('選擇客戶:', customerId)
      this.selectedCustomerId = customerId
      
      // 標記該客戶的訊息為已讀
      const customer = this.customers.find(c => c.id === customerId)
      if (customer && customer.unread_count > 0) {
        await this.markAsRead(customerId)
      }
    },
    
    /**
     * 標記客戶訊息為已讀
     * @param {string} customerId - 客戶 ID
     */
    async markAsRead(customerId) {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002'
        const response = await fetch(`${backendUrl}/api/users/${customerId}/mark-read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok) {
          throw new Error('標記已讀失敗')
        }
        
        // 更新本地狀態
        const index = this.customers.findIndex(c => c.id === customerId)
        if (index !== -1) {
          this.customers[index].unread_count = 0
        }
        
        console.log('已標記為已讀:', customerId)
      } catch (error) {
        console.error('標記已讀失敗:', error)
      }
    },

    /**
     * 更新客戶資料
     * @param {string} customerId - 客戶 ID
     * @param {object} updates - 更新的欄位
     */
    async updateCustomer(customerId, updates) {
      try {
        const { data, error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', customerId)
          .select()
          .single()

        if (error) throw error

        // 更新本地狀態
        const index = this.customers.findIndex(c => c.id === customerId)
        if (index !== -1) {
          this.customers[index] = { ...this.customers[index], ...data }
        }

        console.log('客戶資料更新成功:', customerId)
        return data
      } catch (error) {
        console.error('更新客戶資料失敗:', error)
        throw error
      }
    },

    /**
     * 設定搜尋關鍵字
     * @param {string} keyword - 搜尋關鍵字
     */
    setSearchKeyword(keyword) {
      this.searchKeyword = keyword
    },

    /**
     * 設定標籤過濾
     * @param {string} tag - 標籤
     */
    setFilterTag(tag) {
      this.filterTag = tag
    },

    /**
     * 清除過濾條件
     */
    clearFilters() {
      this.searchKeyword = ''
      this.filterTag = ''
    },
    
    /**
     * 訂閱 Realtime 更新
     */
    subscribeToRealtimeUpdates() {
      // 避免重複訂閱
      if (this.realtimeChannel) {
        console.log('[Realtime] 已存在訂閱，略過')
        return
      }
      
      console.log('[Realtime] 開始訂閱客戶資料變更...')
      
      // 訂閱 users 表的變更
      this.realtimeChannel = supabase
        .channel('users-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'users'
          },
          (payload) => {
            console.log('[Realtime] 收到 users 變更:', payload)
            this.handleUserChange(payload)
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] 訂閱狀態:', status)
        })
    },
    
    /**
     * 處理用戶資料變更
     */
    handleUserChange(payload) {
      const { eventType, new: newRecord, old: oldRecord } = payload
      
      switch (eventType) {
        case 'INSERT':
          // 新增用戶
          console.log('[Realtime] 新增用戶:', newRecord.display_name)
          this.customers.unshift(newRecord)
          break
          
        case 'UPDATE':
          // 更新用戶
          const updateIndex = this.customers.findIndex(c => c.id === newRecord.id)
          if (updateIndex !== -1) {
            console.log('[Realtime] 更新用戶:', newRecord.display_name)
            this.customers[updateIndex] = newRecord
            
            // 如果有新訊息（last_message_at 變更），移到最上面
            if (newRecord.last_message_at !== oldRecord?.last_message_at) {
              const [updatedCustomer] = this.customers.splice(updateIndex, 1)
              this.customers.unshift(updatedCustomer)
            }
          }
          break
          
        case 'DELETE':
          // 刪除用戶
          const deleteIndex = this.customers.findIndex(c => c.id === oldRecord.id)
          if (deleteIndex !== -1) {
            console.log('[Realtime] 刪除用戶:', oldRecord.display_name)
            this.customers.splice(deleteIndex, 1)
          }
          break
      }
    },
    
    /**
     * 取消訂閱 Realtime
     */
    unsubscribeFromRealtimeUpdates() {
      if (this.realtimeChannel) {
        console.log('[Realtime] 取消訂閱')
        supabase.removeChannel(this.realtimeChannel)
        this.realtimeChannel = null
      }
    }
  }
})
