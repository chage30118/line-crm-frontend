/**
 * 檢查 Supabase Storage 設定
 * 
 * 此腳本會：
 * 1. 連接到 Supabase
 * 2. 列出所有 Storage Buckets
 * 3. 檢查每個 Bucket 的設定
 * 4. 列出檔案（如有）
 * 
 * 執行方式：node scripts/check-storage.js
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 載入環境變數
dotenv.config({ path: join(__dirname, '../.env') })

// 初始化 Supabase 客戶端（使用 SERVICE_KEY 以查看完整資訊）
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 錯誤: 缺少 Supabase 環境變數')
  console.error('需要: VITE_SUPABASE_URL 和 VITE_SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('=' .repeat(70))
console.log('🗂️  Supabase Storage 檢查工具')
console.log('=' .repeat(70))
console.log(`專案 URL: ${supabaseUrl}`)
console.log(`使用金鑰: ${supabaseKey.substring(0, 20)}...`)
console.log()

/**
 * 列出所有 Storage Buckets
 */
async function listBuckets() {
  console.log('📦 檢查 Storage Buckets...\n')

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
      console.error('❌ 無法列出 Buckets:', error.message)
      return []
    }

    if (!buckets || buckets.length === 0) {
      console.log('⚠️  目前沒有任何 Storage Bucket')
      console.log('\n建議建立以下 Bucket:')
      console.log('  - line-message-files (儲存 LINE 訊息檔案)')
      return []
    }

    console.log(`✅ 找到 ${buckets.length} 個 Storage Bucket(s):\n`)

    buckets.forEach((bucket, index) => {
      console.log(`${index + 1}. ${bucket.name}`)
      console.log(`   ID: ${bucket.id}`)
      console.log(`   公開: ${bucket.public ? '是 ✅' : '否 🔒'}`)
      console.log(`   檔案大小限制: ${bucket.file_size_limit ? `${(bucket.file_size_limit / 1024 / 1024).toFixed(2)} MB` : '無限制'}`)
      console.log(`   允許的 MIME 類型: ${bucket.allowed_mime_types ? bucket.allowed_mime_types.join(', ') : '所有類型'}`)
      console.log(`   建立時間: ${new Date(bucket.created_at).toLocaleString('zh-TW')}`)
      console.log(`   更新時間: ${new Date(bucket.updated_at).toLocaleString('zh-TW')}`)
      console.log()
    })

    return buckets
  } catch (error) {
    console.error('❌ 發生錯誤:', error.message)
    return []
  }
}

/**
 * 列出 Bucket 中的檔案
 */
async function listFilesInBucket(bucketName, path = '') {
  console.log(`\n📁 檢查 Bucket "${bucketName}" 的內容...`)

  try {
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list(path, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) {
      console.error(`   ❌ 無法列出檔案: ${error.message}`)
      return
    }

    if (!files || files.length === 0) {
      console.log('   ℹ️  此 Bucket 目前是空的')
      return
    }

    console.log(`   ✅ 找到 ${files.length} 個項目:\n`)

    files.forEach((file, index) => {
      const isFolder = !file.id // 資料夾沒有 id
      const icon = isFolder ? '📂' : '📄'
      const size = file.metadata?.size 
        ? `${(file.metadata.size / 1024).toFixed(2)} KB`
        : '-'
      
      console.log(`   ${index + 1}. ${icon} ${file.name}`)
      if (!isFolder) {
        console.log(`      大小: ${size}`)
        console.log(`      MIME: ${file.metadata?.mimetype || '未知'}`)
        console.log(`      建立: ${new Date(file.created_at).toLocaleString('zh-TW')}`)
        console.log(`      更新: ${new Date(file.updated_at).toLocaleString('zh-TW')}`)
      }
      console.log()
    })
  } catch (error) {
    console.error(`   ❌ 發生錯誤: ${error.message}`)
  }
}

/**
 * 測試檔案上傳（僅測試，不實際建立）
 */
async function testUploadPermission(bucketName) {
  console.log(`\n🧪 測試 Bucket "${bucketName}" 的上傳權限...`)

  try {
    // 建立測試檔案
    const testFileName = `test-${Date.now()}.txt`
    const testContent = 'This is a test file from check-storage.js'

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
        upsert: false
      })

    if (error) {
      console.error(`   ❌ 上傳測試失敗: ${error.message}`)
      
      if (error.message.includes('new row violates row-level security policy')) {
        console.log('\n   💡 建議: 需要設定 Storage 的 RLS 政策')
        console.log('   在 Supabase Dashboard → Storage → Policies 中設定')
      }
      return false
    }

    console.log(`   ✅ 上傳測試成功: ${data.path}`)

    // 刪除測試檔案
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([testFileName])

    if (deleteError) {
      console.log(`   ⚠️  無法刪除測試檔案: ${deleteError.message}`)
    } else {
      console.log(`   ✅ 測試檔案已清理`)
    }

    return true
  } catch (error) {
    console.error(`   ❌ 發生錯誤: ${error.message}`)
    return false
  }
}

/**
 * 主要執行流程
 */
async function main() {
  // 1. 列出所有 Buckets
  const buckets = await listBuckets()

  // 2. 檢查每個 Bucket 的內容
  for (const bucket of buckets) {
    await listFilesInBucket(bucket.name)
  }

  // 3. 測試上傳權限（如果有 Bucket）
  if (buckets.length > 0) {
    console.log('\n' + '─'.repeat(70))
    for (const bucket of buckets) {
      await testUploadPermission(bucket.name)
    }
  }

  // 4. 輸出建議
  console.log('\n' + '='.repeat(70))
  console.log('📋 建議操作')
  console.log('='.repeat(70))

  if (buckets.length === 0) {
    console.log('\n⚠️  目前沒有 Storage Bucket，建議建立:')
    console.log('\n1. 前往 Supabase Dashboard')
    console.log('2. 點擊左側 "Storage"')
    console.log('3. 點擊 "Create a new bucket"')
    console.log('4. 設定:')
    console.log('   - Name: line-message-files')
    console.log('   - Public: 否（保持私密）')
    console.log('   - File size limit: 52428800 (50MB)')
    console.log('5. 設定 RLS 政策（允許已認證用戶上傳/讀取）')
  } else {
    const hasLineMessageFiles = buckets.some(b => b.name === 'line-message-files')
    
    if (!hasLineMessageFiles) {
      console.log('\n⚠️  建議建立 "line-message-files" Bucket 用於儲存 LINE 訊息檔案')
    }

    console.log('\n✅ Storage Bucket 檢查完成')
    console.log('\n下一步:')
    console.log('  1. 確認 RLS 政策設定正確')
    console.log('  2. 測試檔案上傳功能')
    console.log('  3. 設定自動清理舊檔案（可選）')
  }

  console.log('\n' + '='.repeat(70))
}

// 執行檢查
main().catch(err => {
  console.error('\n❌ 執行過程發生錯誤:', err)
  process.exit(1)
})
