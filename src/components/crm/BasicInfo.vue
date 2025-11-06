<template>
  <div class="basic-info">
    <el-card shadow="never">
      <!-- 頭像 -->
      <div class="avatar-section">
        <img 
          v-if="avatarSrc" 
          :src="avatarSrc" 
          @error="onAvatarError"
          @load="onAvatarLoad"
          class="avatar-img"
          alt="用戶頭像"
        />
        <el-avatar v-else :size="80">
          <el-icon><User /></el-icon>
        </el-avatar>
      </div>

      <!-- 基本資訊表單 -->
      <el-form :model="formData" label-width="120px" label-position="top">
        <!-- ERP 客戶編號 (BI Code) -->
        <el-form-item>
          <template #label>
            <span class="erp-label">ERP 客戶編號</span>
          </template>
          <el-input 
            v-model="formData.erp_bi_code" 
            :placeholder="formData.erp_bi_code ? '' : '需建立客戶主檔,請與業務部確認'"
            :class="{ 'empty-value': !formData.erp_bi_code }"
          >
            <template #prepend>
              <el-icon><Document /></el-icon>
            </template>
          </el-input>
          <div v-if="!formData.erp_bi_code" class="erp-warning">
            需建立客戶主檔,請與業務部確認
          </div>
        </el-form-item>

        <!-- ERP 客戶名稱 -->
        <el-form-item>
          <template #label>
            <span class="erp-label">ERP 客戶名稱</span>
          </template>
          <el-input 
            v-model="formData.erp_bi_name" 
            :placeholder="formData.erp_bi_name ? '' : '需建立客戶主檔,請與業務部確認'"
            :class="{ 'empty-value': !formData.erp_bi_name }"
          >
            <template #prepend>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
          <div v-if="!formData.erp_bi_name" class="erp-warning">
            需建立客戶主檔,請與業務部確認
          </div>
        </el-form-item>

        <!-- 分隔線 -->
        <el-divider content-position="left">LINE 資訊</el-divider>

        <el-form-item label="LINE 顯示名稱">
          <el-input v-model="formData.display_name" disabled />
        </el-form-item>

        <el-form-item label="群組名稱" v-if="formData.group_display_name">
          <el-input v-model="formData.group_display_name" disabled>
            <template #prefix>
              <el-icon><ChatLineRound /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <!-- 備註區域 -->
        <el-divider content-position="left">
          <span style="color: #606266; font-weight: 500;">客戶備註</span>
        </el-divider>

        <!-- 備註列表 -->
        <div class="notes-section">
          <div 
            v-for="(note, index) in notesList" 
            :key="note.id"
            class="note-item"
          >
            <div class="note-header">
              <span class="note-title">備註 {{ index + 1 }}</span>
              <div class="note-actions">
                <span class="note-time">{{ formatDateTime(note.created_at) }}</span>
                <el-button 
                  type="danger" 
                  size="small" 
                  :icon="Delete"
                  link
                  @click="deleteNote(index)"
                >
                  刪除
                </el-button>
              </div>
            </div>
            <el-input
              v-model="note.content"
              type="textarea"
              :rows="3"
              :placeholder="`請輸入備註 ${index + 1} 內容...`"
              class="note-textarea"
            />
          </div>

          <!-- 新增備註按鈕 -->
          <el-button 
            type="primary" 
            :icon="Plus"
            plain
            @click="addNote"
            class="add-note-btn"
          >
            新增備註
          </el-button>
        </div>

        <el-form-item label="建立時間">
          <el-input :value="formatDateTime(customer?.created_at)" disabled />
        </el-form-item>

        <el-form-item label="最後訊息時間">
          <el-input :value="formatDateTime(customer?.last_message_at)" disabled />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="saveChanges" :loading="saving">
            儲存變更
          </el-button>
          <el-button @click="resetForm">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import { formatDateTime } from '@/utils/formatters'
import { useAvatar } from '@/composables/useAvatar'

const props = defineProps({
  customer: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update'])

// 使用頭像處理 composable
const { avatarSrc, onError: onAvatarError, onLoad: onAvatarLoad } = useAvatar(
  computed(() => props.customer?.picture_url)
)

const formData = ref({
  erp_bi_code: '',
  erp_bi_name: '',
  display_name: '',
  group_display_name: '',
  notes: ''
})

const saving = ref(false)

// 備註列表 (使用陣列管理多個備註)
const notesList = ref([])

// 初始化備註列表
const initNotesList = (notesData) => {
  if (!notesData) {
    // 如果沒有備註,初始化一個空備註
    notesList.value = [{
      id: Date.now(),
      content: '',
      created_at: new Date().toISOString()
    }]
    return
  }

  // 如果是舊格式的字串,嘗試解析 JSON
  if (typeof notesData === 'string') {
    try {
      // 嘗試解析為 JSON 陣列
      const parsed = JSON.parse(notesData)
      if (Array.isArray(parsed)) {
        notesList.value = parsed.length > 0 ? parsed : [{
          id: Date.now(),
          content: '',
          created_at: new Date().toISOString()
        }]
      } else {
        // 如果不是陣列,當作純文字處理
        notesList.value = [{
          id: Date.now(),
          content: notesData,
          created_at: props.customer?.created_at || new Date().toISOString()
        }]
      }
    } catch {
      // JSON 解析失敗,當作純文字處理
      notesList.value = [{
        id: Date.now(),
        content: notesData,
        created_at: props.customer?.created_at || new Date().toISOString()
      }]
    }
  } else if (Array.isArray(notesData)) {
    // 如果已經是陣列格式
    notesList.value = notesData.length > 0 ? notesData : [{
      id: Date.now(),
      content: '',
      created_at: new Date().toISOString()
    }]
  } else {
    // 預設情況
    notesList.value = [{
      id: Date.now(),
      content: '',
      created_at: new Date().toISOString()
    }]
  }
}

// 監聽客戶變化,更新表單
watch(() => props.customer, (newCustomer) => {
  if (newCustomer) {
    formData.value = {
      erp_bi_code: newCustomer.erp_bi_code || '',
      erp_bi_name: newCustomer.erp_bi_name || '',
      display_name: newCustomer.display_name || '',
      group_display_name: newCustomer.group_display_name || '',
      notes: newCustomer.notes || ''
    }
    
    // 初始化備註列表
    initNotesList(newCustomer.notes)
  }
}, { immediate: true })

// 新增備註
const addNote = () => {
  notesList.value.push({
    id: Date.now(),
    content: '',
    created_at: new Date().toISOString()
  })
  ElMessage.success('已新增備註欄位')
}

// 刪除備註
const deleteNote = async (index) => {
  if (notesList.value.length === 1) {
    ElMessage.warning('至少需要保留一個備註欄位')
    return
  }

  try {
    await ElMessageBox.confirm(
      '確定要刪除這個備註嗎?',
      '刪除確認',
      {
        confirmButtonText: '確定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    notesList.value.splice(index, 1)
    ElMessage.success('備註已刪除')
  } catch {
    // 取消刪除
  }
}

// 儲存變更
const saveChanges = async () => {
  saving.value = true
  try {
    // 過濾掉空內容的備註
    const filteredNotes = notesList.value.filter(note => note.content.trim())
    
    await emit('update', {
      erp_bi_code: formData.value.erp_bi_code || null,
      erp_bi_name: formData.value.erp_bi_name || null,
      notes: filteredNotes.length > 0 ? JSON.stringify(filteredNotes) : null
    })
    ElMessage.success('客戶資訊更新成功')
  } catch (error) {
    ElMessage.error('更新失敗')
  } finally {
    saving.value = false
  }
}

// 重置表單
const resetForm = () => {
  if (props.customer) {
    formData.value = {
      erp_bi_code: props.customer.erp_bi_code || '',
      erp_bi_name: props.customer.erp_bi_name || '',
      display_name: props.customer.display_name || '',
      group_display_name: props.customer.group_display_name || '',
      notes: props.customer.notes || ''
    }
    
    // 重置備註列表
    initNotesList(props.customer.notes)
  }
}

// 複製到剪貼簿
const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text)
    .then(() => {
      ElMessage.success('已複製到剪貼簿')
    })
    .catch(() => {
      ElMessage.error('複製失敗')
    })
}
</script>

<style scoped>
.basic-info {
  padding: 0;
}

.avatar-section {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.avatar-img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
}

.el-card {
  border: none;
}

/* ERP 欄位樣式 */
.erp-label {
  color: #409EFF;
  font-weight: 600;
  font-size: 14px;
}

.erp-warning {
  margin-top: 4px;
  font-size: 12px;
  color: #E6A23C;
  font-weight: 500;
}

.empty-value :deep(.el-input__inner) {
  border-color: #E6A23C;
}

/* 備註區域樣式 */
.notes-section {
  margin-top: 16px;
}

.note-item {
  margin-bottom: 16px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.note-title {
  font-weight: 600;
  color: #606266;
  font-size: 14px;
}

.note-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.note-time {
  font-size: 12px;
  color: #909399;
}

.note-textarea {
  margin-top: 8px;
}

.add-note-btn {
  width: 100%;
  margin-top: 8px;
}
</style>
