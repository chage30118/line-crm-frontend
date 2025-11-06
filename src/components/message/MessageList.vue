<template>
  <div class="message-list" ref="messageListRef" v-loading="loading">
    <el-scrollbar ref="scrollbarRef">
      <div class="messages-container">
        <el-empty v-if="messages.length === 0" description="尚無訊息記錄" />

        <template v-else>
          <div v-for="(message, index) in messages" :key="message.id">
            <!-- 日期分隔線 -->
            <DateDivider
              v-if="shouldShowDateDivider(index)"
              :date="message.timestamp"
            />

            <!-- 訊息項目 -->
            <MessageItem :message="message" />
          </div>
        </template>

        <!-- 載入更多 -->
        <div v-if="hasMore" class="load-more">
          <el-button @click="loadMore" :loading="loading" text>
            載入更多訊息
          </el-button>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMessagesStore } from '@/stores/messages'
import { formatDate } from '@/utils/formatters'
import MessageItem from './MessageItem.vue'
import DateDivider from './DateDivider.vue'

const messagesStore = useMessagesStore()
const { messages, loading, hasMore } = storeToRefs(messagesStore)

const scrollbarRef = ref(null)
const messageListRef = ref(null)

// 判斷是否顯示日期分隔線
const shouldShowDateDivider = (index) => {
  if (index === 0) return true

  const currentDate = formatDate(messages.value[index].timestamp)
  const previousDate = formatDate(messages.value[index - 1].timestamp)

  return currentDate !== previousDate
}

// 載入更多訊息
const loadMore = async () => {
  const currentUserId = messagesStore.currentUserId
  if (!currentUserId) return

  await messagesStore.fetchMessages(currentUserId, {
    offset: messages.value.length
  })
}

// 捲動到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (scrollbarRef.value) {
      const scrollElement = scrollbarRef.value.$el.querySelector('.el-scrollbar__wrap')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  })
}

// 監聽訊息變化，自動捲動到底部（僅當新增訊息時）
watch(() => messages.value.length, (newLength, oldLength) => {
  if (newLength > oldLength && oldLength > 0) {
    scrollToBottom()
  }
})
</script>

<style scoped>
.message-list {
  flex: 1;
  overflow: hidden;
  background-color: #f5f7fa;
}

.el-scrollbar {
  height: 100%;
}

.messages-container {
  padding: 20px;
  min-height: 100%;
  display: flex;
  flex-direction: column-reverse; /* 反轉以便最新訊息在下方 */
}

.load-more {
  text-align: center;
  padding: 20px 0;
}
</style>
