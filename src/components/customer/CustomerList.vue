<template>
  <div class="customer-list">
    <!-- 搜尋列 -->
    <div class="search-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜尋客戶..."
        :prefix-icon="'Search'"
        clearable
        @input="handleSearch"
      />
    </div>

    <!-- 客戶列表 -->
    <div class="list-container" v-loading="loading">
      <el-scrollbar v-if="filteredCustomers.length > 0">
        <CustomerItem
          v-for="customer in filteredCustomers"
          :key="customer.id"
          :customer="customer"
          :active="customer.id === selectedCustomerId"
          @click="selectCustomer(customer.id)"
        />
      </el-scrollbar>

      <el-empty
        v-else
        description="沒有找到客戶"
        :image-size="100"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCustomersStore } from '@/stores/customers'
import CustomerItem from './CustomerItem.vue'

const customersStore = useCustomersStore()
const { loading, filteredCustomers, selectedCustomerId } = storeToRefs(customersStore)

const searchKeyword = ref('')

// 處理搜尋
const handleSearch = () => {
  customersStore.setSearchKeyword(searchKeyword.value)
}

// 選擇客戶
const selectCustomer = (customerId) => {
  customersStore.selectCustomer(customerId)
}
</script>

<style scoped>
.customer-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.search-bar {
  padding: 12px;
  border-bottom: 1px solid var(--el-border-color);
  background-color: #fff;
}

.list-container {
  flex: 1;
  overflow: hidden;
}

.el-scrollbar {
  height: 100%;
}
</style>
