/**
 * Debug 路由 - 僅供開發測試使用
 */

import express from 'express'

const router = express.Router()

/**
 * GET /debug/env
 * 檢查環境變數是否正確載入（隱藏敏感資訊）
 */
router.get('/env', (req, res) => {
  const envCheck = {
    LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN ? '✓ 已設定' : '✗ 未設定',
    LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET ? `✓ 已設定 (長度: ${process.env.LINE_CHANNEL_SECRET.length})` : '✗ 未設定',
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? '✓ 已設定' : '✗ 未設定',
    VITE_SUPABASE_SERVICE_KEY: process.env.VITE_SUPABASE_SERVICE_KEY ? '✓ 已設定' : '✗ 未設定',
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || '3002'
  }
  
  res.json({
    success: true,
    environment: envCheck,
    note: '若環境變數未設定，請檢查 Railway Dashboard → Variables'
  })
})

/**
 * GET /debug/channel-secret
 * 顯示 CHANNEL_SECRET 的前後3碼（用於驗證是否正確）
 */
router.get('/channel-secret', (req, res) => {
  const secret = process.env.LINE_CHANNEL_SECRET
  
  if (!secret) {
    return res.json({
      success: false,
      error: 'LINE_CHANNEL_SECRET 未設定'
    })
  }
  
  res.json({
    success: true,
    length: secret.length,
    preview: `${secret.substring(0, 3)}...${secret.substring(secret.length - 3)}`,
    correctValue: 'a93...115',
    match: secret === 'a93a947b8d88626db538ae0c54605115'
  })
})

export default router
