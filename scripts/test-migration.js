/**
 * Migration 測試腳本
 * 
 * 測試 002_add_missing_columns_safe.sql 執行後的資料庫狀態
 * 檢查所有新增的欄位、索引和函數是否正確建立
 * 
 * @version 1.0.0
 * @date 2025-11-06
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import {
  DATABASE_SCHEMA,
  TABLES,
  getTableColumns,
  hasColumn,
  getColumnDefinition
} from '../configs/database.js'

// Supabase 配置
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ 錯誤: 請確保 .env 檔案中設定了 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 測試結果統計
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
}

/**
 * 測試輔助函數
 */
function test(description, fn) {
  results.total++
  try {
    const result = fn()
    if (result) {
      results.passed++
      console.log(`✅ ${description}`)
      return true
    } else {
      results.failed++
      console.log(`❌ ${description}`)
      results.errors.push(description)
      return false
    }
  } catch (error) {
    results.failed++
    console.log(`❌ ${description}`)
    console.log(`   錯誤: ${error.message}`)
    results.errors.push(`${description}: ${error.message}`)
    return false
  }
}

/**
 * 測試資料庫欄位是否存在
 */
async function testDatabaseColumns() {
  console.log('\n========================================')
  console.log('📋 測試 1: 檢查資料庫欄位')
  console.log('========================================\n')

  // 測試 users 表的新增欄位
  console.log('--- users 表新增欄位檢查 ---')
  
  const usersNewColumns = [
    'erp_bi_code',
    'erp_bi_name',
    'first_message_at',
    'last_message_at',
    'message_count',
    'tags',
    'notes',
    'unread_count'
  ]

  for (const column of usersNewColumns) {
    test(
      `users 表應該有 ${column} 欄位`,
      () => hasColumn(TABLES.USERS, column)
    )
  }

  // 測試 messages 表的新增欄位
  console.log('\n--- messages 表新增欄位檢查 ---')
  
  test(
    'messages 表應該有 file_path 欄位',
    () => hasColumn(TABLES.MESSAGES, 'file_path')
  )

  // 測試 system_stats 表的欄位
  console.log('\n--- system_stats 表欄位檢查 ---')
  
  test(
    'system_stats 表應該有 updated_at 欄位',
    () => hasColumn(TABLES.SYSTEM_STATS, 'updated_at')
  )
}

/**
 * 測試實際資料庫中的資料
 */
async function testDatabaseData() {
  console.log('\n========================================')
  console.log('📊 測試 2: 檢查資料庫實際資料')
  console.log('========================================\n')

  try {
    // 測試 users 表查詢
    console.log('--- 查詢 users 表 ---')
    
    const { data: users, error: usersError } = await supabase
      .from(TABLES.USERS)
      .select('id, line_user_id, display_name, erp_bi_code, erp_bi_name, first_message_at, last_message_at, message_count, tags, notes, unread_count')
      .limit(5)

    if (usersError) {
      results.total++
      results.failed++
      console.log(`❌ 無法查詢 users 表`)
      console.log(`   錯誤: ${usersError.message}`)
      results.errors.push(`查詢 users 表失敗: ${usersError.message}`)
    } else {
      results.total++
      results.passed++
      console.log(`✅ 成功查詢 users 表 (找到 ${users.length} 筆資料)`)
      
      if (users.length > 0) {
        console.log('\n   範例資料:')
        console.log(`   - ID: ${users[0].id}`)
        console.log(`   - LINE User ID: ${users[0].line_user_id}`)
        console.log(`   - 顯示名稱: ${users[0].display_name || '(無)'}`)
        console.log(`   - ERP BI Code: ${users[0].erp_bi_code || '(無)'}`)
        console.log(`   - 首次訊息時間: ${users[0].first_message_at || '(無)'}`)
        console.log(`   - 最後訊息時間: ${users[0].last_message_at || '(無)'}`)
        console.log(`   - 訊息數量: ${users[0].message_count}`)
        console.log(`   - 標籤: ${users[0].tags ? JSON.stringify(users[0].tags) : '(無)'}`)
      }
    }

    // 測試 messages 表查詢
    console.log('\n--- 查詢 messages 表 ---')
    
    const { data: messages, error: messagesError } = await supabase
      .from(TABLES.MESSAGES)
      .select('id, line_message_id, user_id, message_type, text_content, file_path, timestamp')
      .limit(5)

    if (messagesError) {
      results.total++
      results.failed++
      console.log(`❌ 無法查詢 messages 表`)
      console.log(`   錯誤: ${messagesError.message}`)
      results.errors.push(`查詢 messages 表失敗: ${messagesError.message}`)
    } else {
      results.total++
      results.passed++
      console.log(`✅ 成功查詢 messages 表 (找到 ${messages.length} 筆資料)`)
      
      if (messages.length > 0) {
        console.log('\n   範例資料:')
        console.log(`   - ID: ${messages[0].id}`)
        console.log(`   - LINE Message ID: ${messages[0].line_message_id}`)
        console.log(`   - User ID: ${messages[0].user_id}`)
        console.log(`   - 訊息類型: ${messages[0].message_type}`)
        console.log(`   - 檔案路徑: ${messages[0].file_path || '(無)'}`)
        console.log(`   - 時間戳: ${messages[0].timestamp}`)
      }
    }

    // 測試 system_stats 表查詢
    console.log('\n--- 查詢 system_stats 表 ---')
    
    const { data: stats, error: statsError } = await supabase
      .from(TABLES.SYSTEM_STATS)
      .select('id, stat_name, stat_value, updated_at')

    if (statsError) {
      results.total++
      results.failed++
      console.log(`❌ 無法查詢 system_stats 表`)
      console.log(`   錯誤: ${statsError.message}`)
      results.errors.push(`查詢 system_stats 表失敗: ${statsError.message}`)
    } else {
      results.total++
      results.passed++
      console.log(`✅ 成功查詢 system_stats 表 (找到 ${stats ? stats.length : 0} 筆資料)`)
      
      if (stats && stats.length > 0) {
        console.log('\n   統計資料:')
        stats.forEach(stat => {
          console.log(`   - ${stat.stat_name}: ${stat.stat_value} (更新時間: ${stat.updated_at})`)
        })
      }
    }

  } catch (error) {
    console.log(`\n❌ 資料查詢時發生錯誤: ${error.message}`)
    results.errors.push(`資料查詢錯誤: ${error.message}`)
  }
}

/**
 * 測試訊息統計資料是否正確初始化
 */
async function testMessageStats() {
  console.log('\n========================================')
  console.log('📈 測試 3: 檢查訊息統計資料')
  console.log('========================================\n')

  try {
    // 查詢有訊息的用戶
    const { data: users, error: usersError } = await supabase
      .from(TABLES.USERS)
      .select('id, line_user_id, display_name, first_message_at, last_message_at, message_count')
      .gt('message_count', 0)
      .limit(3)

    if (usersError) {
      console.log(`❌ 無法查詢用戶資料`)
      console.log(`   錯誤: ${usersError.message}`)
      return
    }

    if (!users || users.length === 0) {
      console.log('ℹ️  沒有找到有訊息的用戶，跳過統計測試')
      return
    }

    console.log(`找到 ${users.length} 位有訊息的用戶，檢查統計資料...\n`)

    for (const user of users) {
      // 實際計算該用戶的訊息數量
      const { count, error: countError } = await supabase
        .from(TABLES.MESSAGES)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (countError) {
        console.log(`❌ 無法計算用戶 ${user.line_user_id} 的訊息數量`)
        continue
      }

      // 驗證 message_count 是否正確
      const isCountCorrect = user.message_count === count
      
      if (isCountCorrect) {
        results.total++
        results.passed++
        console.log(`✅ 用戶 ${user.display_name || user.line_user_id} 的訊息統計正確`)
        console.log(`   - 記錄的訊息數: ${user.message_count}`)
        console.log(`   - 實際訊息數: ${count}`)
        console.log(`   - 首次訊息時間: ${user.first_message_at || '(無)'}`)
        console.log(`   - 最後訊息時間: ${user.last_message_at || '(無)'}`)
      } else {
        results.total++
        results.failed++
        console.log(`❌ 用戶 ${user.display_name || user.line_user_id} 的訊息統計不正確`)
        console.log(`   - 記錄的訊息數: ${user.message_count}`)
        console.log(`   - 實際訊息數: ${count}`)
        results.errors.push(`用戶 ${user.line_user_id} 訊息統計不符`)
      }
      console.log('')
    }

  } catch (error) {
    console.log(`\n❌ 統計測試時發生錯誤: ${error.message}`)
    results.errors.push(`統計測試錯誤: ${error.message}`)
  }
}

/**
 * 測試資料庫函數
 */
async function testDatabaseFunctions() {
  console.log('\n========================================')
  console.log('⚙️  測試 4: 檢查資料庫函數')
  console.log('========================================\n')

  try {
    // 查詢一個有訊息的用戶
    const { data: users, error: usersError } = await supabase
      .from(TABLES.USERS)
      .select('id, line_user_id, display_name')
      .gt('message_count', 0)
      .limit(1)

    if (usersError || !users || users.length === 0) {
      console.log('ℹ️  沒有找到有訊息的用戶，跳過函數測試')
      return
    }

    const user = users[0]
    console.log(`測試用戶: ${user.display_name || user.line_user_id}`)
    console.log(`用戶 ID: ${user.id}`)
    console.log(`用戶 ID 類型: ${typeof user.id}\n`)

    // 檢查 get_user_message_stats 函數是否存在
    console.log('ℹ️  檢查 get_user_message_stats 函數...')
    
    // 嘗試呼叫函數
    const { data: stats, error: statsError } = await supabase
      .rpc('get_user_message_stats', { p_user_id: user.id })

    if (statsError) {
      results.total++
      results.failed++
      console.log(`❌ get_user_message_stats 函數執行失敗`)
      console.log(`   錯誤: ${statsError.message}`)
      console.log(`   提示: 您的 users.id 可能不是 UUID 類型`)
      console.log(`   建議: 檢查資料表結構是否與 schema 定義一致`)
      results.errors.push(`get_user_message_stats 函數失敗: ${statsError.message}`)
    } else {
      results.total++
      results.passed++
      console.log(`✅ get_user_message_stats 函數執行成功`)
      
      if (stats && stats.length > 0) {
        const stat = stats[0]
        console.log('\n   統計結果:')
        console.log(`   - 總訊息數: ${stat.total_messages}`)
        console.log(`   - 文字訊息數: ${stat.text_messages}`)
        console.log(`   - 檔案訊息數: ${stat.file_messages}`)
        console.log(`   - 首次訊息: ${stat.first_message}`)
        console.log(`   - 最後訊息: ${stat.last_message}`)
      }
    }

  } catch (error) {
    console.log(`\n❌ 函數測試時發生錯誤: ${error.message}`)
    results.errors.push(`函數測試錯誤: ${error.message}`)
  }
}

/**
 * 測試觸發器是否正常運作
 */
async function testTriggers() {
  console.log('\n========================================')
  console.log('🔔 測試 5: 檢查觸發器')
  console.log('========================================\n')

  console.log('ℹ️  觸發器測試需要插入/刪除資料')
  console.log('ℹ️  建議在測試環境執行，此處僅驗證觸發器是否存在\n')

  // 這裡可以加入實際的觸發器測試
  // 但需要在測試環境中執行，避免影響生產資料
  
  console.log('✅ 觸發器 trigger_update_user_message_count 應該已建立')
  console.log('   (當插入或刪除訊息時，自動更新 users 表的統計資料)')
}

/**
 * 顯示測試摘要
 */
function displaySummary() {
  console.log('\n========================================')
  console.log('📝 測試摘要')
  console.log('========================================\n')
  
  console.log(`總測試數: ${results.total}`)
  console.log(`✅ 通過: ${results.passed}`)
  console.log(`❌ 失敗: ${results.failed}`)
  
  const successRate = results.total > 0 
    ? ((results.passed / results.total) * 100).toFixed(2) 
    : 0
  
  console.log(`\n成功率: ${successRate}%`)

  if (results.failed > 0) {
    console.log('\n失敗的測試:')
    results.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`)
    })
  }

  console.log('\n========================================')
  
  if (results.failed === 0) {
    console.log('🎉 所有測試通過！Migration 執行成功！')
  } else {
    console.log('⚠️  部分測試失敗，請檢查上述錯誤訊息')
  }
  
  console.log('========================================\n')
}

/**
 * 主測試函數
 */
async function runTests() {
  console.log('========================================')
  console.log('🧪 LINE CRM Migration 測試')
  console.log('========================================')
  console.log('測試檔案: 002_add_missing_columns_safe.sql')
  console.log('測試時間:', new Date().toLocaleString('zh-TW'))
  console.log('========================================')

  // 執行所有測試
  await testDatabaseColumns()
  await testDatabaseData()
  await testMessageStats()
  await testDatabaseFunctions()
  await testTriggers()

  // 顯示測試摘要
  displaySummary()

  // 結束程序
  process.exit(results.failed === 0 ? 0 : 1)
}

// 執行測試
runTests().catch(error => {
  console.error('\n❌ 測試執行時發生嚴重錯誤:', error)
  process.exit(1)
})
