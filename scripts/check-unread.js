/**
 * 檢查未讀計數功能
 * 
 * 執行此腳本檢查：
 * 1. users 表是否有 unread_count 欄位
 * 2. 目前有未讀訊息的用戶
 */

import dotenv from 'dotenv'
dotenv.config()

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
)

async function checkUnreadCount() {
  console.log('=== 檢查未讀計數功能 ===\n')
  
  // 1. 檢查欄位是否存在
  console.log('1️⃣ 檢查 unread_count 欄位...')
  const { data: users, error } = await supabase
    .from('users')
    .select('id, display_name, unread_count, last_message_at')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(10)
  
  if (error) {
    console.error('❌ 錯誤:', error.message)
    return
  }
  
  console.log('✅ 成功讀取 users 表\n')
  
  // 2. 顯示用戶未讀計數
  console.log('2️⃣ 目前用戶未讀計數：\n')
  console.table(users.map(u => ({
    ID: u.id,
    名稱: u.display_name || '未命名',
    未讀數: u.unread_count,
    最後訊息: u.last_message_at ? new Date(u.last_message_at).toLocaleString('zh-TW') : '無'
  })))
  
  // 3. 統計
  const totalUnread = users.reduce((sum, u) => sum + (u.unread_count || 0), 0)
  const usersWithUnread = users.filter(u => u.unread_count > 0).length
  
  console.log(`\n📊 統計：`)
  console.log(`   總未讀數: ${totalUnread}`)
  console.log(`   有未讀的用戶數: ${usersWithUnread}/${users.length}`)
  
  // 4. 建議
  if (totalUnread === 0) {
    console.log('\n💡 提示：')
    console.log('   目前沒有未讀訊息。')
    console.log('   請從 LINE 傳送測試訊息來驗證功能。')
  }
}

checkUnreadCount().catch(console.error)
