<template>
  <div class="message-sender">
    <div class="sender-toolbar">
      <el-button :icon="'Picture'" circle title="傳送圖片" />
      <el-button :icon="'Paperclip'" circle title="傳送檔案" />
      <el-button :icon="'ChatLineRound'" circle title="快捷回覆" />
    </div>

    <div class="sender-input">
      <el-input
        v-model="messageText"
        type="textarea"
        :rows="3"
        placeholder="輸入訊息..."
        :maxlength="5000"
        show-word-limit
        @keydown.enter.ctrl="sendMessage"
      />
    </div>

    <div class="sender-actions">
      <el-button type="primary" :icon="'Position'" @click="sendMessage" :disabled="!canSend">
        發送 (Ctrl+Enter)
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { storeToRefs } from 'pinia'
import { useCustomersStore } from '@/stores/customers'
import { useMessagesStore } from '@/stores/messages'

const customersStore = useCustomersStore()
const messagesStore = useMessagesStore()

const { selectedCustomerId } = storeToRefs(customersStore)

const messageText = ref('')

// 是否可以發送
const canSend = computed(() => {
  return messageText.value.trim().length > 0 && selectedCustomerId.value
})

// 發送訊息
const sendMessage = async () => {
  if (!canSend.value) return

  try {
    await messagesStore.sendMessage(selectedCustomerId.value, messageText.value.trim())
    messageText.value = ''
    ElMessage.success('訊息發送成功')
  } catch (error) {
    ElMessage.error('訊息發送失敗')
    console.error('發送訊息錯誤:', error)
  }
}
</script>

<style scoped>
.message-sender {
  background-color: white;
  border-top: 1px solid var(--el-border-color);
  padding: 12px;
}

.sender-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.sender-input {
  margin-bottom: 8px;
}

.sender-actions {
  display: flex;
  justify-content: flex-end;
}

:deep(.el-textarea__inner) {
  resize: none;
}
</style>
