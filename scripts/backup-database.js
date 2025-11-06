/**
 * 備份 Supabase 資料庫
 *
 * 此腳本會：
 * 1. 匯出 users 和 messages 表的所有資料
 * 2. 儲存為 JSON 格式
 * 3. 建立時間戳記的備份檔案
 *
 * 執行方式：npm run backup-db
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

// 初始化 Supabase 客戶端
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 錯誤: 缺少 Supabase 環境變數')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * 備份單一資料表
 */
async function backupTable(tableName) {
  console.log(`\n📦 正在備份 ${tableName} 表...`)

  let allData = []
  let from = 0
  const batchSize = 1000

  try {
    while (true) {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .range(from, from + batchSize - 1)

      if (error) {
        throw new Error(`查詢失敗: ${error.message}`)
      }

      if (!data || data.length === 0) {
        break
      }

      allData = allData.concat(data)
      from += batchSize

      console.log(`   已匯出 ${allData.length} 筆資料...`)

      if (data.length < batchSize) {
        break
      }
    }

    console.log(`✅ ${tableName} 表備份完成: 共 ${allData.length} 筆資料`)
    return { success: true, data: allData, count: allData.length }
  } catch (error) {
    console.error(`❌ ${tableName} 表備份失敗:`, error.message)
    return { success: false, error: error.message, data: [], count: 0 }
  }
}

/**
 * 儲存備份檔案
 */
function saveBackupFile(tableName, data, timestamp) {
  const backupDir = join(__dirname, '../backups')

  // 建立 backups 目錄
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const filename = `${tableName}_backup_${timestamp}.json`
  const filepath = join(backupDir, filename)

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8')

  console.log(`💾 備份檔案已儲存: ${filepath}`)
  return filepath
}

/**
 * 主要備份流程
 */
async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)

  console.log('=' .repeat(70))
  console.log('🔄 開始備份 Supabase 資料庫')
  console.log('=' .repeat(70))
  console.log(`備份時間: ${new Date().toLocaleString('zh-TW')}`)
  console.log(`時間戳記: ${timestamp}`)
  console.log()

  const backupReport = {
    timestamp: new Date().toISOString(),
    tables: {},
    files: [],
    summary: {
      totalTables: 0,
      successfulBackups: 0,
      failedBackups: 0,
      totalRecords: 0
    }
  }

  // 要備份的資料表清單
  const tables = ['users', 'messages', 'message_limits', 'system_stats']

  // 依序備份每個資料表
  for (const tableName of tables) {
    console.log('─'.repeat(70))
    const backup = await backupTable(tableName)
    backupReport.tables[tableName] = backup
    backupReport.summary.totalTables++

    if (backup.success) {
      const backupFile = saveBackupFile(tableName, backup.data, timestamp)
      backupReport.files.push(backupFile)
      backupReport.summary.successfulBackups++
      backupReport.summary.totalRecords += backup.count
    } else {
      backupReport.summary.failedBackups++
    }
  }

  // 儲存備份報告
  const reportFile = join(__dirname, '../backups', `backup_report_${timestamp}.json`)
  fs.writeFileSync(reportFile, JSON.stringify(backupReport, null, 2), 'utf-8')
  backupReport.files.push(reportFile)

  // 輸出總結
  console.log('\n' + '='.repeat(70))
  console.log('📊 備份總結報告')
  console.log('='.repeat(70))
  console.log(`總表數: ${backupReport.summary.totalTables}`)
  console.log(`成功備份: ${backupReport.summary.successfulBackups} ✅`)
  console.log(`失敗備份: ${backupReport.summary.failedBackups} ${backupReport.summary.failedBackups > 0 ? '❌' : ''}`)
  console.log(`總資料筆數: ${backupReport.summary.totalRecords}`)
  console.log()
  console.log('📁 備份檔案:')
  backupReport.files.forEach(file => {
    const fileSize = fs.statSync(file).size
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2)
    console.log(`   - ${file} (${fileSizeMB} MB)`)
  })

  console.log()
  console.log('='.repeat(70))

  if (backupReport.summary.failedBackups > 0) {
    console.log('⚠️  部分備份失敗，請檢查錯誤訊息')
    console.log('建議: 解決問題後重新執行備份')
    process.exit(1)
  } else {
    console.log('✅ 所有資料已成功備份！')
    console.log('下一步: 執行 npm run migrate-db 進行資料庫遷移')
  }

  console.log('='.repeat(70))
  console.log()

  return backupReport
}

// 執行備份
backupDatabase()
  .then(report => {
    if (report.summary.failedBackups === 0) {
      process.exit(0)
    }
  })
  .catch(err => {
    console.error('\n❌ 備份過程發生錯誤:', err)
    process.exit(1)
  })
