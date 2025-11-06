<template>
  <div class="tag-manager">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>客戶標籤</span>
          <el-button :icon="'Plus'" size="small" @click="showAddDialog">
            新增標籤
          </el-button>
        </div>
      </template>

      <!-- 標籤列表 -->
      <div class="tags-list">
        <el-tag
          v-for="tag in customerTags"
          :key="tag"
          closable
          @close="removeTag(tag)"
          class="tag-item"
        >
          {{ tag }}
        </el-tag>

        <el-tag v-if="customerTags.length === 0" type="info">
          尚無標籤
        </el-tag>
      </div>
    </el-card>

    <!-- 預設標籤 -->
    <el-card shadow="never" class="preset-tags">
      <template #header>
        快速新增
      </template>

      <div class="preset-tags-list">
        <el-tag
          v-for="tag in presetTags"
          :key="tag"
          :type="customerTags.includes(tag) ? 'success' : 'info'"
          @click="toggleTag(tag)"
          class="preset-tag"
        >
          <el-icon v-if="customerTags.includes(tag)"><Check /></el-icon>
          {{ tag }}
        </el-tag>
      </div>
    </el-card>

    <!-- 新增標籤對話框 -->
    <el-dialog v-model="addDialogVisible" title="新增標籤" width="400px">
      <el-input
        v-model="newTagName"
        placeholder="請輸入標籤名稱"
        @keyup.enter="addTag"
      />
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addTag">確定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  customer: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update'])

// 預設標籤
const presetTags = ref([
  'VIP',
  '潛在客戶',
  '已成交',
  '待跟進',
  '重要客戶',
  '高價值',
  '新客戶',
  '舊客戶'
])

const addDialogVisible = ref(false)
const newTagName = ref('')

// 客戶標籤
const customerTags = computed(() => {
  if (!props.customer?.tags) return []
  return Array.isArray(props.customer.tags) ? props.customer.tags : []
})

// 顯示新增對話框
const showAddDialog = () => {
  newTagName.value = ''
  addDialogVisible.value = true
}

// 新增標籤
const addTag = async () => {
  const tagName = newTagName.value.trim()

  if (!tagName) {
    ElMessage.warning('請輸入標籤名稱')
    return
  }

  if (customerTags.value.includes(tagName)) {
    ElMessage.warning('標籤已存在')
    return
  }

  try {
    const updatedTags = [...customerTags.value, tagName]
    await emit('update', { tags: updatedTags })
    ElMessage.success('標籤新增成功')
    addDialogVisible.value = false
  } catch (error) {
    ElMessage.error('新增標籤失敗')
  }
}

// 移除標籤
const removeTag = async (tag) => {
  try {
    const updatedTags = customerTags.value.filter(t => t !== tag)
    await emit('update', { tags: updatedTags })
    ElMessage.success('標籤移除成功')
  } catch (error) {
    ElMessage.error('移除標籤失敗')
  }
}

// 切換標籤
const toggleTag = async (tag) => {
  if (customerTags.value.includes(tag)) {
    await removeTag(tag)
  } else {
    try {
      const updatedTags = [...customerTags.value, tag]
      await emit('update', { tags: updatedTags })
      ElMessage.success('標籤新增成功')
    } catch (error) {
      ElMessage.error('新增標籤失敗')
    }
  }
}
</script>

<style scoped>
.tag-manager {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  cursor: pointer;
}

.preset-tags {
  margin-top: 16px;
}

.preset-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-tag {
  cursor: pointer;
  user-select: none;
  transition: all 0.3s;
}

.preset-tag:hover {
  transform: scale(1.05);
}

.el-card {
  border: none;
}
</style>
