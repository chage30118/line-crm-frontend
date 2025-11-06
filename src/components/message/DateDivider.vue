<template>
  <div class="date-divider">
    <div class="divider-line"></div>
    <span class="divider-text">{{ formattedDate }}</span>
    <div class="divider-line"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatDate } from '@/utils/formatters'

const props = defineProps({
  date: {
    type: [String, Date],
    required: true
  }
})

const formattedDate = computed(() => {
  return formatDate(props.date)
})
</script>

<style scoped>
.date-divider {
  display: flex;
  align-items: center;
  margin: 20px 0;
  gap: 12px;
}

.divider-line {
  flex: 1;
  height: 1px;
  background-color: var(--el-border-color);
}

.divider-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  padding: 4px 12px;
  background-color: white;
  border-radius: 12px;
  border: 1px solid var(--el-border-color);
}
</style>
