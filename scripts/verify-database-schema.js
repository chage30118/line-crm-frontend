/**
 * 驗證 Supabase 資料庫架構
 *
 * 此腳本會：
 * 1. 連接到 Supabase 資料庫
 * 2. 查詢實際的資料表結構
 * 3. 與 configs/database.js 的定義進行比對
 * 4. 產生詳細的差異報告
 *
 * 執行方式：node scripts/verify-database-schema.js
 */

import { createClient } from '@supabase/supabase-js'
import { DATABASE_SCHEMA, TABLES, getTableColumns } from '../configs/database.js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 載入環境變數
dotenv.config({ path: join(__dirname, '../.env') })

// 初始化 Supabase 客戶端
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 錯誤: 缺少 Supabase 環境變數')
  console.error('請確認 .env 檔案包含:')
  console.error('  - VITE_SUPABASE_URL')
  console.error('  - VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 開始驗證 Supabase 資料庫架構...\n')
console.log('=' .repeat(70))
console.log('Supabase URL:', supabaseUrl)
console.log('=' .repeat(70))
console.log()

/**
 * 查詢 Supabase 實際存在的資料表
 */
async function getActualTables() {
  const { data, error } = await supabase.rpc('get_tables_info', {})

  // 如果 RPC 函數不存在，改用直接查詢（需要適當權限）
  // 使用一個簡單的查詢來檢查資料表是否存在
  const tables = Object.values(TABLES)
  const results = {}

  for (const tableName of tables) {
    try {
      // 嘗試查詢資料表（limit 0 不會返回資料，只檢查表是否存在）
      const { error } = await supabase
        .from(tableName)
        .select('*')
        .limit(0)

      results[tableName] = { exists: !error, error: error?.message }
    } catch (err) {
      results[tableName] = { exists: false, error: err.message }
    }
  }

  return results
}

/**
 * 查詢資料表的實際欄位
 */
async function getActualColumns(tableName) {
  try {
    // 查詢一筆資料來獲取欄位結構
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)

    if (error) {
      return { columns: [], error: error.message }
    }

    // 如果有資料，返回欄位名稱
    if (data && data.length > 0) {
      return { columns: Object.keys(data[0]), error: null }
    }

    // 如果資料表為空，嘗試用 count 查詢來確認表存在
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (!countError) {
      // 表存在但沒有資料，無法取得欄位列表
      return { columns: null, error: '資料表存在但沒有資料，無法取得欄位列表' }
    }

    return { columns: [], error: countError.message }
  } catch (err) {
    return { columns: [], error: err.message }
  }
}

/**
 * 查詢資料表的筆數
 */
async function getTableCount(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (error) {
      return { count: null, error: error.message }
    }

    return { count, error: null }
  } catch (err) {
    return { count: null, error: err.message }
  }
}

/**
 * 主要驗證流程
 */
async function verifySchema() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTables: 0,
      existingTables: 0,
      missingTables: 0,
      tablesWithIssues: 0
    },
    tables: {}
  }

  const tableNames = Object.values(TABLES)
  report.summary.totalTables = tableNames.length

  console.log('📊 正在檢查資料表...\n')

  for (const tableName of tableNames) {
    const expectedColumns = getTableColumns(tableName)
    const tableSchema = DATABASE_SCHEMA[tableName]

    console.log(`\n${'─'.repeat(70)}`)
    console.log(`📋 資料表: ${tableName}`)
    console.log(`   描述: ${tableSchema.description}`)
    console.log(`${'─'.repeat(70)}`)

    // 檢查資料表是否存在
    const { columns: actualColumns, error: columnError } = await getActualColumns(tableName)
    const { count, error: countError } = await getTableCount(tableName)

    const tableExists = actualColumns !== null || !columnError?.includes('does not exist')

    if (tableExists) {
      report.summary.existingTables++
      console.log('✅ 狀態: 資料表存在')

      if (count !== null) {
        console.log(`📈 資料筆數: ${count}`)
      }
    } else {
      report.summary.missingTables++
      console.log('❌ 狀態: 資料表不存在')
      console.log(`   錯誤: ${columnError}`)
    }

    const tableReport = {
      exists: tableExists,
      expectedColumns: expectedColumns.length,
      actualColumns: actualColumns ? actualColumns.length : 0,
      count: count,
      missingColumns: [],
      extraColumns: [],
      error: columnError
    }

    // 比對欄位
    if (actualColumns && actualColumns.length > 0) {
      console.log(`\n📝 欄位比對:`)
      console.log(`   預期欄位數: ${expectedColumns.length}`)
      console.log(`   實際欄位數: ${actualColumns.length}`)

      // 找出缺少的欄位
      const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col))
      if (missingColumns.length > 0) {
        console.log(`\n   ⚠️  缺少的欄位 (${missingColumns.length}):`)
        missingColumns.forEach(col => {
          const colDef = tableSchema.columns[col]
          console.log(`      - ${col} (${colDef.type})`)
          console.log(`        說明: ${colDef.description}`)
        })
        tableReport.missingColumns = missingColumns
        report.summary.tablesWithIssues++
      }

      // 找出多餘的欄位
      const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col))
      if (extraColumns.length > 0) {
        console.log(`\n   ℹ️  額外的欄位 (${extraColumns.length}):`)
        extraColumns.forEach(col => {
          console.log(`      - ${col}`)
        })
        tableReport.extraColumns = extraColumns
      }

      // 列出匹配的欄位
      const matchingColumns = expectedColumns.filter(col => actualColumns.includes(col))
      if (matchingColumns.length > 0) {
        console.log(`\n   ✅ 匹配的欄位 (${matchingColumns.length}):`)
        const preview = matchingColumns.slice(0, 5).join(', ')
        console.log(`      ${preview}${matchingColumns.length > 5 ? ` ... 等 ${matchingColumns.length} 個` : ''}`)
      }
    } else if (tableExists) {
      console.log(`\n   ⚠️  無法取得欄位列表（資料表可能為空）`)
    }

    report.tables[tableName] = tableReport
  }

  // 輸出總結報告
  console.log(`\n\n${'='.repeat(70)}`)
  console.log('📊 驗證總結報告')
  console.log(`${'='.repeat(70)}`)
  console.log(`檢查時間: ${new Date(report.timestamp).toLocaleString('zh-TW')}`)
  console.log(`總資料表數: ${report.summary.totalTables}`)
  console.log(`存在的資料表: ${report.summary.existingTables} ✅`)
  console.log(`缺少的資料表: ${report.summary.missingTables} ${report.summary.missingTables > 0 ? '❌' : ''}`)
  console.log(`有問題的資料表: ${report.summary.tablesWithIssues} ${report.summary.tablesWithIssues > 0 ? '⚠️' : ''}`)

  // 詳細問題列表
  if (report.summary.missingTables > 0 || report.summary.tablesWithIssues > 0) {
    console.log(`\n${'─'.repeat(70)}`)
    console.log('⚠️  發現的問題:')
    console.log(`${'─'.repeat(70)}`)

    for (const [tableName, tableReport] of Object.entries(report.tables)) {
      if (!tableReport.exists) {
        console.log(`\n❌ ${tableName}: 資料表不存在`)
        console.log(`   建議: 執行 migrations/001_complete_database_schema.sql`)
      } else if (tableReport.missingColumns.length > 0) {
        console.log(`\n⚠️  ${tableName}: 缺少 ${tableReport.missingColumns.length} 個欄位`)
        console.log(`   缺少的欄位: ${tableReport.missingColumns.join(', ')}`)
        console.log(`   建議: 執行 ALTER TABLE 指令新增這些欄位`)
      }
    }
  }

  // 建議的下一步
  console.log(`\n${'='.repeat(70)}`)
  console.log('💡 建議的下一步行動:')
  console.log(`${'='.repeat(70)}`)

  if (report.summary.missingTables > 0) {
    console.log('\n1. 執行完整的資料庫 Migration:')
    console.log('   前往 Supabase Dashboard → SQL Editor')
    console.log('   執行檔案: migrations/001_complete_database_schema.sql')
  } else if (report.summary.tablesWithIssues > 0) {
    console.log('\n1. 新增缺少的欄位:')
    console.log('   前往 Supabase Dashboard → SQL Editor')
    console.log('   執行以下 SQL:')

    for (const [tableName, tableReport] of Object.entries(report.tables)) {
      if (tableReport.missingColumns.length > 0) {
        console.log(`\n   -- 為 ${tableName} 表新增缺少的欄位:`)
        tableReport.missingColumns.forEach(colName => {
          const colDef = DATABASE_SCHEMA[tableName].columns[colName]
          const nullable = colDef.nullable !== false ? '' : ' NOT NULL'
          const defaultVal = colDef.default ? ` DEFAULT ${colDef.default}` : ''
          console.log(`   ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${colName} ${colDef.type}${nullable}${defaultVal};`)
        })
      }
    }
  } else {
    console.log('\n✅ 所有資料表結構都符合定義！')
    console.log('   資料庫架構驗證通過。')
  }

  console.log(`\n${'='.repeat(70)}\n`)

  return report
}

// 執行驗證
verifySchema()
  .then(async (report) => {
    // 儲存報告到檔案
    const fs = await import('fs')
    const reportPath = join(__dirname, '../scripts/schema-verification-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`📄 完整報告已儲存至: ${reportPath}\n`)

    // 根據結果設定 exit code
    if (report.summary.missingTables > 0 || report.summary.tablesWithIssues > 0) {
      process.exit(1)
    } else {
      process.exit(0)
    }
  })
  .catch(err => {
    console.error('\n❌ 驗證過程發生錯誤:', err)
    process.exit(1)
  })
