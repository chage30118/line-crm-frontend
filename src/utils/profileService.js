/**
 * 用戶 Profile API 服務
 * 
 * 用於處理用戶資料的更新，包括從 LINE API 刷新頭像
 * 
 * 注意：需要後端配合實作對應的 API endpoint
 */

import { supabase } from './supabase'

/**
 * 刷新用戶的 LINE Profile 資料（包含頭像）
 * 
 * 此函數會呼叫後端 API，後端會：
 * 1. 使用 LINE Profile API 獲取最新的用戶資料
 * 2. 更新 Supabase 資料庫中的 picture_url
 * 3. 返回更新後的用戶資料
 * 
 * @param {number} userId - 用戶 ID
 * @returns {Promise<Object>} 更新後的用戶資料
 */
export async function refreshUserProfile(userId) {
  // 使用環境變數或預設的本地後端
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002'
  
  try {
    const response = await fetch(`${backendUrl}/api/users/${userId}/refresh-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('[refreshUserProfile] 刷新失敗:', error)
    throw error
  }
}

/**
 * 直接更新用戶頭像 URL（前端臨時方案）
 * 
 * 當後端 API 未實作時的備用方案
 * 
 * @param {number} userId - 用戶 ID
 * @param {string} pictureUrl - 新的頭像 URL
 * @returns {Promise<Object>} 更新結果
 */
export async function updateUserAvatar(userId, pictureUrl) {
  const { data, error } = await supabase
    .from('users')
    .update({ 
      picture_url: pictureUrl,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('[updateUserAvatar] 更新失敗:', error)
    throw error
  }

  return data
}

/**
 * 批次刷新多個用戶的 Profile
 * 
 * @param {number[]} userIds - 用戶 ID 陣列
 * @returns {Promise<Object>} 刷新結果統計
 */
export async function batchRefreshProfiles(userIds) {
  const results = {
    success: [],
    failed: [],
    total: userIds.length
  }

  for (const userId of userIds) {
    try {
      const data = await refreshUserProfile(userId)
      results.success.push({ userId, data })
    } catch (error) {
      results.failed.push({ userId, error: error.message })
    }
  }

  return results
}

/**
 * 檢查頭像 URL 是否有效
 * 
 * @param {string} url - 頭像 URL
 * @returns {Promise<boolean>} URL 是否有效
 */
export async function checkAvatarUrl(url) {
  if (!url) return false

  try {
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}
