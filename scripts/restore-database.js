/**
 * 還原 Supabase 資料庫備份
 *
 * 此腳本會：
 * 1. 讀取備份的 JSON 檔案
 * 2. 還原資料到 Supabase（支援新專案遷移）
 * 3. 驗證資料完整性
 *
 * 執行方式：
 * - 一般還原: npm run restore-db <timestamp>
 * - 新專案還原（跳過 ID）: npm run restore-db <timestamp> --new-project
 *
 * 範例：
 * - npm run restore-db 2025-11-06T01-23-45
 * - npm run restore-db 2025-11-06T01-23-45 --new-project
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 載入環境變數
dotenv.config({ path: join(__dirname, '../.env') })

// 初始化 Supabase 客戶端（使用 SERVICE_KEY 以繞過 RLS）
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 錯誤: 缺少 Supabase 環境變數')
  console.error('需要: VITE_SUPABASE_URL 和 VITE_SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * 讀取備份檔案
 */
function readBackupFile(tableName, timestamp) {
  const backupDir = join(__dirname, '../backups')
  const filename = `${tableName}_backup_${timestamp}.json`
  const filepath = join(backupDir, filename)

  if (!fs.existsSync(filepath)) {
    throw new Error(`備份檔案不存在: ${filepath}`)
  }

  const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
  return data
}

/**
 * 還原資料表
 * @param {string} tableName - 資料表名稱
 * @param {Array} data - 要還原的資料
 * @param {boolean} isNewProject - 是否為新專案（跳過 ID 欄位）
 */
async function restoreTable(tableName, data, isNewProject = false) {
  console.log(`\n📥 正在還原 ${tableName} 表...`)
  console.log(`   資料筆數: ${data.length}`)
  console.log(`   模式: ${isNewProject ? '新專案（忽略舊 ID）' : '一般還原'}`)

  if (data.length === 0) {
    console.log('⚠️  無資料，跳過')
    return { success: true, successCount: 0, errorCount: 0 }
  }

  const batchSize = 100
  let successCount = 0
  let errorCount = 0
  const errors = []

  try {
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize)

      // 新專案模式：移除 ID 欄位，讓資料庫自動生成
      const processedBatch = isNewProject 
        ? batch.map(row => {
            const { id, ...rest } = row
            return rest
          })
        : batch

      // 根據表類型選擇不同的衝突處理策略
      let upsertOptions = {}
      
      if (isNewProject) {
        // 新專案：使用唯一鍵做 upsert（如果存在則更新）
        if (tableName === 'users') {
          upsertOptions = { onConflict: 'line_user_id' }
        } else if (tableName === 'messages') {
          upsertOptions = { onConflict: 'line_message_id' }
        } else if (tableName === 'message_limits') {
          upsertOptions = { onConflict: 'limit_type' }
        } else if (tableName === 'system_stats') {
          upsertOptions = { onConflict: 'stat_name' }
        }
      } else {
        // 一般還原：使用 ID 做 upsert
        upsertOptions = { onConflict: 'id' }
      }

      const { error } = await supabase
        .from(tableName)
        .upsert(processedBatch, upsertOptions)

      if (error) {
        console.error(`   ❌ 批次 ${Math.floor(i / batchSize) + 1} 失敗:`, error.message)
        errorCount += batch.length
        errors.push({
          batch: Math.floor(i / batchSize) + 1,
          error: error.message,
          hint: error.hint
        })
      } else {
        successCount += batch.length
        console.log(`   ✅ 已還原 ${successCount} / ${data.length} 筆`)
      }
    }

    console.log(`\n✅ ${tableName} 表還原完成`)
    console.log(`   成功: ${successCount} 筆`)
    console.log(`   失敗: ${errorCount} 筆`)

    if (errors.length > 0) {
      console.log(`\n   錯誤詳情:`)
      errors.forEach(err => {
        console.log(`   - 批次 ${err.batch}: ${err.error}`)
        if (err.hint) console.log(`     提示: ${err.hint}`)
      })
    }

    return { success: errorCount === 0, successCount, errorCount, errors }
  } catch (error) {
    console.error(`❌ ${tableName} 表還原失敗:`, error.message)
    return { success: false, successCount, errorCount, errors: [error.message] }
  }
}

/**
 * 主要還原流程
 */
async function restoreDatabase() {
  const args = process.argv.slice(2)
  const timestamp = args[0]
  const isNewProject = args.includes('--new-project')

  if (!timestamp) {
    console.error('❌ 錯誤: 請提供備份時間戳記')
    console.error('\n使用方式:')
    console.error('  一般還原: npm run restore-db <timestamp>')
    console.error('  新專案還原: npm run restore-db <timestamp> --new-project')
    console.error('\n範例:')
    console.error('  npm run restore-db 2025-11-06T01-23-45')
    console.error('  npm run restore-db 2025-11-06T01-23-45 --new-project')
    console.error('\n可用的備份檔案:')

    const backupDir = join(__dirname, '../backups')
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('backup_report_'))
        .map(f => f.replace('backup_report_', '').replace('.json', ''))
        .sort()
        .reverse()

      files.forEach(ts => console.log(`  - ${ts}`))
    }

    process.exit(1)
  }

  console.log('=' .repeat(70))
  console.log('🔄 開始還原 Supabase 資料庫')
  console.log('=' .repeat(70))
  console.log(`還原時間: ${new Date().toLocaleString('zh-TW')}`)
  console.log(`備份時間戳記: ${timestamp}`)
  console.log(`目標專案: ${supabaseUrl}`)
  console.log(`還原模式: ${isNewProject ? '新專案（自動生成 ID）' : '一般還原（保留 ID）'}`)
  console.log()

  if (isNewProject) {
    console.log('⚠️  新專案模式注意事項:')
    console.log('  - 會忽略備份中的 ID，由新專案自動生成')
    console.log('  - 使用唯一鍵（line_user_id, line_message_id 等）防止重複')
    console.log('  - 適合遷移到新的 Supabase 專案')
    console.log()
  }

  // 要還原的資料表清單（按依賴順序）
  const tables = ['users', 'messages', 'message_limits', 'system_stats']
  const restoredData = {}
  const restoreResults = {}

  // 讀取所有備份檔案
  console.log('📂 讀取備份檔案...')
  for (const tableName of tables) {
    try {
      const data = readBackupFile(tableName, timestamp)
      restoredData[tableName] = data
      console.log(`✅ ${tableName} 備份讀取成功: ${data.length} 筆`)
    } catch (error) {
      console.error(`⚠️  ${tableName} 備份檔案不存在，跳過: ${error.message}`)
      restoredData[tableName] = []
    }
  }

  // 依序還原資料（users 必須先還原，因為 messages 有外鍵依賴）
  console.log('\n' + '─'.repeat(70))
  console.log('開始還原資料...')
  
  for (const tableName of tables) {
    console.log('─'.repeat(70))
    const result = await restoreTable(tableName, restoredData[tableName], isNewProject)
    restoreResults[tableName] = result
  }

  // 輸出總結
  console.log('\n' + '='.repeat(70))
  console.log('📊 還原總結報告')
  console.log('='.repeat(70))
  
  let totalSuccess = 0
  let totalFailed = 0
  let allSuccess = true

  for (const tableName of tables) {
    const result = restoreResults[tableName]
    const status = result.success ? '✅' : '❌'
    console.log(`${status} ${tableName}: ${result.successCount} 筆成功, ${result.errorCount} 筆失敗`)
    totalSuccess += result.successCount
    totalFailed += result.errorCount
    if (!result.success) allSuccess = false
  }

  console.log('─'.repeat(70))
  console.log(`總計: ${totalSuccess} 筆成功, ${totalFailed} 筆失敗`)
  console.log('='.repeat(70))

  if (allSuccess) {
    console.log('\n✅ 所有資料已成功還原！')
    console.log('\n下一步:')
    console.log('  1. 執行驗證: npm run verify-db')
    console.log('  2. 測試前端: npm run dev')
    console.log('  3. 測試後端: npm run dev:server')
    process.exit(0)
  } else {
    console.log('\n⚠️  部分資料還原失敗，請檢查錯誤訊息')
    console.log('\n可能的解決方案:')
    console.log('  1. 確認資料庫結構已正確建立（執行 Migration）')
    console.log('  2. 檢查 VITE_SUPABASE_SERVICE_KEY 是否正確')
    console.log('  3. 查看上方的錯誤詳情')
    process.exit(1)
  }
}

// 執行還原
restoreDatabase().catch(err => {
  console.error('\n❌ 還原過程發生錯誤:', err)
  process.exit(1)
})
