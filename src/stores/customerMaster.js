/**
 * Customer Master Store - 客戶主檔維護
 * 
 * 管理客戶主檔的列表、搜尋、編輯和匯出功能
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/utils/supabase'

export const useCustomerMasterStore = defineStore('customerMaster', () => {
  // State
  const customers = ref([])
  const loading = ref(false)
  const searchKeyword = ref('')
  const currentPage = ref(1)
  const pageSize = ref(20)
  const sortBy = ref('updated_at') // 預設排序欄位
  const sortOrder = ref('desc') // 'asc' 或 'desc'

  // Computed - 搜尋過濾
  const filteredCustomers = computed(() => {
    if (!searchKeyword.value) {
      return customers.value
    }

    const keyword = searchKeyword.value.toLowerCase()
    return customers.value.filter(customer => {
      return (
        customer.display_name?.toLowerCase().includes(keyword) ||
        customer.line_user_id?.toLowerCase().includes(keyword) ||
        customer.erp_bi_code?.toLowerCase().includes(keyword) ||
        customer.erp_bi_name?.toLowerCase().includes(keyword)
      )
    })
  })

  // Computed - 排序後的客戶列表
  const sortedCustomers = computed(() => {
    const list = [...filteredCustomers.value]
    
    list.sort((a, b) => {
      let aVal = a[sortBy.value]
      let bVal = b[sortBy.value]

      // 處理 null/undefined
      if (aVal === null || aVal === undefined) aVal = ''
      if (bVal === null || bVal === undefined) bVal = ''

      // 數字比較
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder.value === 'asc' ? aVal - bVal : bVal - aVal
      }

      // 日期比較
      if (sortBy.value.includes('_at')) {
        const dateA = aVal ? new Date(aVal) : new Date(0)
        const dateB = bVal ? new Date(bVal) : new Date(0)
        return sortOrder.value === 'asc' ? dateA - dateB : dateB - dateA
      }

      // 字串比較
      const strA = String(aVal).toLowerCase()
      const strB = String(bVal).toLowerCase()
      
      if (sortOrder.value === 'asc') {
        return strA.localeCompare(strB, 'zh-TW')
      } else {
        return strB.localeCompare(strA, 'zh-TW')
      }
    })

    return list
  })

  // Computed - 分頁後的客戶列表
  const paginatedCustomers = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return sortedCustomers.value.slice(start, end)
  })

  // Computed - 總頁數
  const totalPages = computed(() => {
    return Math.ceil(sortedCustomers.value.length / pageSize.value)
  })

  // Computed - 統計資料
  const statistics = computed(() => {
    const total = customers.value.length
    const withErp = customers.value.filter(c => c.erp_bi_code && c.erp_bi_name).length
    const withoutErp = total - withErp

    return {
      total,
      withErp,
      withoutErp,
      percentage: total > 0 ? Math.round((withErp / total) * 100) : 0
    }
  })

  // Actions

  /**
   * 載入所有客戶資料
   */
  async function fetchAllCustomers() {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, line_user_id, display_name, picture_url, erp_bi_code, erp_bi_name, message_count, updated_at, created_at, last_message_at')
        .order('updated_at', { ascending: false })

      if (error) throw error

      customers.value = data || []
      console.log('✅ 載入客戶資料:', customers.value.length, '筆')
    } catch (error) {
      console.error('❌ 載入客戶資料失敗:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新客戶的 ERP 資料
   * @param {number} userId - 客戶 ID
   * @param {object} erpData - ERP 資料 { erp_bi_code, erp_bi_name }
   */
  async function updateCustomerErp(userId, erpData) {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          erp_bi_code: erpData.erp_bi_code || null,
          erp_bi_name: erpData.erp_bi_name || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      // 更新本地資料
      const index = customers.value.findIndex(c => c.id === userId)
      if (index !== -1) {
        customers.value[index] = {
          ...customers.value[index],
          erp_bi_code: erpData.erp_bi_code || null,
          erp_bi_name: erpData.erp_bi_name || null,
          updated_at: new Date().toISOString()
        }
      }

      console.log('✅ 更新 ERP 資料成功:', userId)
      return true
    } catch (error) {
      console.error('❌ 更新 ERP 資料失敗:', error)
      throw error
    }
  }

  /**
   * 設定搜尋關鍵字
   * @param {string} keyword - 搜尋關鍵字
   */
  function setSearchKeyword(keyword) {
    searchKeyword.value = keyword
    currentPage.value = 1 // 搜尋時重置到第一頁
  }

  /**
   * 設定排序
   * @param {string} field - 排序欄位
   */
  function setSorting(field) {
    if (sortBy.value === field) {
      // 切換排序方向
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      // 新欄位，預設降冪
      sortBy.value = field
      sortOrder.value = 'desc'
    }
    currentPage.value = 1 // 排序時重置到第一頁
  }

  /**
   * 設定當前頁碼
   * @param {number} page - 頁碼
   */
  function setCurrentPage(page) {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

  /**
   * 設定每頁筆數
   * @param {number} size - 每頁筆數
   */
  function setPageSize(size) {
    pageSize.value = size
    currentPage.value = 1 // 改變每頁筆數時重置到第一頁
  }

  /**
   * 匯出為 CSV 格式
   * @returns {string} CSV 內容
   */
  function exportToCSV() {
    // CSV 標題
    const headers = [
      'ID',
      'LINE User ID',
      'LINE 名稱',
      'ERP 客戶編號',
      'ERP 客戶名稱',
      '訊息數量',
      '最後更新時間',
      '建立時間',
      '最後訊息時間'
    ]

    // CSV 內容
    const rows = sortedCustomers.value.map(customer => [
      customer.id,
      customer.line_user_id || '',
      customer.display_name || '',
      customer.erp_bi_code || '',
      customer.erp_bi_name || '',
      customer.message_count || 0,
      customer.updated_at ? new Date(customer.updated_at).toLocaleString('zh-TW') : '',
      customer.created_at ? new Date(customer.created_at).toLocaleString('zh-TW') : '',
      customer.last_message_at ? new Date(customer.last_message_at).toLocaleString('zh-TW') : ''
    ])

    // 組合 CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return '\uFEFF' + csvContent // 加入 BOM 讓 Excel 正確識別 UTF-8
  }

  /**
   * 下載 CSV 檔案
   */
  function downloadCSV() {
    const csvContent = exportToCSV()
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    const timestamp = new Date().toISOString().slice(0, 10)
    link.setAttribute('href', url)
    link.setAttribute('download', `客戶主檔_${timestamp}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    console.log('✅ CSV 檔案已下載')
  }

  /**
   * 重置所有篩選條件
   */
  function resetFilters() {
    searchKeyword.value = ''
    currentPage.value = 1
    sortBy.value = 'updated_at'
    sortOrder.value = 'desc'
  }

  return {
    // State
    customers,
    loading,
    searchKeyword,
    currentPage,
    pageSize,
    sortBy,
    sortOrder,
    
    // Computed
    filteredCustomers,
    sortedCustomers,
    paginatedCustomers,
    totalPages,
    statistics,
    
    // Actions
    fetchAllCustomers,
    updateCustomerErp,
    setSearchKeyword,
    setSorting,
    setCurrentPage,
    setPageSize,
    exportToCSV,
    downloadCSV,
    resetFilters
  }
})
