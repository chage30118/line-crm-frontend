<template>
  <header class="app-header">
    <div class="header-left">
      <el-button
        :icon="sidebarCollapsed ? 'Expand' : 'Fold'"
        circle
        @click="uiStore.toggleSidebar()"
        class="toggle-btn"
      />
      <h1 class="app-title">
        <el-icon><ChatLineRound /></el-icon>
        LINE CRM 系統
      </h1>
    </div>

    <div class="header-center">
      <el-tag type="info">
        客戶總數: {{ totalCustomers }}
      </el-tag>
      <el-tag v-if="unreadCount > 0" type="warning">
        未讀: {{ unreadCount }}
      </el-tag>
    </div>

    <div class="header-right">
      <el-button
        :icon="crmSidebarVisible ? 'Hide' : 'View'"
        @click="uiStore.toggleCRMSidebar()"
      >
        {{ crmSidebarVisible ? '隱藏' : '顯示' }} 客戶資訊
      </el-button>

      <el-dropdown>
        <el-button :icon="'More'" circle />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item :icon="'Refresh'" @click="refreshData">
              重新整理
            </el-dropdown-item>
            <el-dropdown-item :icon="'Download'" divided>
              匯出資料
            </el-dropdown-item>
            <el-dropdown-item :icon="'Setting'">
              系統設定
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { useCustomersStore } from '@/stores/customers'
import { useUIStore } from '@/stores/ui'

const customersStore = useCustomersStore()
const uiStore = useUIStore()

const { totalCustomers, unreadCount } = storeToRefs(customersStore)
const { sidebarCollapsed, crmSidebarVisible } = storeToRefs(uiStore)

// 重新整理資料
const refreshData = async () => {
  try {
    await customersStore.fetchCustomers()
    ElMessage.success('資料重新整理成功')
  } catch (error) {
    ElMessage.error('重新整理失敗')
  }
}
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  padding: 0 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toggle-btn {
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}

.toggle-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
}

.app-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.header-center {
  display: flex;
  gap: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right .el-button {
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}

.header-right .el-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
}

@media (max-width: 768px) {
  .app-header {
    padding: 0 12px;
  }

  .app-title {
    font-size: 16px;
  }

  .header-center {
    display: none;
  }
}
</style>
