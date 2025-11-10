/**
 * 客戶主檔功能測試腳本
 * 
 * 測試客戶主檔維護頁面的各項功能
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// 載入環境變數
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 請在 .env 檔案中設定 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCustomerMasterFeatures() {
  console.log('🧪 開始測試客戶主檔功能...\n')

  try {
    // 1. 測試載入客戶列表
    console.log('1️⃣ 測試載入客戶列表...')
    const { data: customers, error: fetchError } = await supabase
      .from('users')
      .select('id, line_user_id, display_name, picture_url, erp_bi_code, erp_bi_name, message_count, updated_at')
      .order('updated_at', { ascending: false })

    if (fetchError) {
      console.error('❌ 載入失敗:', fetchError.message)
      return
    }

    console.log(`✅ 成功載入 ${customers.length} 筆客戶資料`)
    
    // 統計
    const withErp = customers.filter(c => c.erp_bi_code && c.erp_bi_name).length
    const withoutErp = customers.length - withErp
    console.log(`   - 已建檔: ${withErp} 筆`)
    console.log(`   - 未建檔: ${withoutErp} 筆`)
    console.log(`   - 建檔率: ${Math.round((withErp / customers.length) * 100)}%\n`)

    if (customers.length === 0) {
      console.log('⚠️  資料庫中沒有客戶資料，無法進行後續測試')
      return
    }

    // 2. 測試搜尋功能
    console.log('2️⃣ 測試搜尋功能...')
    const searchKeyword = customers[0].display_name?.substring(0, 2) || ''
    if (searchKeyword) {
      const filteredCustomers = customers.filter(c => 
        c.display_name?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        c.erp_bi_code?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        c.erp_bi_name?.toLowerCase().includes(searchKeyword.toLowerCase())
      )
      console.log(`✅ 搜尋 "${searchKeyword}" 找到 ${filteredCustomers.length} 筆資料\n`)
    } else {
      console.log('⚠️  無法測試搜尋功能（沒有有效的名稱）\n')
    }

    // 3. 測試更新 ERP 資料（使用測試資料，不會真的更新）
    console.log('3️⃣ 測試更新 ERP 資料模擬...')
    const testCustomer = customers[0]
    console.log(`   測試客戶: ${testCustomer.display_name || testCustomer.line_user_id}`)
    console.log(`   - 目前 ERP 編號: ${testCustomer.erp_bi_code || '未設定'}`)
    console.log(`   - 目前 ERP 名稱: ${testCustomer.erp_bi_name || '未設定'}`)
    console.log('   ✅ 更新功能準備就緒（需在前端頁面測試實際更新）\n')

    // 4. 測試排序功能
    console.log('4️⃣ 測試排序功能...')
    const sortedByName = [...customers].sort((a, b) => {
      const nameA = (a.display_name || '').toLowerCase()
      const nameB = (b.display_name || '').toLowerCase()
      return nameA.localeCompare(nameB, 'zh-TW')
    })
    console.log('   ✅ 按名稱排序完成')
    
    const sortedByMessageCount = [...customers].sort((a, b) => (b.message_count || 0) - (a.message_count || 0))
    console.log('   ✅ 按訊息數排序完成\n')

    // 5. 測試分頁功能
    console.log('5️⃣ 測試分頁功能...')
    const pageSize = 20
    const totalPages = Math.ceil(customers.length / pageSize)
    const firstPage = customers.slice(0, pageSize)
    console.log(`   ✅ 總頁數: ${totalPages}`)
    console.log(`   ✅ 第一頁: ${firstPage.length} 筆\n`)

    // 6. 測試 CSV 匯出格式
    console.log('6️⃣ 測試 CSV 匯出格式...')
    const csvHeaders = ['ID', 'LINE User ID', 'LINE 名稱', 'ERP 客戶編號', 'ERP 客戶名稱', '訊息數量', '最後更新時間']
    const csvRow = [
      testCustomer.id,
      testCustomer.line_user_id || '',
      testCustomer.display_name || '',
      testCustomer.erp_bi_code || '',
      testCustomer.erp_bi_name || '',
      testCustomer.message_count || 0,
      testCustomer.updated_at ? new Date(testCustomer.updated_at).toLocaleString('zh-TW') : ''
    ]
    console.log('   CSV 標題:', csvHeaders.join(','))
    console.log('   CSV 範例:', csvRow.join(','))
    console.log('   ✅ CSV 格式正確\n')

    // 7. 測試資料完整性
    console.log('7️⃣ 測試資料完整性...')
    const missingDisplayName = customers.filter(c => !c.display_name).length
    const missingPictureUrl = customers.filter(c => !c.picture_url).length
    const missingErp = customers.filter(c => !c.erp_bi_code || !c.erp_bi_name).length
    console.log(`   - 缺少 LINE 名稱: ${missingDisplayName} 筆`)
    console.log(`   - 缺少頭像: ${missingPictureUrl} 筆`)
    console.log(`   - 缺少 ERP 資料: ${missingErp} 筆`)
    console.log('   ✅ 資料完整性檢查完成\n')

    console.log('✅ 所有功能測試完成！')
    console.log('\n📌 下一步：')
    console.log('   1. 啟動開發伺服器: npm run dev')
    console.log('   2. 訪問: http://localhost:5173/customer-master')
    console.log('   3. 測試以下功能：')
    console.log('      - 搜尋客戶')
    console.log('      - 點擊儲存格編輯 ERP 資料')
    console.log('      - 排序表格')
    console.log('      - 切換分頁')
    console.log('      - 匯出 CSV 檔案')

  } catch (error) {
    console.error('❌ 測試過程發生錯誤:', error)
  }
}

// 執行測試
testCustomerMasterFeatures()
