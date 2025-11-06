/**
 * Express 後端伺服器
 * 
 * 功能：
 * 1. 提供 API 端點（用戶管理、頭像更新等）
 * 2. 處理 LINE Webhook
 * 3. 生產環境提供前端靜態檔案
 */

// ⚠️ 必須在所有 import 之前載入環境變數
import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import { fileURLToPath } from 'url'

// ES Module 環境變數
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 路由（此時 process.env 已載入）
import webhookRouter from './routes/webhook.js'
import usersRouter from './routes/users.js'
import healthRouter from './routes/health.js'
import debugRouter from './routes/debug.js'

const app = express()
const PORT = process.env.PORT || 3002
const isDevelopment = process.env.NODE_ENV !== 'production'

// ===== 中介軟體 =====

// 安全性
app.use(helmet({
  contentSecurityPolicy: false, // 允許 Vite 的內聯腳本
}))

// CORS 設定
app.use(cors({
  origin: isDevelopment 
    ? 'http://localhost:5173'  // 開發環境：允許 Vite dev server
    : process.env.FRONTEND_URL || '*',  // 生產環境：設定允許的網域
  credentials: true
}))

// ⚠️ Webhook 必須在 express.json() 之前處理（需要 raw body 驗證簽章）
app.use('/webhook', webhookRouter)

// 解析 JSON（其他 API 路由使用）
app.use(express.json())

// 日誌（開發環境使用）
if (isDevelopment) {
  app.use(morgan('dev'))
}

// ===== API 路由 =====

app.use('/api/health', healthRouter)
app.use('/api/users', usersRouter)
app.use('/api/debug', debugRouter)

// ===== 前端靜態檔案（生產環境） =====

if (!isDevelopment) {
  // 提供打包後的前端檔案
  const distPath = path.join(__dirname, '../dist')
  app.use(express.static(distPath))
  
  // SPA fallback：所有非 API 請求都返回 index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/webhook')) {
      res.sendFile(path.join(distPath, 'index.html'))
    }
  })
}

// ===== 錯誤處理 =====

// 404 處理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'API 端點不存在',
    path: req.path
  })
})

// 全域錯誤處理
app.use((err, req, res, next) => {
  console.error('[伺服器錯誤]', err)
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || '伺服器內部錯誤',
    ...(isDevelopment && { stack: err.stack })
  })
})

// ===== 啟動伺服器 =====

app.listen(PORT, () => {
  console.log('┌────────────────────────────────────────┐')
  console.log('│   LINE CRM 後端伺服器已啟動           │')
  console.log('├────────────────────────────────────────┤')
  console.log(`│ 環境: ${isDevelopment ? '開發' : '生產'}`)
  console.log(`│ 埠號: ${PORT}`)
  console.log(`│ API:  http://localhost:${PORT}/api`)
  console.log('└────────────────────────────────────────┘')
})

export default app
