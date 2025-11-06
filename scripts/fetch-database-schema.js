/**
 * 從 Supabase 查詢實際的資料表結構
 * 
 * 此腳本會：
 * 1. 連接到 Supabase
 * 2. 查詢 PostgreSQL information_schema 獲取所有表結構
 * 3. 輸出完整的欄位定義、型別、約束等資訊
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// 載入環境變數
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 錯誤: 缺少 Supabase 環境變數')
  console.error('請確認 .env 檔案中有設定:')
  console.error('  VITE_SUPABASE_URL')
  console.error('  VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * 查詢資料表的欄位資訊
 */
async function fetchTableSchema(tableName) {
  console.log(`\n📊 查詢表: ${tableName}`)
  console.log('='.repeat(80))

  // 使用 Supabase RPC 或直接查詢來獲取結構
  // 方法 1: 使用 select() 並分析返回結果
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1)

  if (error) {
    console.error(`❌ 查詢 ${tableName} 失敗:`, error.message)
    return null
  }

  // 如果表是空的，data 會是空陣列，我們需要用另一種方法
  if (data.length === 0) {
    console.log(`⚠️  ${tableName} 表目前沒有資料，嘗試取得表結構...`)
  }

  // 方法 2: 查詢 information_schema (需要適當權限)
  const schemaQuery = `
    SELECT 
      column_name,
      data_type,
      character_maximum_length,
      is_nullable,
      column_default,
      udt_name
    FROM 
      information_schema.columns
    WHERE 
      table_schema = 'public' 
      AND table_name = '${tableName}'
    ORDER BY 
      ordinal_position;
  `

  try {
    const { data: schemaData, error: schemaError } = await supabase.rpc('exec_sql', {
      query: schemaQuery
    })

    if (schemaError) {
      console.log('⚠️  無法直接查詢 information_schema，使用資料採樣方法')
      
      // 如果有資料，從資料中推斷結構
      if (data.length > 0) {
        const columns = Object.keys(data[0])
        console.log(`\n✅ 找到 ${columns.length} 個欄位:`)
        columns.forEach(col => {
          const value = data[0][col]
          const type = typeof value
          console.log(`  - ${col}: ${type} (從資料推斷)`)
        })
      }
    } else {
      console.log(`\n✅ 找到 ${schemaData.length} 個欄位:`)
      schemaData.forEach(col => {
        console.log(`  - ${col.column_name}:`)
        console.log(`      型別: ${col.data_type} (${col.udt_name})`)
        console.log(`      可空: ${col.is_nullable}`)
        console.log(`      預設: ${col.column_default || 'NULL'}`)
        if (col.character_maximum_length) {
          console.log(`      長度: ${col.character_maximum_length}`)
        }
      })
    }
  } catch (err) {
    console.log('⚠️  無法使用 RPC 查詢，改用資料採樣')
    
    if (data.length > 0) {
      const sample = data[0]
      const columns = Object.keys(sample)
      
      console.log(`\n✅ 找到 ${columns.length} 個欄位 (從資料採樣):`)
      columns.forEach(col => {
        const value = sample[col]
        let inferredType = 'unknown'
        
        if (value === null) {
          inferredType = 'nullable (值為 null)'
        } else if (typeof value === 'string') {
          if (value.match(/^\d{4}-\d{2}-\d{2}T/)) {
            inferredType = 'TIMESTAMP WITH TIME ZONE'
          } else if (value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            inferredType = 'UUID'
          } else {
            inferredType = 'TEXT'
          }
        } else if (typeof value === 'number') {
          inferredType = Number.isInteger(value) ? 'INTEGER' : 'NUMERIC'
        } else if (typeof value === 'boolean') {
          inferredType = 'BOOLEAN'
        } else if (Array.isArray(value)) {
          inferredType = 'ARRAY'
        } else if (typeof value === 'object') {
          inferredType = 'JSONB'
        }
        
        console.log(`  - ${col}: ${inferredType} (推斷值: ${JSON.stringify(value)?.substring(0, 50)})`)
      })
    }
  }

  return data
}

/**
 * 主程式
 */
async function main() {
  console.log('🔍 開始查詢 Supabase 資料庫結構...\n')
  
  const tables = ['users', 'messages', 'message_limits', 'system_stats']
  
  for (const table of tables) {
    await fetchTableSchema(table)
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ 資料庫結構查詢完成')
}

main().catch(err => {
  console.error('❌ 執行錯誤:', err)
  process.exit(1)
})
