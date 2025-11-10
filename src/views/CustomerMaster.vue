<template>
  <div class="customer-master-layout">
    <!-- 頂部導航 -->
    <AppHeader />
    
    <div class="customer-master-page">
      <!-- 頁面標題 -->
      <div class="page-header">
        <div class="header-left">
          <div class="title-group">
            <h1 class="page-title">
              <el-icon><Document /></el-icon>
              客戶主檔維護
            </h1>
            <p class="page-subtitle">集中管理所有客戶的 ERP 資料</p>
          </div>
        </div>
        <div class="header-right">
          <el-button 
            type="primary" 
            :icon="Download" 
            @click="handleExport"
            :loading="store.loading"
          >
            匯出 CSV
          </el-button>
          <el-button 
            :icon="Refresh" 
            @click="handleRefresh"
            :loading="store.loading"
          >
            重新載入
          </el-button>
        </div>
      </div>

    <!-- 統計卡片 -->
    <div class="stats-cards">
      <el-card class="stat-card total" shadow="hover">
        <div class="stat-content">
          <div class="stat-icon">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">總客戶數</div>
            <div class="stat-value">{{ store.statistics.total }}</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card completed" shadow="hover">
        <div class="stat-content">
          <div class="stat-icon">
            <el-icon><Check /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">已建檔</div>
            <div class="stat-value">{{ store.statistics.withErp }}</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card pending" shadow="hover">
        <div class="stat-content">
          <div class="stat-icon">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">未建檔</div>
            <div class="stat-value">{{ store.statistics.withoutErp }}</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card percentage" shadow="hover">
        <div class="stat-content">
          <div class="stat-icon">
            <el-icon><PieChart /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">建檔率</div>
            <div class="stat-value">{{ store.statistics.percentage }}%</div>
          </div>
        </div>
        <el-progress 
          :percentage="store.statistics.percentage" 
          :stroke-width="6"
          :show-text="false"
          :color="progressColor"
        />
      </el-card>
    </div>

    <!-- 搜尋與篩選區 -->
    <el-card class="search-section" shadow="never">
      <div class="search-controls">
        <el-input
          v-model="searchInput"
          placeholder="搜尋 LINE 名稱、LINE ID、ERP 編號或 ERP 名稱..."
          :prefix-icon="Search"
          clearable
          class="search-input"
          @input="handleSearch"
        />
        
        <div class="control-buttons">
          <el-select 
            v-model="store.pageSize" 
            @change="handlePageSizeChange"
            class="page-size-select"
          >
            <el-option :value="10" label="10 筆/頁" />
            <el-option :value="20" label="20 筆/頁" />
            <el-option :value="50" label="50 筆/頁" />
            <el-option :value="100" label="100 筆/頁" />
          </el-select>

          <el-button 
            v-if="searchInput" 
            @click="handleResetFilters"
            :icon="Close"
          >
            清除篩選
          </el-button>
        </div>
      </div>

      <div class="search-info" v-if="searchInput">
        <el-tag type="info" size="small">
          搜尋結果: {{ store.filteredCustomers.length }} 筆
        </el-tag>
      </div>
    </el-card>

    <!-- 表格區 -->
    <el-card class="table-section" shadow="never">
      <CustomerMasterTable />
    </el-card>

    <!-- 分頁器 -->
    <div class="pagination-section" v-if="store.totalPages > 1">
      <el-pagination
        v-model:current-page="store.currentPage"
        :page-size="store.pageSize"
        :total="store.sortedCustomers.length"
        layout="total, prev, pager, next, jumper"
        @current-change="handlePageChange"
        background
      />
    </div>
  </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomerMasterStore } from '@/stores/customerMaster'
import AppHeader from '@/components/common/AppHeader.vue'
import CustomerMasterTable from '@/components/customer/CustomerMasterTable.vue'
import { 
  Document, 
  Download, 
  Refresh, 
  User, 
  Check, 
  Warning, 
  PieChart,
  Search,
  Close,
  ArrowLeft
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const store = useCustomerMasterStore()
const searchInput = ref('')

// 進度條顏色
const progressColor = computed(() => {
  const percentage = store.statistics.percentage
  if (percentage < 30) return '#f56c6c'
  if (percentage < 60) return '#e6a23c'
  if (percentage < 90) return '#409eff'
  return '#67c23a'
})

// 載入資料
onMounted(async () => {
  try {
    await store.fetchAllCustomers()
  } catch (error) {
    ElMessage.error('載入客戶資料失敗')
  }
})



// 搜尋處理
function handleSearch() {
  store.setSearchKeyword(searchInput.value)
}

// 清除篩選
function handleResetFilters() {
  searchInput.value = ''
  store.resetFilters()
  ElMessage.success('已清除所有篩選條件')
}

// 重新載入
async function handleRefresh() {
  try {
    await store.fetchAllCustomers()
    ElMessage.success('資料已重新載入')
  } catch (error) {
    ElMessage.error('重新載入失敗')
  }
}

// 匯出 CSV
function handleExport() {
  try {
    ElMessageBox.confirm(
      `將匯出 ${store.sortedCustomers.length} 筆客戶資料，是否繼續？`,
      '確認匯出',
      {
        confirmButtonText: '確定',
        cancelButtonText: '取消',
        type: 'info'
      }
    ).then(() => {
      store.downloadCSV()
      ElMessage.success('CSV 檔案已下載')
    }).catch(() => {
      ElMessage.info('已取消匯出')
    })
  } catch (error) {
    ElMessage.error('匯出失敗')
  }
}

// 分頁變更
function handlePageChange(page) {
  store.setCurrentPage(page)
}

// 每頁筆數變更
function handlePageSizeChange(size) {
  store.setPageSize(size)
}
</script>

<style scoped>
.customer-master-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.customer-master-page {
  padding: 20px;
  background: #f5f7fa;
  height: calc(100vh - 60px);
  overflow-y: auto;
  overflow-x: hidden;
}

/* 頁面標題 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 20px;
}

.header-left {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.back-btn {
  flex-shrink: 0;
  margin-top: 4px;
}

.title-group {
  flex: 1;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-subtitle {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

/* 統計卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 8px;
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-card.total .stat-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.stat-card.completed .stat-icon {
  background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
  color: white;
}

.stat-card.pending .stat-icon {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
  color: #d55a2e;
}

.stat-card.percentage .stat-icon {
  background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);
  color: #409eff;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

.stat-card.percentage :deep(.el-progress) {
  margin-top: 12px;
}

/* 搜尋區 */
.search-section {
  margin-bottom: 16px;
  border-radius: 8px;
}

.search-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  flex: 1;
}

.control-buttons {
  display: flex;
  gap: 8px;
}

.page-size-select {
  width: 130px;
}

.search-info {
  margin-top: 12px;
}

/* 表格區 */
.table-section {
  border-radius: 8px;
  margin-bottom: 16px;
}

/* 分頁器 */
.pagination-section {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .customer-master-page {
    padding: 12px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-right {
    width: 100%;
  }

  .header-right .el-button {
    flex: 1;
  }

  .stats-cards {
    grid-template-columns: 1fr;
  }

  .search-controls {
    flex-direction: column;
  }

  .control-buttons {
    width: 100%;
    justify-content: space-between;
  }

  .page-size-select {
    flex: 1;
  }
}
</style>
