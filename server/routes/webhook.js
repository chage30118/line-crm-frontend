/**
 * LINE Webhook 路由
 * 
 * 處理來自 LINE 平台的 Webhook 事件
 */

import express from 'express'
import { middleware, Client } from '@line/bot-sdk'

const router = express.Router()

// LINE Client（延遲初始化）
let lineClient = null

function getLineClient() {
  if (!lineClient) {
    const config = {
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
      channelSecret: process.env.LINE_CHANNEL_SECRET
    }
    
    if (!config.channelAccessToken || !config.channelSecret) {
      throw new Error('LINE 環境變數未設定：LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET')
    }
    
    lineClient = new Client(config)
  }
  return lineClient
}

/**
 * POST /webhook
 * 接收 LINE Webhook 事件
 */
router.post('/', (req, res, next) => {
  // 動態建立 middleware
  const middlewareConfig = {
    channelSecret: process.env.LINE_CHANNEL_SECRET
  }
  
  if (!middlewareConfig.channelSecret) {
    return res.status(500).json({
      success: false,
      error: '環境變數 LINE_CHANNEL_SECRET 未設定'
    })
  }
  
  // 執行 LINE 的簽章驗證 middleware
  middleware(middlewareConfig)(req, res, next)
}, async (req, res) => {
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
  console.log('[訊息事件] 從用戶:', event.source.userId)
  
  // TODO: 實作訊息處理邏輯
  // 1. 儲存訊息到 Supabase
  // 2. 自動更新用戶 Profile（可選）
  
  return { type: 'message', processed: true }
}

/**
 * 處理加入好友事件
 */
async function handleFollowEvent(event) {
  console.log('[加入好友] 用戶:', event.source.userId)
  
  // TODO: 歡迎訊息
  
  return { type: 'follow', processed: true }
}

/**
 * 處理封鎖事件
 */
async function handleUnfollowEvent(event) {
  console.log('[封鎖] 用戶:', event.source.userId)
  
  // TODO: 標記用戶為非活躍
  
  return { type: 'unfollow', processed: true }
}

export default router
