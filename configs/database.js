/**
 * Supabase 資料庫架構定義
 *
 * 本檔案作為專案中資料庫結構的單一事實來源 (Single Source of Truth)
 * 定義所有資料表的欄位、型別、索引和關聯
 *
 * @version 1.0.0
 * @date 2025-11-06
 */

/**
 * 資料庫架構定義
 */
export const DATABASE_SCHEMA = {
  /**
   * 資料表: users (用戶資料表)
   *
   * 儲存 LINE 用戶的基本資料和客戶資訊
   */
  users: {
    tableName: 'users',
    description: '用戶資料表 - 儲存 LINE 用戶的基本資料和客戶資訊',

    columns: {
      id: {
        type: 'INTEGER',
        primaryKey: true,
        default: 'nextval(\'users_id_seq\'::regclass)',
        nullable: false,
        description: '用戶唯一識別碼 (主鍵)'
      },
      line_user_id: {
        type: 'TEXT',
        unique: true,
        nullable: false,
        description: 'LINE 平台用戶唯一識別碼'
      },
      display_name: {
        type: 'TEXT',
        nullable: true,
        description: '從 LINE Profile API 獲取的顯示名稱'
      },
      picture_url: {
        type: 'TEXT',
        nullable: true,
        description: '用戶頭像 URL'
      },
      status_message: {
        type: 'TEXT',
        nullable: true,
        description: 'LINE 狀態訊息'
      },
      language: {
        type: 'TEXT',
        nullable: true,
        description: '用戶語言設定'
      },
      group_display_name: {
        type: 'TEXT',
        nullable: true,
        description: '群組聊天的名稱（從 LINE Bot API getGroupSummary() 獲取）'
      },
      erp_bi_code: {
        type: 'TEXT',
        nullable: true,
        description: 'ERP 系統的客戶編號（BI Code）'
      },
      erp_bi_name: {
        type: 'TEXT',
        nullable: true,
        description: 'ERP 系統的客戶名稱（正式名稱）'
      },
      is_active: {
        type: 'BOOLEAN',
        default: true,
        nullable: false,
        description: '用戶是否啟用'
      },
      first_message_at: {
        type: 'TIMESTAMP WITH TIME ZONE',
        nullable: true,
        description: '首次訊息時間'
      },
      last_message_at: {
        type: 'TIMESTAMP WITH TIME ZONE',
        nullable: true,
        description: '最後訊息時間'
      },
      message_count: {
        type: 'INTEGER',
        default: 0,
        nullable: false,
        description: '該用戶的訊息總數'
      },
      tags: {
        type: 'TEXT[]',
        nullable: true,
        description: '客戶標籤陣列'
      },
      notes: {
        type: 'TEXT',
        nullable: true,
        description: '客戶備註'
      },
      unread_count: {
        type: 'INTEGER',
        default: 0,
        nullable: false,
        description: '未讀訊息數'
      },
      created_at: {
        type: 'TIMESTAMP WITH TIME ZONE',
        default: 'NOW()',
        nullable: false,
        description: '建立時間'
      },
      updated_at: {
        type: 'TIMESTAMP WITH TIME ZONE',
        default: 'NOW()',
        nullable: false,
        description: '更新時間'
      }
    },

    indexes: [
      { name: 'idx_users_line_user_id', columns: ['line_user_id'] },
      { name: 'idx_users_is_active', columns: ['is_active'] },
      { name: 'idx_users_last_message_at', columns: ['last_message_at'], order: 'DESC NULLS LAST' },
      { name: 'idx_users_created_at', columns: ['created_at'], order: 'DESC' }
    ],

    relations: {
      messages: {
        type: 'hasMany',
        foreignTable: 'messages',
        foreignKey: 'user_id',
        onDelete: 'CASCADE'
      }
    }
  },

  /**
   * 資料表: messages (訊息資料表)
   *
   * 儲存 LINE 訊息的完整資料，包含文字、檔案等
   */
  messages: {
    tableName: 'messages',
    description: '訊息資料表 - 儲存 LINE 訊息的完整資料',

    columns: {
      id: {
        type: 'INTEGER',
        primaryKey: true,
        default: 'nextval(\'messages_id_seq\'::regclass)',
        nullable: false,
        description: '訊息唯一識別碼 (主鍵)'
      },
      line_message_id: {
        type: 'TEXT',
        unique: true,
        nullable: false,
        description: 'LINE 平台訊息唯一識別碼'
      },
      user_id: {
        type: 'INTEGER',
        foreignKey: {
          table: 'users',
          column: 'id',
          onDelete: 'CASCADE'
        },
        nullable: false,
        description: '關聯到 users 表的外鍵'
      },
      message_type: {
        type: 'TEXT',
        nullable: false,
        enum: ['text', 'image', 'file', 'audio', 'video', 'sticker', 'location'],
        description: '訊息類型'
      },
      text_content: {
        type: 'TEXT',
        nullable: true,
        description: '文字訊息內容'
      },
      file_id: {
        type: 'TEXT',
        nullable: true,
        description: 'Supabase Storage 檔案 ID'
      },
      file_name: {
        type: 'TEXT',
        nullable: true,
        description: '原始檔案名稱'
      },
      file_path: {
        type: 'TEXT',
        nullable: true,
        description: 'Storage 中的檔案路徑'
      },
      file_size: {
        type: 'BIGINT',
        nullable: true,
        description: '檔案大小（bytes）'
      },
      file_type: {
        type: 'TEXT',
        nullable: true,
        description: 'MIME 類型'
      },
      timestamp: {
        type: 'TIMESTAMP WITH TIME ZONE',
        nullable: false,
        description: '訊息時間戳（LINE 提供）'
      },
      processed: {
        type: 'BOOLEAN',
        default: false,
        nullable: false,
        description: '訊息是否已處理'
      },
      metadata: {
        type: 'JSONB',
        nullable: true,
        description: '額外的 JSON 資料'
      },
      created_at: {
        type: 'TIMESTAMP WITH TIME ZONE',
        default: 'NOW()',
        nullable: false,
        description: '建立時間'
      }
    },

    indexes: [
      { name: 'idx_messages_line_message_id', columns: ['line_message_id'] },
      { name: 'idx_messages_user_id', columns: ['user_id'] },
      { name: 'idx_messages_message_type', columns: ['message_type'] },
      { name: 'idx_messages_timestamp', columns: ['timestamp'], order: 'DESC' },
      { name: 'idx_messages_text_content_gin', columns: ['text_content'], type: 'GIN', using: "to_tsvector('simple', text_content)" }
    ],

    relations: {
      user: {
        type: 'belongsTo',
        foreignTable: 'users',
        foreignKey: 'user_id'
      }
    }
  },

  /**
   * 資料表: message_limits (系統限制表)
   *
   * 儲存系統的訊息和用戶數量限制
   */
  message_limits: {
    tableName: 'message_limits',
    description: '系統限制表 - 儲存系統的訊息和用戶數量限制',

    columns: {
      id: {
        type: 'SERIAL',
        primaryKey: true,
        nullable: false,
        description: '限制記錄 ID (主鍵)'
      },
      limit_type: {
        type: 'TEXT',
        unique: true,
        nullable: false,
        enum: ['max_messages', 'max_users'],
        description: '限制類型'
      },
      limit_value: {
        type: 'INTEGER',
        nullable: false,
        description: '限制數值'
      },
      current_count: {
        type: 'INTEGER',
        default: 0,
        nullable: false,
        description: '目前計數'
      },
      is_active: {
        type: 'BOOLEAN',
        default: true,
        nullable: false,
        description: '限制是否啟用'
      },
      created_at: {
        type: 'TIMESTAMP WITH TIME ZONE',
        default: 'NOW()',
        nullable: false,
        description: '建立時間'
      },
      updated_at: {
        type: 'TIMESTAMP WITH TIME ZONE',
        default: 'NOW()',
        nullable: false,
        description: '更新時間'
      }
    },

    indexes: [
      { name: 'idx_message_limits_limit_type', columns: ['limit_type'] }
    ],

    initialData: [
      { limit_type: 'max_messages', limit_value: 1000 },
      { limit_type: 'max_users', limit_value: 100 }
    ]
  },

  /**
   * 資料表: system_stats (系統統計表)
   *
   * 儲存系統統計資訊
   */
  system_stats: {
    tableName: 'system_stats',
    description: '系統統計表 - 儲存系統統計資訊',

    columns: {
      id: {
        type: 'SERIAL',
        primaryKey: true,
        nullable: false,
        description: '統計記錄 ID (主鍵)'
      },
      stat_name: {
        type: 'TEXT',
        unique: true,
        nullable: false,
        description: '統計項目名稱'
      },
      stat_value: {
        type: 'INTEGER',
        nullable: false,
        description: '統計數值'
      },
      updated_at: {
        type: 'TIMESTAMP WITH TIME ZONE',
        default: 'NOW()',
        nullable: false,
        description: '更新時間'
      }
    },

    indexes: [
      { name: 'idx_system_stats_stat_name', columns: ['stat_name'] }
    ]
  }
}

/**
 * Supabase Storage Buckets 定義
 */
export const STORAGE_BUCKETS = {
  'line-message-files': {
    name: 'line-message-files',
    description: 'LINE 訊息檔案儲存空間',
    public: false,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: null, // 允許所有類型

    folders: {
      images: 'images/',
      audio: 'audio/',
      video: 'video/',
      documents: {
        pdf: 'documents/pdf/',
        word: 'documents/word/',
        excel: 'documents/excel/'
      },
      files: 'files/'
    }
  }
}

/**
 * 訊息類型常數
 */
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  AUDIO: 'audio',
  VIDEO: 'video',
  STICKER: 'sticker',
  LOCATION: 'location'
}

/**
 * 系統限制類型常數
 */
export const LIMIT_TYPES = {
  MAX_MESSAGES: 'max_messages',
  MAX_USERS: 'max_users'
}

/**
 * 資料表名稱常數
 */
export const TABLES = {
  USERS: 'users',
  MESSAGES: 'messages',
  MESSAGE_LIMITS: 'message_limits',
  SYSTEM_STATS: 'system_stats'
}

/**
 * 取得資料表的所有欄位名稱
 * @param {string} tableName - 資料表名稱
 * @returns {string[]} 欄位名稱陣列
 */
export function getTableColumns(tableName) {
  const table = DATABASE_SCHEMA[tableName]
  if (!table) {
    throw new Error(`資料表 ${tableName} 不存在於 schema 定義中`)
  }
  return Object.keys(table.columns)
}

/**
 * 取得資料表的主鍵欄位
 * @param {string} tableName - 資料表名稱
 * @returns {string} 主鍵欄位名稱
 */
export function getPrimaryKey(tableName) {
  const table = DATABASE_SCHEMA[tableName]
  if (!table) {
    throw new Error(`資料表 ${tableName} 不存在於 schema 定義中`)
  }

  for (const [columnName, columnDef] of Object.entries(table.columns)) {
    if (columnDef.primaryKey) {
      return columnName
    }
  }

  throw new Error(`資料表 ${tableName} 沒有定義主鍵`)
}

/**
 * 驗證資料表欄位是否存在
 * @param {string} tableName - 資料表名稱
 * @param {string} columnName - 欄位名稱
 * @returns {boolean} 欄位是否存在
 */
export function hasColumn(tableName, columnName) {
  const table = DATABASE_SCHEMA[tableName]
  if (!table) {
    return false
  }
  return columnName in table.columns
}

/**
 * 取得欄位的完整定義
 * @param {string} tableName - 資料表名稱
 * @param {string} columnName - 欄位名稱
 * @returns {object} 欄位定義物件
 */
export function getColumnDefinition(tableName, columnName) {
  const table = DATABASE_SCHEMA[tableName]
  if (!table) {
    throw new Error(`資料表 ${tableName} 不存在於 schema 定義中`)
  }

  const column = table.columns[columnName]
  if (!column) {
    throw new Error(`資料表 ${tableName} 中不存在欄位 ${columnName}`)
  }

  return column
}

export default DATABASE_SCHEMA
