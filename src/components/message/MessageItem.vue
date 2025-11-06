<template>
  <div :class="['message-item', messageDirection]">
    <div class="message-bubble">
      <!-- 文字訊息 -->
      <div v-if="message.text_content" class="message-text">
        {{ message.text_content }}
      </div>

      <!-- 圖片訊息 -->
      <el-image
        v-if="message.message_type === 'image' && message.file_url"
        :src="message.file_url"
        :preview-src-list="[message.file_url]"
        fit="cover"
        class="message-image"
      />

      <!-- 檔案訊息 -->
      <div v-if="message.file_name && message.message_type !== 'image'" class="message-file">
        <el-icon><Document /></el-icon>
        <span>{{ message.file_name }}</span>
        <el-button :icon="'Download'" size="small" text @click="downloadFile">
          下載
        </el-button>
      </div>

      <!-- 訊息時間 -->
      <div class="message-time">
        {{ formatTime(message.timestamp) }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatTime } from '@/utils/formatters'

const props = defineProps({
  message: {
    type: Object,
    required: true
  }
})

// 訊息方向（incoming: 客戶發送, outgoing: 客服發送）
const messageDirection = computed(() => {
  return props.message.direction || 'incoming'
})

// 下載檔案
const downloadFile = () => {
  if (props.message.file_url) {
    window.open(props.message.file_url, '_blank')
  }
}
</script>

<style scoped>
.message-item {
  display: flex;
  margin-bottom: 12px;
}

.message-item.incoming {
  justify-content: flex-start;
}

.message-item.outgoing {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 60%;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.incoming .message-bubble {
  background-color: white;
  border-bottom-left-radius: 4px;
}

.outgoing .message-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.message-text {
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message-image {
  max-width: 300px;
  max-height: 300px;
  border-radius: 8px;
  cursor: pointer;
}

.message-file {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
}

.outgoing .message-file {
  background-color: rgba(255, 255, 255, 0.2);
}

.message-time {
  font-size: 11px;
  margin-top: 4px;
  opacity: 0.7;
  text-align: right;
}
</style>
