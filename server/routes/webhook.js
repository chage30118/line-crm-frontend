/**
 * LINE Webhook 路由
 * 
 * 處理來自 LINE 平台的 Webhook 事件
 */

import express from 'express'
import { middleware, Client } from '@line/bot-sdk'
import { createClient } from '@supabase/supabase-js'

const router = express.Router()

// LINE 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
}

// LINE Client
const lineClient = new Client(config)

// Supabase Client
let supabase = null

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_KEY
    )
  }
  return supabase
}

/**
 * POST /webhook
 * 接收 LINE Webhook 事件
 * 
 * ⚠️ 使用 LINE SDK 的 middleware 自動處理：
 * 1. 簽章驗證
 * 2. Body 解析
 * 3. 將事件掛載到 req.body.events
 */
router.post('/', middleware(config), async (req, res) => {
  try {
    const events = req.body.events
    
    console.log(`[Webhook] 收到 ${events.length} 個事件`)
    
    // 處理每個事件
    const results = await Promise.all(
      events.map(event => handleEvent(event))
    )
    
    res.json({ 
      success: true,
      processed: results.length 
    })
    
  } catch (error) {
    console.error('[Webhook] 處理錯誤:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 處理單一 Webhook 事件
 */
async function handleEvent(event) {
  console.log('[Webhook] 事件類型:', event.type)
  
  // 這裡可以根據事件類型做不同處理
  switch (event.type) {
    case 'message':
      return handleMessageEvent(event)
      
    case 'follow':
      return handleFollowEvent(event)
      
    case 'unfollow':
      return handleUnfollowEvent(event)
      
    default:
      console.log('[Webhook] 未處理的事件類型:', event.type)
      return null
  }
}

/**
 * 處理訊息事件
 */
async function handleMessageEvent(event) {
  const userId = event.source.userId
  const messageId = event.message.id
  const messageType = event.message.type
  const timestamp = new Date(event.timestamp)
  
  console.log('[訊息事件] 用戶:', userId, '訊息類型:', messageType)
  
  try {
    const supabase = getSupabase()
    
    // 1. 確保用戶存在，若不存在則建立
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('line_user_id', userId)
      .single()
    
    if (userError && userError.code === 'PGRST116') {
      // 用戶不存在，建立新用戶
      console.log('[用戶管理] 建立新用戶:', userId)
      
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          line_user_id: userId,
          first_message_at: timestamp,
          last_message_at: timestamp,
          message_count: 1,
          unread_count: 1
        })
        .select('id')
        .single()
      
      if (insertError) {
        throw new Error(`建立用戶失敗: ${insertError.message}`)
      }
      
      user = newUser
      
      // 背景更新用戶 Profile（不阻塞）
      updateUserProfile(userId).catch(err => 
        console.error('[用戶管理] 更新 Profile 失敗:', err)
      )
    } else if (userError) {
      throw new Error(`查詢用戶失敗: ${userError.message}`)
    } else {
      // 用戶已存在，更新最後訊息時間、訊息計數、未讀計數
      const { data: userData, error: updateError } = await supabase
        .from('users')
        .select('message_count, unread_count')
        .eq('id', user.id)
        .single()
      
      if (!updateError) {
        await supabase
          .from('users')
          .update({
            last_message_at: timestamp,
            message_count: (userData.message_count || 0) + 1,
            unread_count: (userData.unread_count || 0) + 1
          })
          .eq('id', user.id)
      }
    }
    
    // 2. 儲存訊息
    const messageData = {
      line_message_id: messageId,
      user_id: user.id,
      message_type: messageType,
      timestamp: timestamp.toISOString(),
      processed: false
    }
    
    // 根據訊息類型儲存內容
    if (messageType === 'text') {
      messageData.text_content = event.message.text
    } else if (['image', 'video', 'audio', 'file'].includes(messageType)) {
      // TODO: 實作檔案下載和上傳到 Supabase Storage
      messageData.file_id = messageId
      console.log('[檔案訊息] 待實作: 下載並儲存到 Storage')
    } else if (messageType === 'sticker') {
      messageData.text_content = `[貼圖] Package: ${event.message.packageId}, Sticker: ${event.message.stickerId}`
    } else if (messageType === 'location') {
      messageData.text_content = `[位置] ${event.message.address || '座標: ' + event.message.latitude + ',' + event.message.longitude}`
    }
    
    const { error: messageError } = await supabase
      .from('messages')
      .insert(messageData)
    
    if (messageError) {
      // 檢查是否為重複訊息（line_message_id 唯一約束）
      if (messageError.code === '23505') {
        console.log('[訊息儲存] 重複訊息，已忽略:', messageId)
      } else {
        throw new Error(`儲存訊息失敗: ${messageError.message}`)
      }
    } else {
      console.log('[訊息儲存] 成功:', messageId)
    }
    
    return { type: 'message', processed: true, userId, messageId }
    
  } catch (error) {
    console.error('[訊息事件] 處理失敗:', error)
    throw error
  }
}

/**
 * 更新用戶 LINE Profile
 */
async function updateUserProfile(userId) {
  try {
    const profile = await lineClient.getProfile(userId)
    const supabase = getSupabase()
    
    await supabase
      .from('users')
      .update({
        display_name: profile.displayName,
        picture_url: profile.pictureUrl,
        status_message: profile.statusMessage,
        language: profile.language
      })
      .eq('line_user_id', userId)
    
    console.log('[用戶管理] Profile 更新成功:', userId)
  } catch (error) {
    console.error('[用戶管理] Profile 更新失敗:', error.message)
  }
}

/**
 * 處理加入好友事件
 */
async function handleFollowEvent(event) {
  const userId = event.source.userId
  console.log('[加入好友] 用戶:', userId)
  
  try {
    const supabase = getSupabase()
    
    // 檢查用戶是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('line_user_id', userId)
      .single()
    
    if (existingUser) {
      // 用戶重新加入，更新狀態
      await supabase
        .from('users')
        .update({ is_active: true })
        .eq('line_user_id', userId)
      
      console.log('[加入好友] 用戶重新啟用:', userId)
    } else {
      // 新用戶，建立記錄
      await supabase
        .from('users')
        .insert({
          line_user_id: userId,
          is_active: true
        })
      
      console.log('[加入好友] 建立新用戶:', userId)
    }
    
    // 背景更新 Profile
    updateUserProfile(userId).catch(err => 
      console.error('[加入好友] 更新 Profile 失敗:', err)
    )
    
    // TODO: 發送歡迎訊息
    // await lineClient.replyMessage(event.replyToken, {
    //   type: 'text',
    //   text: '歡迎加入！'
    // })
    
    return { type: 'follow', processed: true, userId }
    
  } catch (error) {
    console.error('[加入好友] 處理失敗:', error)
    throw error
  }
}

/**
 * 處理封鎖事件
 */
async function handleUnfollowEvent(event) {
  const userId = event.source.userId
  console.log('[封鎖] 用戶:', userId)
  
  try {
    const supabase = getSupabase()
    
    // 標記用戶為非活躍
    await supabase
      .from('users')
      .update({ is_active: false })
      .eq('line_user_id', userId)
    
    console.log('[封鎖] 用戶已標記為非活躍:', userId)
    
    return { type: 'unfollow', processed: true, userId }
    
  } catch (error) {
    console.error('[封鎖] 處理失敗:', error)
    throw error
  }
}

export default router
