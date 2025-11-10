<template>
  <div class="customer-master-table">
    <el-table
      :data="store.paginatedCustomers"
      :loading="store.loading"
      stripe
      border
      style="width: 100%"
      :header-cell-style="{ background: '#f5f7fa', color: '#303133', fontWeight: '600' }"
      @sort-change="handleSortChange"
    >
      <!-- 序號 -->
      <el-table-column
        type="index"
        label="序號"
        width="70"
        align="center"
        :index="indexMethod"
      />

      <!-- 頭像 + LINE 名稱 -->
      <el-table-column
        prop="display_name"
        label="LINE 客戶"
        min-width="200"
        sortable="custom"
      >
        <template #default="{ row }">
          <div class="customer-info">
            <el-avatar 
              :size="40" 
              :src="row.picture_url || ''"
              class="customer-avatar"
            >
              <el-icon><User /></el-icon>
            </el-avatar>
            <div class="customer-details">
              <div class="customer-name">{{ row.display_name || '未設定' }}</div>
              <div class="customer-id">{{ row.line_user_id }}</div>
            </div>
          </div>
        </template>
      </el-table-column>

      <!-- ERP 客戶編號 (可編輯) -->
      <el-table-column
        prop="erp_bi_code"
        label="ERP 客戶編號"
        min-width="180"
        sortable="custom"
      >
        <template #default="{ row }">
          <div class="editable-cell" @click="startEdit(row, 'erp_bi_code')">
            <el-input
              v-if="editingCell.id === row.id && editingCell.field === 'erp_bi_code'"
              v-model="editValue"
              @blur="saveEdit(row, 'erp_bi_code')"
              @keyup.enter="saveEdit(row, 'erp_bi_code')"
              @keyup.esc="cancelEdit"
              ref="editInput"
              placeholder="輸入客戶編號"
              size="small"
            />
            <div v-else class="cell-content">
              <span v-if="row.erp_bi_code" class="cell-value">{{ row.erp_bi_code }}</span>
              <span v-else class="cell-empty">點擊輸入</span>
              <el-icon class="edit-icon"><Edit /></el-icon>
            </div>
          </div>
        </template>
      </el-table-column>

      <!-- ERP 客戶名稱 (可編輯) -->
      <el-table-column
        prop="erp_bi_name"
        label="ERP 客戶名稱"
        min-width="200"
        sortable="custom"
      >
        <template #default="{ row }">
          <div class="editable-cell" @click="startEdit(row, 'erp_bi_name')">
            <el-input
              v-if="editingCell.id === row.id && editingCell.field === 'erp_bi_name'"
              v-model="editValue"
              @blur="saveEdit(row, 'erp_bi_name')"
              @keyup.enter="saveEdit(row, 'erp_bi_name')"
              @keyup.esc="cancelEdit"
              ref="editInput"
              placeholder="輸入客戶名稱"
              size="small"
            />
            <div v-else class="cell-content">
              <span v-if="row.erp_bi_name" class="cell-value">{{ row.erp_bi_name }}</span>
              <span v-else class="cell-empty">點擊輸入</span>
              <el-icon class="edit-icon"><Edit /></el-icon>
            </div>
          </div>
        </template>
      </el-table-column>

      <!-- 建檔狀態 -->
      <el-table-column
        label="建檔狀態"
        width="100"
        align="center"
      >
        <template #default="{ row }">
          <el-tag 
            v-if="row.erp_bi_code && row.erp_bi_name" 
            type="success" 
            size="small"
            :icon="Check"
          >
            已建檔
          </el-tag>
          <el-tag 
            v-else 
            type="warning" 
            size="small"
            :icon="Warning"
          >
            未建檔
          </el-tag>
        </template>
      </el-table-column>

      <!-- 訊息數量 -->
      <el-table-column
        prop="message_count"
        label="訊息數"
        width="100"
        align="center"
        sortable="custom"
      >
        <template #default="{ row }">
          <el-tag type="info" size="small">
            {{ row.message_count || 0 }}
          </el-tag>
        </template>
      </el-table-column>

      <!-- 最後更新時間 -->
      <el-table-column
        prop="updated_at"
        label="最後更新"
        width="180"
        sortable="custom"
      >
        <template #default="{ row }">
          <div class="time-cell">
            <el-icon><Clock /></el-icon>
            {{ formatDateTime(row.updated_at) }}
          </div>
        </template>
      </el-table-column>

      <!-- 操作 -->
      <el-table-column
        label="操作"
        width="120"
        align="center"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            v-if="row.erp_bi_code || row.erp_bi_name"
            type="danger"
            size="small"
            text
            @click="handleClearErp(row)"
            :icon="Delete"
          >
            清除
          </el-button>
          <el-text v-else type="info" size="small">無操作</el-text>
        </template>
      </el-table-column>
    </el-table>

    <!-- 空狀態 -->
    <el-empty 
      v-if="!store.loading && store.customers.length === 0" 
      description="目前沒有客戶資料"
    />
  </div>
</template>

<script setup>
import { ref, reactive, nextTick } from 'vue'
import { useCustomerMasterStore } from '@/stores/customerMaster'
import { formatDateTime } from '@/utils/formatters'
import { User, Edit, Check, Warning, Clock, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const store = useCustomerMasterStore()

// 編輯狀態
const editingCell = reactive({
  id: null,
  field: null
})
const editValue = ref('')
const editInput = ref(null)

// 序號計算
function indexMethod(index) {
  return (store.currentPage - 1) * store.pageSize + index + 1
}

// 開始編輯
function startEdit(row, field) {
  editingCell.id = row.id
  editingCell.field = field
  editValue.value = row[field] || ''
  
  // 聚焦到輸入框
  nextTick(() => {
    if (editInput.value) {
      editInput.value.focus()
    }
  })
}

// 取消編輯
function cancelEdit() {
  editingCell.id = null
  editingCell.field = null
  editValue.value = ''
}

// 儲存編輯
async function saveEdit(row, field) {
  const newValue = editValue.value.trim()
  const oldValue = row[field] || ''

  // 沒有變更則取消編輯
  if (newValue === oldValue) {
    cancelEdit()
    return
  }

  try {
    // 更新資料
    const erpData = {
      erp_bi_code: field === 'erp_bi_code' ? newValue : row.erp_bi_code,
      erp_bi_name: field === 'erp_bi_name' ? newValue : row.erp_bi_name
    }

    await store.updateCustomerErp(row.id, erpData)
    
    ElMessage.success({
      message: '更新成功',
      duration: 1500
    })
    
    cancelEdit()
  } catch (error) {
    ElMessage.error('更新失敗: ' + error.message)
    cancelEdit()
  }
}

// 清除 ERP 資料
function handleClearErp(row) {
  ElMessageBox.confirm(
    `確定要清除客戶「${row.display_name || row.line_user_id}」的 ERP 資料嗎？`,
    '確認清除',
    {
      confirmButtonText: '確定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await store.updateCustomerErp(row.id, {
        erp_bi_code: null,
        erp_bi_name: null
      })
      ElMessage.success('已清除 ERP 資料')
    } catch (error) {
      ElMessage.error('清除失敗: ' + error.message)
    }
  }).catch(() => {
    ElMessage.info('已取消清除')
  })
}

// 排序變更
function handleSortChange({ prop, order }) {
  if (prop && order) {
    store.setSorting(prop)
  }
}
</script>

<style scoped>
.customer-master-table {
  width: 100%;
}

/* 客戶資訊 */
.customer-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.customer-avatar {
  flex-shrink: 0;
}

.customer-details {
  flex: 1;
  min-width: 0;
}

.customer-name {
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.customer-id {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 可編輯儲存格 */
.editable-cell {
  cursor: pointer;
  transition: all 0.2s;
  padding: 4px 8px;
  margin: -4px -8px;
  border-radius: 4px;
}

.editable-cell:hover {
  background: #f5f7fa;
}

.cell-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.cell-value {
  flex: 1;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-empty {
  flex: 1;
  color: #c0c4cc;
  font-style: italic;
}

.edit-icon {
  color: #409eff;
  opacity: 0;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.editable-cell:hover .edit-icon {
  opacity: 1;
}

/* 時間儲存格 */
.time-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #606266;
  font-size: 13px;
}

.time-cell .el-icon {
  color: #909399;
}

/* 表格樣式優化 */
:deep(.el-table) {
  font-size: 14px;
}

:deep(.el-table__row) {
  transition: background-color 0.2s;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa !important;
}

:deep(.el-table__empty-block) {
  padding: 60px 0;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .customer-info {
    gap: 8px;
  }

  .customer-avatar {
    width: 32px;
    height: 32px;
  }

  .customer-name {
    font-size: 13px;
  }

  .customer-id {
    font-size: 11px;
  }
}
</style>
