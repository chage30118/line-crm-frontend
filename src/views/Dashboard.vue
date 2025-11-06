<template>
  <div class="dashboard-layout">
    <!-- 頂部導航 -->
    <AppHeader />

    <!-- 三欄布局 -->
    <div class="main-content">
      <!-- 左側：客戶列表 -->
      <aside :class="['customer-sidebar', { collapsed: sidebarCollapsed }]">
        <CustomerList />
      </aside>

      <!-- 中間：訊息歷史 -->
      <main class="message-main">
        <MessageThread v-if="selectedCustomerId" />
        <el-empty v-else description="請選擇一個客戶查看訊息" />
      </main>

      <!-- 右側：CRM 資訊 -->
      <aside v-if="crmSidebarVisible" class="crm-sidebar">
        <CustomerCRM v-if="selectedCustomerId" />
        <el-empty v-else description="請選擇一個客戶查看詳細資訊" />
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useCustomersStore } from '@/stores/customers'
import { useUIStore } from '@/stores/ui'
import AppHeader from '@/components/common/AppHeader.vue'
import CustomerList from '@/components/customer/CustomerList.vue'
import MessageThread from '@/components/message/MessageThread.vue'
import CustomerCRM from '@/components/crm/CustomerCRM.vue'

const customersStore = useCustomersStore()
const uiStore = useUIStore()

const { selectedCustomerId } = storeToRefs(customersStore)
const { crmSidebarVisible, sidebarCollapsed } = storeToRefs(uiStore)

// 初始化載入客戶列表
onMounted(() => {
  customersStore.fetchCustomers()
})
</script>

<style scoped>
.dashboard-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.customer-sidebar {
  width: 300px;
  border-right: 1px solid var(--el-border-color);
  overflow-y: auto;
  background-color: #fff;
  transition: width 0.3s;
}

.customer-sidebar.collapsed {
  width: 60px;
}

.message-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #f5f7fa;
}

.crm-sidebar {
  width: 350px;
  border-left: 1px solid var(--el-border-color);
  overflow-y: auto;
  background-color: #fff;
}

/* 響應式設計 */
@media (max-width: 1200px) {
  .customer-sidebar {
    position: absolute;
    left: 0;
    top: 60px;
    bottom: 0;
    z-index: 100;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  }

  .customer-sidebar.collapsed {
    left: -300px;
  }

  .crm-sidebar {
    position: fixed;
    right: 0;
    top: 60px;
    bottom: 0;
    z-index: 100;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  }
}

@media (max-width: 768px) {
  .customer-sidebar {
    width: 100%;
  }

  .crm-sidebar {
    width: 100%;
  }
}
</style>
