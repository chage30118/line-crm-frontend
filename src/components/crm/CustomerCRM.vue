<template>
  <div class="customer-crm">
    <el-tabs v-model="activeTab">
      <!-- 基本資訊 -->
      <el-tab-pane label="基本資訊" name="basic">
        <BasicInfo :customer="selectedCustomer" @update="handleUpdate" />
      </el-tab-pane>

      <!-- 標籤管理 -->
      <el-tab-pane label="標籤管理" name="tags">
        <TagManager :customer="selectedCustomer" @update="handleUpdate" />
      </el-tab-pane>

      <!-- 統計資料 -->
      <el-tab-pane label="統計資料" name="stats">
        <CustomerStats :customer="selectedCustomer" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useCustomersStore } from '@/stores/customers'
import BasicInfo from './BasicInfo.vue'
import TagManager from './TagManager.vue'
import CustomerStats from './CustomerStats.vue'

const customersStore = useCustomersStore()
const { selectedCustomer } = storeToRefs(customersStore)

const activeTab = ref('basic')

// 處理更新
const handleUpdate = async (updates) => {
  console.log('[CustomerCRM] 收到更新請求:', updates)
  console.log('[CustomerCRM] 目標客戶 ID:', selectedCustomer.value?.id)
  
  if (selectedCustomer.value?.id) {
    try {
      await customersStore.updateCustomer(selectedCustomer.value.id, updates)
      console.log('[CustomerCRM] 更新成功')
    } catch (error) {
      console.error('[CustomerCRM] 更新失敗:', error)
      throw error
    }
  } else {
    console.error('[CustomerCRM] 沒有選中的客戶')
  }
}
</script>

<style scoped>
.customer-crm {
  height: 100%;
  overflow-y: auto;
}

:deep(.el-tabs__header) {
  padding: 0 16px;
  margin: 0;
}

:deep(.el-tabs__content) {
  padding: 16px;
}
</style>
