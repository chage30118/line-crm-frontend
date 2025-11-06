<template>
  <div :class="['customer-item', { active }]" @click="$emit('click')">
    <div class="customer-avatar">
      <img 
        v-if="avatarSrc" 
        :src="avatarSrc" 
        @error="onAvatarError"
        @load="onAvatarLoad"
        class="avatar-img"
        alt="用戶頭像"
      />
      <el-avatar v-else :size="48">
        <el-icon><User /></el-icon>
      </el-avatar>
      <el-badge v-if="customer.unread_count > 0" :value="customer.unread_count" class="unread-badge" />
    </div>

    <div class="customer-info">
      <div class="customer-header">
        <span class="customer-name">
          {{ displayName }}
        </span>
        <span class="last-message-time">
          {{ formatRelativeTime(customer.last_message_at) }}
        </span>
      </div>

      <div class="customer-details">
        <!-- ERP 客戶編號 -->
        <el-tag v-if="customer.erp_bi_code" size="small" type="primary" class="erp-tag">
          <el-icon><Document /></el-icon>
          {{ customer.erp_bi_code }}
        </el-tag>

        <!-- 群組名稱 -->
        <el-tag v-if="customer.group_display_name" size="small" type="info" class="group-tag">
          <el-icon><ChatLineRound /></el-icon>
          {{ customer.group_display_name }}
        </el-tag>

        <!-- 標籤 -->
        <el-tag
          v-for="tag in customerTags"
          :key="tag"
          size="small"
          class="customer-tag"
        >
          {{ tag }}
        </el-tag>
      </div>

      <!-- 最後訊息預覽 -->
      <div class="last-message" v-if="customer.last_message_text">
        {{ truncateText(customer.last_message_text, 30) }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatRelativeTime, truncateText } from '@/utils/formatters'
import { useAvatar } from '@/composables/useAvatar'

const props = defineProps({
  customer: {
    type: Object,
    required: true
  },
  active: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])

// 使用頭像處理 composable
const { avatarSrc, onError: onAvatarError, onLoad: onAvatarLoad } = useAvatar(
  computed(() => props.customer.picture_url)
)

// 顯示名稱(優先使用 ERP 客戶名稱,其次為 LINE 顯示名稱)
const displayName = computed(() => {
  return props.customer.erp_bi_name || props.customer.display_name || '未命名客戶'
})

// 客戶標籤
const customerTags = computed(() => {
  if (!props.customer.tags) return []
  return Array.isArray(props.customer.tags) ? props.customer.tags : []
})
</script>

<style scoped>
.customer-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color-lighter);
  transition: background-color 0.2s;
}

.customer-item:hover {
  background-color: var(--el-fill-color-light);
}

.customer-item.active {
  background-color: var(--el-color-primary-light-9);
  border-left: 3px solid var(--el-color-primary);
}

.customer-avatar {
  position: relative;
  flex-shrink: 0;
}

.avatar-img {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.unread-badge {
  position: absolute;
  top: -4px;
  right: -4px;
}

.customer-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.customer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.customer-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.last-message-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.customer-details {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.erp-tag {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 500;
}

.group-tag {
  background-color: var(--el-color-info-light-9);
}

.customer-tag {
  background-color: var(--el-color-success-light-9);
}

.last-message {
  font-size: 13px;
  color: var(--el-text-color-regular);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
