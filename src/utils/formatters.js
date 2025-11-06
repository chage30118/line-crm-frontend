import dayjs from 'dayjs'
import 'dayjs/locale/zh-tw'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.locale('zh-tw')
dayjs.extend(relativeTime)

/**
 * 格式化時間（HH:mm）
 * @param {string|Date} timestamp - 時間戳記
 * @returns {string} 格式化後的時間
 */
export function formatTime(timestamp) {
  if (!timestamp) return ''
  return dayjs(timestamp).format('HH:mm')
}

/**
 * 格式化日期（今天、昨天或 YYYY-MM-DD）
 * @param {string|Date} timestamp - 時間戳記
 * @returns {string} 格式化後的日期
 */
export function formatDate(timestamp) {
  if (!timestamp) return ''

  const date = dayjs(timestamp)
  const today = dayjs().startOf('day')
  const yesterday = dayjs().subtract(1, 'day').startOf('day')

  if (date.isSame(today, 'day')) {
    return '今天'
  } else if (date.isSame(yesterday, 'day')) {
    return '昨天'
  } else {
    return date.format('YYYY-MM-DD')
  }
}

/**
 * 格式化完整日期時間
 * @param {string|Date} timestamp - 時間戳記
 * @returns {string} 格式化後的日期時間
 */
export function formatDateTime(timestamp) {
  if (!timestamp) return ''
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
}

/**
 * 格式化相對時間（例如：3分鐘前）
 * @param {string|Date} timestamp - 時間戳記
 * @returns {string} 相對時間描述
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return ''
  return dayjs(timestamp).fromNow()
}

/**
 * 格式化檔案大小
 * @param {number} bytes - 檔案大小（bytes）
 * @returns {string} 格式化後的檔案大小
 */
export function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

/**
 * 截斷文字
 * @param {string} text - 原始文字
 * @param {number} maxLength - 最大長度
 * @returns {string} 截斷後的文字
 */
export function truncateText(text, maxLength = 50) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
