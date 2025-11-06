/**
 * 從 Supabase 查詢實際資料並分析型別
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

function analyzeValue(value, columnName) {
  if (value === null || value === undefined) {
    return { type: 'nullable', sample: null }
  }

  if (typeof value === 'boolean') {
    return { type: 'BOOLEAN', sample: value }
  }

  if (typeof value === 'number') {
    return {
      type: Number.isInteger(value) ? 'INTEGER' : 'NUMERIC',
      sample: value
    }
  }

  if (typeof value === 'string') {
    // 檢查是否為時間戳
    if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return { type: 'TIMESTAMP WITH TIME ZONE', sample: value }
    }
    // 檢查是否為 UUID
    if (value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return { type: 'UUID', sample: value }
    }
    return { type: 'TEXT', sample: value.substring(0, 50) }
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { type: 'ARRAY (empty)', sample: [] }
    }
    const firstItem = value[0]
    if (typeof firstItem === 'string') {
      return { type: 'TEXT[]', sample: value }
    }
    return { type: 'JSONB (array)', sample: value }
  }

  if (typeof value === 'object') {
    return { type: 'JSONB', sample: JSON.stringify(value).substring(0, 100) }
  }

  return { type: 'unknown', sample: String(value).substring(0, 50) }
}

async function analyzeTable(tableName) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`📊 分析表: ${tableName}`)
  console.log('='.repeat(80))

  const { data, error, count } = await supabase
    .from(tableName)
    .select('*', { count: 'exact' })
    .limit(5)

  if (error) {
    console.error(`❌ 錯誤:`, error.message)
    return
  }

  console.log(`📈 資料筆數: ${count}`)
  
  if (!data || data.length === 0) {
    console.log('⚠️  表中沒有資料')
    return
  }

  // 分析所有行的欄位
  const columnAnalysis = {}
  
  data.forEach((row, idx) => {
    Object.entries(row).forEach(([col, val]) => {
      if (!columnAnalysis[col]) {
        columnAnalysis[col] = {
          types: new Set(),
          samples: [],
          nullCount: 0,
          nonNullCount: 0
        }
      }

      const analysis = analyzeValue(val, col)
      columnAnalysis[col].types.add(analysis.type)
      
      if (val === null || val === undefined) {
        columnAnalysis[col].nullCount++
      } else {
        columnAnalysis[col].nonNullCount++
        if (columnAnalysis[col].samples.length < 2) {
          columnAnalysis[col].samples.push(analysis.sample)
        }
      }
    })
  })

  // 輸出分析結果
  console.log(`\n✅ 欄位分析 (${Object.keys(columnAnalysis).length} 個欄位):\n`)
  
  Object.entries(columnAnalysis).forEach(([col, info]) => {
    const types = Array.from(info.types).join(' | ')
    const nullable = info.nullCount > 0 ? '✓' : '✗'
    
    console.log(`  ${col}:`)
    console.log(`    型別: ${types}`)
    console.log(`    可空: ${nullable} (null: ${info.nullCount}, non-null: ${info.nonNullCount})`)
    
    if (info.samples.length > 0) {
      console.log(`    範例: ${JSON.stringify(info.samples[0])}`)
    }
    console.log()
  })
}

async function main() {
  console.log('🔍 開始分析 Supabase 資料庫結構...\n')
  
  const tables = ['users', 'messages', 'message_limits', 'system_stats']
  
  for (const table of tables) {
    await analyzeTable(table)
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ 分析完成\n')
}

main().catch(err => {
  console.error('❌ 執行錯誤:', err)
  process.exit(1)
})
