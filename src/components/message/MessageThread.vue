<template>
  <div class="message-thread">
    <!-- 訊息標題列 -->
    <div class="thread-header">
      <div class="header-info">
        <img 
          v-if="avatarSrc" 
          :src="avatarSrc" 
          @error="onAvatarError"
          @load="onAvatarLoad"
          class="avatar-img"
          alt="用戶頭像"
        />
        <el-avatar v-else :size="40">
          <el-icon><User /></el-icon>
        </el-avatar>
        <div class="header-text">
          <h3>{{ displayName }}</h3>
          <p v-if="selectedCustomer?.group_display_name" class="group-name">
            <el-icon><ChatLineRound /></el-icon>
            {{ selectedCustomer.group_display_name }}
          </p>
        </div>
      </div>

      <div class="header-actions">
        <el-button :icon="'Refresh'" circle @click="loadMessages" />
        <el-button :icon="'Search'" circle />
        <el-button :icon="'More'" circle />
      </div>
    </div>

    <!-- 訊息列表 -->
    <MessageList />

    <!-- 發送訊息區域 -->
    <MessageSender />
  </div>
</template>

<script setup>
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useCustomersStore } from '@/stores/customers'
import { useMessagesStore } from '@/stores/messages'
import { useAvatar } from '@/composables/useAvatar'
import MessageList from './MessageList.vue'
import MessageSender from './MessageSender.vue'

const customersStore = useCustomersStore()
const messagesStore = useMessagesStore()

const { selectedCustomer, selectedCustomerId } = storeToRefs(customersStore)

// 使用頭像處理 composable
const { avatarSrc, onError: onAvatarError, onLoad: onAvatarLoad } = useAvatar(
  computed(() => selectedCustomer.value?.picture_url)
)

// 顯示名稱
const displayName = computed(() => {
  return selectedCustomer.value?.customer_name ||
         selectedCustomer.value?.display_name ||
         '未命名客戶'
})

// 載入訊息
const loadMessages = async () => {
  if (!selectedCustomerId.value) return

  await messagesStore.fetchMessages(selectedCustomerId.value)
  messagesStore.subscribeToMessages(selectedCustomerId.value)
}

// 監聽客戶切換
watch(selectedCustomerId, (newId) => {
  if (newId) {
    loadMessages()
  } else {
    messagesStore.clearMessages()
  }
})

// 初始化
onMounted(() => {
  if (selectedCustomerId.value) {
    loadMessages()
  }
})

// 清理
onUnmounted(() => {
  messagesStore.unsubscribeFromMessages()
})
</script>

<style scoped>
.message-thread {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f5f7fa;
}

.thread-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background-color: white;
  border-bottom: 1px solid var(--el-border-color);
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.header-text h3 {
  margin: 0;
  font-size: 16px;
  color: var(--el-text-color-primary);
}

.header-text p {
  margin: 4px 0 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.header-actions {
  display: flex;
  gap: 8px;
}
</style>
