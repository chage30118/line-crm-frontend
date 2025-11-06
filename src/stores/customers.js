import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'

export const useCustomersStore = defineStore('customers', {
  state: () => ({
    customers: [],
    loading: false,
    selectedCustomerId: null,
    searchKeyword: '',
    filterTag: ''
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
    selectCustomer(customerId) {
      console.log('選擇客戶:', customerId)
      this.selectedCustomerId = customerId
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
    }
  }
})
