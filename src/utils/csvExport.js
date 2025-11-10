/**
 * CSV 匯出工具函數
 * 
 * 提供將資料匯出為 CSV 格式的功能
 */

/**
 * 將陣列資料匯出為 CSV 格式
 * @param {Array} data - 要匯出的資料陣列
 * @param {Array} headers - CSV 標題行
 * @param {Function} rowMapper - 將資料行映射為 CSV 行的函數
 * @returns {string} CSV 內容字串
 */
export function arrayToCSV(data, headers, rowMapper) {
  if (!data || data.length === 0) {
    return headers.join(',')
  }

  const rows = data.map(rowMapper)
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  // 加入 BOM (Byte Order Mark) 讓 Excel 正確識別 UTF-8
  return '\uFEFF' + csvContent
}

/**
 * 下載 CSV 檔案
 * @param {string} csvContent - CSV 內容
 * @param {string} filename - 檔案名稱（不含副檔名）
 */
export function downloadCSV(csvContent, filename = 'export') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  const timestamp = new Date().toISOString().slice(0, 10)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${timestamp}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // 釋放 URL 物件
  URL.revokeObjectURL(url)
}

/**
 * 將物件陣列匯出為 CSV 並下載
 * @param {Array} data - 資料陣列
 * @param {Object} config - 配置物件
 * @param {Array} config.headers - 標題行
 * @param {Function} config.rowMapper - 行映射函數
 * @param {string} config.filename - 檔案名稱
 */
export function exportToCSV(data, config) {
  const { headers, rowMapper, filename = 'export' } = config
  
  if (!data || data.length === 0) {
    console.warn('沒有資料可匯出')
    return
  }
  
  const csvContent = arrayToCSV(data, headers, rowMapper)
  downloadCSV(csvContent, filename)
}

/**
 * 格式化 CSV 儲存格內容（處理特殊字元）
 * @param {any} value - 儲存格值
 * @returns {string} 格式化後的字串
 */
export function formatCSVCell(value) {
  if (value === null || value === undefined) {
    return ''
  }
  
  // 轉為字串
  let str = String(value)
  
  // 移除不必要的空白
  str = str.trim()
  
  // 處理換行符號
  str = str.replace(/\n/g, ' ').replace(/\r/g, '')
  
  // 處理雙引號
  str = str.replace(/"/g, '""')
  
  return str
}

/**
 * 格式化日期時間為 CSV 友善格式
 * @param {string|Date} datetime - 日期時間
 * @returns {string} 格式化後的日期時間字串
 */
export function formatCSVDateTime(datetime) {
  if (!datetime) return ''
  
  try {
    const date = new Date(datetime)
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  } catch (error) {
    console.error('日期格式化錯誤:', error)
    return ''
  }
}

export default {
  arrayToCSV,
  downloadCSV,
  exportToCSV,
  formatCSVCell,
  formatCSVDateTime
}
