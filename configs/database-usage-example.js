/**
 * configs/database.js 使用範例
 *
 * 本檔案展示如何使用 database.js 中定義的資料庫架構
 */

import {
  DATABASE_SCHEMA,
  STORAGE_BUCKETS,
  MESSAGE_TYPES,
  LIMIT_TYPES,
  TABLES,
  getTableColumns,
  getPrimaryKey,
  hasColumn,
  getColumnDefinition
} from './database.js'

// =====================================================
// 範例 1: 查詢資料表的所有欄位
// =====================================================

console.log('=== 範例 1: 取得 users 表的所有欄位 ===')
const userColumns = getTableColumns(TABLES.USERS)
console.log('users 表的欄位:', userColumns)
// 輸出: ['id', 'line_user_id', 'display_name', 'picture_url', ...]

// =====================================================
// 範例 2: 取得主鍵欄位
// =====================================================

console.log('\n=== 範例 2: 取得主鍵 ===')
const userPK = getPrimaryKey(TABLES.USERS)
console.log('users 表的主鍵:', userPK) // 輸出: 'id'

// =====================================================
// 範例 3: 驗證欄位是否存在
// =====================================================

console.log('\n=== 範例 3: 驗證欄位是否存在 ===')
console.log('users 表有 last_message_at 欄位嗎?', hasColumn(TABLES.USERS, 'last_message_at')) // true
console.log('users 表有 nonexistent_field 欄位嗎?', hasColumn(TABLES.USERS, 'nonexistent_field')) // false

// =====================================================
// 範例 4: 取得欄位的完整定義
// =====================================================

console.log('\n=== 範例 4: 取得欄位定義 ===')
const lastMessageAtDef = getColumnDefinition(TABLES.USERS, 'last_message_at')
console.log('last_message_at 欄位定義:', lastMessageAtDef)
/*
輸出:
{
  type: 'TIMESTAMP WITH TIME ZONE',
  nullable: true,
  description: '最後訊息時間'
}
*/

// =====================================================
// 範例 5: 使用常數避免硬編碼
// =====================================================

console.log('\n=== 範例 5: 使用常數 ===')

// ❌ 不好的做法 - 硬編碼字串
// const messageType = 'text'

// ✅ 好的做法 - 使用常數
const messageType = MESSAGE_TYPES.TEXT
console.log('訊息類型:', messageType) // 'text'

// =====================================================
// 範例 6: 動態建立 Supabase 查詢的選擇欄位
// =====================================================

console.log('\n=== 範例 6: 動態建立查詢 ===')

// 只選擇需要的欄位
const displayColumns = ['id', 'line_user_id', 'display_name', 'customer_name', 'last_message_at']

// 驗證欄位是否都存在
const invalidColumns = displayColumns.filter(col => !hasColumn(TABLES.USERS, col))
if (invalidColumns.length > 0) {
  console.error('以下欄位不存在於 users 表:', invalidColumns)
} else {
  const selectQuery = displayColumns.join(', ')
  console.log('Supabase select 查詢:', selectQuery)
  // 輸出: 'id, line_user_id, display_name, customer_name, last_message_at'
}

// =====================================================
// 範例 7: 驗證前端表單資料的欄位
// =====================================================

console.log('\n=== 範例 7: 驗證表單資料 ===')

// 模擬前端送來的更新資料
const updateData = {
  customer_name: '王小明',
  notes: '重要客戶',
  invalid_field: 'should not exist' // 這個欄位不存在
}

// 過濾掉不存在的欄位
const validatedData = Object.fromEntries(
  Object.entries(updateData).filter(([key]) => hasColumn(TABLES.USERS, key))
)

console.log('原始資料:', updateData)
console.log('驗證後的資料:', validatedData)
/*
輸出:
原始資料: { customer_name: '王小明', notes: '重要客戶', invalid_field: 'should not exist' }
驗證後的資料: { customer_name: '王小明', notes: '重要客戶' }
*/

// =====================================================
// 範例 8: 使用 Storage Bucket 定義
// =====================================================

console.log('\n=== 範例 8: Storage Bucket 使用 ===')

const lineFilesBucket = STORAGE_BUCKETS['line-message-files']
console.log('Bucket 名稱:', lineFilesBucket.name)
console.log('檔案大小限制:', lineFilesBucket.fileSizeLimit, 'bytes')
console.log('圖片資料夾路徑:', lineFilesBucket.folders.images)

// 建立檔案路徑
const fileName = 'image_20251106_123456.jpg'
const fullPath = `${lineFilesBucket.folders.images}${fileName}`
console.log('完整檔案路徑:', fullPath)
// 輸出: 'images/image_20251106_123456.jpg'

// =====================================================
// 範例 9: 取得資料表的關聯資訊
// =====================================================

console.log('\n=== 範例 9: 資料表關聯 ===')

const messagesTable = DATABASE_SCHEMA[TABLES.MESSAGES]
const userRelation = messagesTable.relations.user

console.log('messages 表與 users 表的關聯:')
console.log('- 關聯類型:', userRelation.type) // 'belongsTo'
console.log('- 外鍵表:', userRelation.foreignTable) // 'users'
console.log('- 外鍵欄位:', userRelation.foreignKey) // 'user_id'

// =====================================================
// 範例 10: 檢查訊息類型是否有效
// =====================================================

console.log('\n=== 範例 10: 驗證訊息類型 ===')

function isValidMessageType(type) {
  return Object.values(MESSAGE_TYPES).includes(type)
}

console.log('text 是有效的訊息類型嗎?', isValidMessageType('text')) // true
console.log('invalid 是有效的訊息類型嗎?', isValidMessageType('invalid')) // false

// =====================================================
// 範例 11: 產生 TypeScript 型別定義（概念）
// =====================================================

console.log('\n=== 範例 11: 產生型別定義（概念展示）===')

function generateTypeScriptInterface(tableName) {
  const table = DATABASE_SCHEMA[tableName]
  if (!table) return null

  let typescript = `interface ${tableName.charAt(0).toUpperCase() + tableName.slice(1)} {\n`

  for (const [columnName, columnDef] of Object.entries(table.columns)) {
    const tsType = mapSQLTypeToTS(columnDef.type)
    const optional = columnDef.nullable ? '?' : ''
    typescript += `  ${columnName}${optional}: ${tsType}\n`
  }

  typescript += '}'
  return typescript
}

function mapSQLTypeToTS(sqlType) {
  const mapping = {
    'UUID': 'string',
    'TEXT': 'string',
    'INTEGER': 'number',
    'BIGINT': 'number',
    'BOOLEAN': 'boolean',
    'TIMESTAMP WITH TIME ZONE': 'string',
    'JSONB': 'Record<string, any>',
    'TEXT[]': 'string[]',
    'SERIAL': 'number'
  }
  return mapping[sqlType] || 'any'
}

console.log(generateTypeScriptInterface(TABLES.USERS))
/*
輸出:
interface Users {
  id: string
  line_user_id: string
  display_name?: string
  picture_url?: string
  ...
}
*/

// =====================================================
// 範例 12: 實際應用 - Supabase 查詢建構器
// =====================================================

console.log('\n=== 範例 12: Supabase 查詢建構器 ===')

class QueryBuilder {
  constructor(tableName) {
    this.tableName = tableName
    this.selectFields = []
    this.whereConditions = []
  }

  select(...fields) {
    // 驗證所有欄位是否存在
    const invalidFields = fields.filter(field => !hasColumn(this.tableName, field))
    if (invalidFields.length > 0) {
      throw new Error(`欄位不存在於 ${this.tableName} 表: ${invalidFields.join(', ')}`)
    }
    this.selectFields = fields
    return this
  }

  where(field, operator, value) {
    if (!hasColumn(this.tableName, field)) {
      throw new Error(`欄位 ${field} 不存在於 ${this.tableName} 表`)
    }
    this.whereConditions.push({ field, operator, value })
    return this
  }

  build() {
    return {
      table: this.tableName,
      select: this.selectFields.join(', '),
      where: this.whereConditions
    }
  }
}

// 使用範例
try {
  const query = new QueryBuilder(TABLES.USERS)
    .select('id', 'display_name', 'customer_name', 'last_message_at')
    .where('is_active', '=', true)
    .build()

  console.log('建構的查詢:', JSON.stringify(query, null, 2))
} catch (error) {
  console.error('查詢建構錯誤:', error.message)
}

// =====================================================
// 總結
// =====================================================

console.log('\n=== 使用 database.js 的優點 ===')
console.log('✅ 避免硬編碼字串，減少拼寫錯誤')
console.log('✅ 集中管理資料庫架構，易於維護')
console.log('✅ 提供型別安全和驗證功能')
console.log('✅ 作為文件參考，新開發者快速了解架構')
console.log('✅ 可用於產生 TypeScript 型別定義')
console.log('✅ 可用於資料驗證和查詢建構')
