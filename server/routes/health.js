/**
 * 健康檢查路由
 */

import express from 'express'

const router = express.Router()

/**
 * GET /api/health
 * 檢查伺服器狀態
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  })
})

export default router
