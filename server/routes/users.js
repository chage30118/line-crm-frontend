/**
 * 用戶管理 API 路由
 */

import express from 'express'
import { Client } from '@line/bot-sdk'
import { createClient } from '@supabase/supabase-js'

const router = express.Router()

// LINE Client（延遲初始化）
let lineClient = null

function getLineClient() {
  if (!lineClient) {
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
    
    if (!channelAccessToken) {
      throw new Error('環境變數 LINE_CHANNEL_ACCESS_TOKEN 未設定')
    }
    
    lineClient = new Client({ channelAccessToken })
  }
  return lineClient
}

// Supabase Client（延遲初始化）
let supabase = null

function getSupabase() {
  if (!supabase) {
    const url = process.env.VITE_SUPABASE_URL
    const key = process.env.VITE_SUPABASE_SERVICE_KEY
    
    if (!url || !key) {
      throw new Error('環境變數 VITE_SUPABASE_URL 或 VITE_SUPABASE_SERVICE_KEY 未設定')
    }
    
    supabase = createClient(url, key)
  }
  return supabase
}

/**
 * POST /api/users/:userId/refresh-profile
 * 刷新用戶的 LINE Profile 資料（包含頭像）
 */
router.post('/:userId/refresh-profile', async (req, res) => {
  const { userId } = req.params
  
  console.log(`[刷新頭像] 開始處理用戶 ID: ${userId}`)
  
  const db = getSupabase()
  
  try {
    // 1. 從 Supabase 獲取用戶的 line_user_id
    const { data: user, error: fetchError } = await db
      .from('users')
      .select('id, line_user_id, display_name')
      .eq('id', parseInt(userId))
      .single()
    
    if (fetchError || !user) {
      console.error('[刷新頭像] 用戶不存在:', fetchError)
      return res.status(404).json({ 
        success: false,
        error: '用戶不存在' 
      })
    }
    
    console.log(`[刷新頭像] 找到用戶: ${user.display_name} (${user.line_user_id})`)
    
    // 2. 呼叫 LINE Profile API 獲取最新資料
    let profile
    try {
      const client = getLineClient()
      profile = await client.getProfile(user.line_user_id)
      console.log('[刷新頭像] 成功獲取 LINE Profile')
    } catch (lineError) {
      console.error('[刷新頭像] LINE API 錯誤:', lineError.message)
      
      if (lineError.statusCode === 404) {
        return res.status(404).json({
          success: false,
          error: '用戶已封鎖機器人或刪除帳號',
          details: '無法從 LINE 獲取用戶資料'
        })
      }
      
      throw lineError
    }
    
    // 3. 更新 Supabase 資料庫
    const { data: updatedUser, error: updateError } = await db
      .from('users')
      .update({
        display_name: profile.displayName,
        picture_url: profile.pictureUrl,
        status_message: profile.statusMessage,
        language: profile.language || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', parseInt(userId))
      .select()
      .single()
    
    if (updateError) {
      console.error('[刷新頭像] 資料庫更新失敗:', updateError)
      throw updateError
    }
    
    console.log('[刷新頭像] 成功更新資料庫')
    console.log(`  新頭像 URL: ${updatedUser.picture_url}`)
    
    // 4. 返回成功結果
    res.json({
      success: true,
      message: '頭像已更新',
      user: {
        id: updatedUser.id,
        display_name: updatedUser.display_name,
        picture_url: updatedUser.picture_url,
        updated_at: updatedUser.updated_at
      }
    })
    
  } catch (error) {
    console.error('[刷新頭像] 未預期的錯誤:', error)
    res.status(500).json({
      success: false,
      error: '伺服器內部錯誤',
      message: error.message
    })
  }
})

/**
 * POST /api/users/batch-refresh
 * 批次刷新多個用戶的頭像
 */
router.post('/batch-refresh', async (req, res) => {
  const { userIds } = req.body
  
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: '請提供用戶 ID 陣列',
      example: { userIds: [1, 2, 3] }
    })
  }
  
  console.log(`[批次刷新] 開始處理 ${userIds.length} 個用戶`)
  
  const db = getSupabase()
  
  const results = {
    success: [],
    failed: [],
    total: userIds.length
  }
  
  // 逐一處理每個用戶
  for (const userId of userIds) {
    try {
      const { data: user } = await db
        .from('users')
        .select('line_user_id')
        .eq('id', parseInt(userId))
        .single()
      
      if (!user) {
        results.failed.push({ userId, reason: '用戶不存在' })
        continue
      }
      
      const profile = await getLineClient().getProfile(user.line_user_id)
      
      await db
        .from('users')
        .update({
          picture_url: profile.pictureUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', parseInt(userId))
      
      results.success.push({ userId, picture_url: profile.pictureUrl })
      
    } catch (error) {
      results.failed.push({ 
        userId, 
        reason: error.message 
      })
    }
  }
  
  console.log(`[批次刷新] 完成 - 成功: ${results.success.length}, 失敗: ${results.failed.length}`)
  
  res.json(results)
})

export default router
