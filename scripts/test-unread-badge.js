/**
 * 測試未讀計數功能
 * 
 * 手動設定未讀計數，驗證前端是否正確顯示徽章
 */

import dotenv from 'dotenv'
dotenv.config()

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
)

async function testUnreadBadge() {
  console.log('=== 測試未讀徽章顯示 ===\n')
  
  // 1. 獲取最近的3個用戶
  const { data: users, error } = await supabase
    .from('users')
    .select('id, display_name, unread_count')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(3)
  
  if (error) {
    console.error('❌ 錯誤:', error.message)
    return
  }
  
  if (users.length === 0) {
    console.log('❌ 沒有找到用戶')
    return
  }
  
  console.log(`找到 ${users.length} 個用戶\n`)
  
  // 2. 為每個用戶設定測試未讀計數
  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    const testUnreadCount = i + 1 // 1, 2, 3
    
    console.log(`設定測試未讀計數: ${user.display_name} → ${testUnreadCount}`)
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ unread_count: testUnreadCount })
      .eq('id', user.id)
    
    if (updateError) {
      console.error(`   ❌ 失敗:`, updateError.message)
    } else {
      console.log(`   ✅ 成功`)
    }
  }
  
  console.log('\n✅ 測試未讀計數已設定！')
  console.log('\n📋 驗證步驟：')
  console.log('   1. 打開前端 http://localhost:5173')
  console.log('   2. 檢查客戶列表是否顯示紅色徽章')
  console.log('   3. 點擊客戶後，徽章應該會消失\n')
  console.log('💡 提示：完成測試後，可以再次執行此腳本並設定為 0 來清除')
}

// 如果有命令列參數 --clear，則清除所有未讀計數
const shouldClear = process.argv.includes('--clear')

if (shouldClear) {
  console.log('=== 清除所有未讀計數 ===\n')
  supabase
    .from('users')
    .update({ unread_count: 0 })
    .neq('id', 0)
    .then(({ error }) => {
      if (error) {
        console.error('❌ 錯誤:', error.message)
      } else {
        console.log('✅ 已清除所有未讀計數')
      }
    })
} else {
  testUnreadBadge().catch(console.error)
}
