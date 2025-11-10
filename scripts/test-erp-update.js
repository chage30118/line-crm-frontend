/**
 * 測試 ERP 欄位更新
 * 
 * 手動更新一個用戶的 ERP 欄位，驗證是否可以正常寫入
 */

import dotenv from 'dotenv'
dotenv.config()

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
)

async function testErpUpdate() {
  console.log('=== 測試 ERP 欄位更新 ===\n')
  
  // 1. 獲取第一個用戶
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('id, display_name, erp_bi_code, erp_bi_name')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .single()
  
  if (fetchError) {
    console.error('❌ 讀取用戶失敗:', fetchError.message)
    return
  }
  
  console.log('找到用戶:', user.display_name)
  console.log('目前 ERP 編號:', user.erp_bi_code || '(空)')
  console.log('目前 ERP 名稱:', user.erp_bi_name || '(空)')
  console.log()
  
  // 2. 測試更新
  const testCode = '12'
  const testName = '測試客戶名稱'
  
  console.log(`嘗試更新為:`)
  console.log(`  ERP 編號: ${testCode}`)
  console.log(`  ERP 名稱: ${testName}\n`)
  
  const { data: updated, error: updateError } = await supabase
    .from('users')
    .update({
      erp_bi_code: testCode,
      erp_bi_name: testName
    })
    .eq('id', user.id)
    .select()
    .single()
  
  if (updateError) {
    console.error('❌ 更新失敗:', updateError.message)
    console.error('   錯誤詳情:', updateError)
    return
  }
  
  console.log('✅ 更新成功！')
  console.log('   新 ERP 編號:', updated.erp_bi_code)
  console.log('   新 ERP 名稱:', updated.erp_bi_name)
  console.log()
  
  // 3. 驗證是否真的寫入
  const { data: verified, error: verifyError } = await supabase
    .from('users')
    .select('id, display_name, erp_bi_code, erp_bi_name')
    .eq('id', user.id)
    .single()
  
  if (verifyError) {
    console.error('❌ 驗證失敗:', verifyError.message)
    return
  }
  
  console.log('🔍 驗證結果:')
  console.log('   ERP 編號:', verified.erp_bi_code)
  console.log('   ERP 名稱:', verified.erp_bi_name)
  
  if (verified.erp_bi_code === testCode && verified.erp_bi_name === testName) {
    console.log('\n✅ 測試通過！資料已正確寫入 Supabase')
  } else {
    console.log('\n❌ 測試失敗！資料未正確寫入')
  }
}

testErpUpdate().catch(console.error)
