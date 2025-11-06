import { defineStore } from 'pinia'

export const useUIStore = defineStore('ui', {
  state: () => ({
    sidebarCollapsed: false,
    crmSidebarVisible: true,
    isMobile: false
  }),

  getters: {
    /**
     * 是否為桌面模式
     */
    isDesktop: (state) => !state.isMobile
  },

  actions: {
    /**
     * 切換左側客戶列表摺疊狀態
     */
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
      console.log('左側客戶列表', this.sidebarCollapsed ? '摺疊' : '展開')
    },

    /**
     * 切換右側 CRM 資訊側邊欄
     */
    toggleCRMSidebar() {
      this.crmSidebarVisible = !this.crmSidebarVisible
      console.log('右側 CRM 側邊欄', this.crmSidebarVisible ? '顯示' : '隱藏')
    },

    /**
     * 設定側邊欄狀態
     * @param {boolean} collapsed - 是否摺疊
     */
    setSidebarCollapsed(collapsed) {
      this.sidebarCollapsed = collapsed
    },

    /**
     * 設定 CRM 側邊欄顯示狀態
     * @param {boolean} visible - 是否顯示
     */
    setCRMSidebarVisible(visible) {
      this.crmSidebarVisible = visible
    },

    /**
     * 設定裝置類型
     * @param {boolean} isMobile - 是否為行動裝置
     */
    setMobile(isMobile) {
      this.isMobile = isMobile

      // 行動裝置預設隱藏 CRM 側邊欄
      if (isMobile) {
        this.crmSidebarVisible = false
      }
    },

    /**
     * 初始化 UI 狀態（根據視窗大小）
     */
    initializeUI() {
      const width = window.innerWidth
      this.setMobile(width < 1200)

      // 監聽視窗大小變化
      window.addEventListener('resize', () => {
        const newWidth = window.innerWidth
        this.setMobile(newWidth < 1200)
      })
    }
  }
})
