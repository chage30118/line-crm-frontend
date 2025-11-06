<template>
  <div class="customer-stats">
    <el-card shadow="never">
      <template #header>
        客戶統計
      </template>

      <!-- 統計卡片 -->
      <div class="stats-grid">
        <div class="stat-card">
          <el-icon class="stat-icon" color="#409EFF"><ChatDotRound /></el-icon>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalMessages }}</div>
            <div class="stat-label">訊息總數</div>
          </div>
        </div>

        <div class="stat-card">
          <el-icon class="stat-icon" color="#67C23A"><Picture /></el-icon>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalImages }}</div>
            <div class="stat-label">圖片數量</div>
          </div>
        </div>

        <div class="stat-card">
          <el-icon class="stat-icon" color="#E6A23C"><Document /></el-icon>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalFiles }}</div>
            <div class="stat-label">檔案數量</div>
          </div>
        </div>

        <div class="stat-card">
          <el-icon class="stat-icon" color="#F56C6C"><Calendar /></el-icon>
          <div class="stat-content">
            <div class="stat-value">{{ stats.activeDays }}</div>
            <div class="stat-label">活躍天數</div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 訊息頻率圖表 -->
    <el-card shadow="never" class="chart-card">
      <template #header>
        訊息頻率分析
      </template>

      <div ref="chartRef" class="chart-container"></div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  customer: {
    type: Object,
    default: null
  }
})

const chartRef = ref(null)
let chartInstance = null

// 統計資料
const stats = computed(() => {
  // TODO: 從 Supabase 查詢實際統計資料
  return {
    totalMessages: props.customer?.message_count || 0,
    totalImages: 0,
    totalFiles: 0,
    activeDays: 0
  }
})

// 初始化圖表
const initChart = () => {
  if (!chartRef.value) return

  chartInstance = echarts.init(chartRef.value)

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: ['週一', '週二', '週三', '週四', '週五', '週六', '週日']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '訊息數',
        type: 'bar',
        data: [5, 20, 36, 10, 10, 20, 15],
        itemStyle: {
          color: '#409EFF'
        }
      }
    ]
  }

  chartInstance.setOption(option)
}

// 監聽客戶變化
watch(() => props.customer, () => {
  if (chartInstance) {
    initChart()
  }
})

onMounted(() => {
  initChart()

  // 響應式圖表
  window.addEventListener('resize', () => {
    if (chartInstance) {
      chartInstance.resize()
    }
  })
})
</script>

<style scoped>
.customer-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: var(--el-fill-color-light);
  border-radius: 8px;
}

.stat-icon {
  font-size: 32px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.chart-card {
  margin-top: 16px;
}

.chart-container {
  width: 100%;
  height: 300px;
}

.el-card {
  border: none;
}
</style>
