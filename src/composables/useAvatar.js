/**
 * 頭像載入處理 Composable
 * 
 * 功能：
 * 1. 偵測頭像 URL 是否失效（404）
 * 2. 失效時顯示預設圖示
 * 3. 記錄失效的 URL 避免重複嘗試
 */

import { ref, watch } from 'vue'

// 全域快取：記錄已知失效的 URL（避免重複檢測）
const failedUrls = new Set()

/**
 * 使用頭像 URL 並處理載入失敗
 * @param {String|Ref} pictureUrl - 頭像 URL（可以是 ref 或字串）
 * @returns {Object} { avatarSrc, onError, isLoading, isFailed }
 */
export function useAvatar(pictureUrl) {
  const avatarSrc = ref('')
  const isLoading = ref(false)
  const isFailed = ref(false)

  /**
   * 檢查並設置頭像 URL
   */
  const checkAndSetAvatar = (url) => {
    // 如果沒有 URL，直接顯示預設圖示
    if (!url) {
      avatarSrc.value = ''
      isFailed.value = false
      return
    }

    // 如果 URL 已知失效，直接顯示預設圖示
    if (failedUrls.has(url)) {
      avatarSrc.value = ''
      isFailed.value = true
      return
    }

    // 設置 URL（瀏覽器會嘗試載入）
    avatarSrc.value = url
    isFailed.value = false
  }

  /**
   * 處理圖片載入錯誤
   */
  const onError = () => {
    const url = avatarSrc.value
    
    // 記錄失效的 URL
    if (url) {
      failedUrls.add(url)
      console.warn(`[useAvatar] 頭像載入失敗: ${url}`)
    }

    // 清空 src，顯示預設圖示
    avatarSrc.value = ''
    isFailed.value = true
  }

  /**
   * 處理圖片載入成功
   */
  const onLoad = () => {
    isLoading.value = false
    isFailed.value = false
  }

  // 監聽 pictureUrl 變化
  watch(
    () => (typeof pictureUrl === 'object' ? pictureUrl.value : pictureUrl),
    (newUrl) => {
      checkAndSetAvatar(newUrl)
    },
    { immediate: true }
  )

  return {
    avatarSrc,     // 實際使用的 src（可能為空）
    onError,       // 綁定到 @error 事件
    onLoad,        // 綁定到 @load 事件
    isLoading,     // 是否正在載入
    isFailed       // 是否載入失敗
  }
}

/**
 * 清除失效 URL 快取（用於強制重新檢測）
 */
export function clearFailedUrlsCache() {
  failedUrls.clear()
}

/**
 * 檢查 URL 是否已知失效
 */
export function isUrlFailed(url) {
  return failedUrls.has(url)
}
