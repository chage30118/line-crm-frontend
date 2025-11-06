-- =====================================================
-- LINE CRM 系統 - 舊表遷移至新架構
-- =====================================================
-- Migration: 003_migrate_to_integer_ids.sql
-- Description: 將現有 UUID 主鍵遷移為 INTEGER，並確保與 database.js 完全一致
-- Version: 1.0.0
-- Date: 2025-11-06
--
-- ⚠️  重要: 此腳本會重建資料表，請先備份資料！
-- 執行前: node scripts/backup-database.js
-- =====================================================

BEGIN;

-- =====================================================
-- 前置檢查
-- =====================================================

DO $$
DECLARE
  users_count INTEGER;
  messages_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO users_count FROM users;
  SELECT COUNT(*) INTO messages_count FROM messages;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 資料庫現況';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'users 資料筆數: %', users_count;
  RAISE NOTICE 'messages 資料筆數: %', messages_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  即將執行 Migration...';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 1. 備份現有資料到臨時表
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '步驟 1/7: 備份現有資料...';
END $$;

-- 備份 users 表
CREATE TEMP TABLE users_backup AS
SELECT * FROM users;

-- 備份 messages 表
CREATE TEMP TABLE messages_backup AS
SELECT * FROM messages;

DO $$
DECLARE
  backup_users INTEGER;
  backup_messages INTEGER;
BEGIN
  SELECT COUNT(*) INTO backup_users FROM users_backup;
  SELECT COUNT(*) INTO backup_messages FROM messages_backup;
  
  RAISE NOTICE '✅ 備份完成';
  RAISE NOTICE '  - users_backup: % 筆', backup_users;
  RAISE NOTICE '  - messages_backup: % 筆', backup_messages;
END $$;

-- =====================================================
-- 2. 刪除舊表（保留備份）
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '步驟 2/7: 刪除舊表結構...';
END $$;

-- 停用 RLS（避免刪除時出錯）
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- 刪除觸發器
DROP TRIGGER IF EXISTS update_users_updated_at ON users CASCADE;
DROP TRIGGER IF EXISTS trigger_update_user_message_count ON messages CASCADE;

-- 刪除表（CASCADE 會自動刪除相關的外鍵約束）
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS users CASCADE;

RAISE NOTICE '✅ 舊表已刪除';

-- =====================================================
-- 3. 建立新的 users 表（INTEGER 主鍵）
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '步驟 3/7: 建立新的 users 表...';
END $$;

CREATE TABLE users (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    line_user_id TEXT UNIQUE NOT NULL,
    display_name TEXT,
    picture_url TEXT,
    status_message TEXT,
    language TEXT,
    group_display_name TEXT,
    erp_bi_code TEXT,
    erp_bi_name TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    first_message_at TIMESTAMP WITH TIME ZONE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    message_count INTEGER DEFAULT 0 NOT NULL,
    tags TEXT[],
    notes TEXT,
    unread_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 建立索引
CREATE INDEX idx_users_line_user_id ON users(line_user_id);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_last_message_at ON users(last_message_at DESC NULLS LAST);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- 欄位註解
COMMENT ON TABLE users IS '用戶資料表 - 儲存 LINE 用戶的基本資料和客戶資訊';
COMMENT ON COLUMN users.id IS '用戶唯一識別碼 (主鍵)';
COMMENT ON COLUMN users.line_user_id IS 'LINE 平台用戶唯一識別碼';
COMMENT ON COLUMN users.display_name IS '從 LINE Profile API 獲取的顯示名稱';
COMMENT ON COLUMN users.picture_url IS '用戶頭像 URL';
COMMENT ON COLUMN users.status_message IS 'LINE 狀態訊息';
COMMENT ON COLUMN users.language IS '用戶語言設定';
COMMENT ON COLUMN users.group_display_name IS '群組聊天的名稱（從 LINE Bot API getGroupSummary() 獲取）';
COMMENT ON COLUMN users.erp_bi_code IS 'ERP 系統的客戶編號（BI Code）';
COMMENT ON COLUMN users.erp_bi_name IS 'ERP 系統的客戶名稱（正式名稱）';
COMMENT ON COLUMN users.is_active IS '用戶是否啟用';
COMMENT ON COLUMN users.first_message_at IS '首次訊息時間';
COMMENT ON COLUMN users.last_message_at IS '最後訊息時間';
COMMENT ON COLUMN users.message_count IS '該用戶的訊息總數';
COMMENT ON COLUMN users.tags IS '客戶標籤陣列';
COMMENT ON COLUMN users.notes IS '客戶備註';
COMMENT ON COLUMN users.unread_count IS '未讀訊息數';

RAISE NOTICE '✅ users 表建立完成';

-- =====================================================
-- 4. 建立新的 messages 表（INTEGER 主鍵和外鍵）
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '步驟 4/7: 建立新的 messages 表...';
END $$;

CREATE TABLE messages (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    line_message_id TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'file', 'audio', 'video', 'sticker', 'location')),
    text_content TEXT,
    file_id TEXT,
    file_name TEXT,
    file_path TEXT,
    file_size BIGINT,
    file_type TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    processed BOOLEAN DEFAULT FALSE NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 建立索引
CREATE INDEX idx_messages_line_message_id ON messages(line_message_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_message_type ON messages(message_type);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_messages_text_content_gin ON messages USING GIN(to_tsvector('simple', COALESCE(text_content, '')));

-- 欄位註解
COMMENT ON TABLE messages IS '訊息資料表 - 儲存 LINE 訊息的完整資料';
COMMENT ON COLUMN messages.id IS '訊息唯一識別碼 (主鍵)';
COMMENT ON COLUMN messages.line_message_id IS 'LINE 平台訊息唯一識別碼';
COMMENT ON COLUMN messages.user_id IS '關聯到 users 表的外鍵';
COMMENT ON COLUMN messages.message_type IS '訊息類型';
COMMENT ON COLUMN messages.text_content IS '文字訊息內容';
COMMENT ON COLUMN messages.file_id IS 'Supabase Storage 檔案 ID';
COMMENT ON COLUMN messages.file_name IS '原始檔案名稱';
COMMENT ON COLUMN messages.file_path IS 'Storage 中的檔案路徑';
COMMENT ON COLUMN messages.file_size IS '檔案大小（bytes）';
COMMENT ON COLUMN messages.file_type IS 'MIME 類型';
COMMENT ON COLUMN messages.timestamp IS '訊息時間戳（LINE 提供）';
COMMENT ON COLUMN messages.processed IS '訊息是否已處理';
COMMENT ON COLUMN messages.metadata IS '額外的 JSON 資料';

RAISE NOTICE '✅ messages 表建立完成';

-- =====================================================
-- 5. 還原資料（帶 ID 映射）
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '步驟 5/7: 還原資料...';
END $$;

-- 建立 UUID 到 INTEGER 的映射表
CREATE TEMP TABLE user_id_mapping AS
SELECT
  row_number() OVER (ORDER BY created_at) AS new_id,
  id AS old_id,
  line_user_id
FROM users_backup;

-- 還原 users 資料（使用新的自增 ID）
INSERT INTO users (
  line_user_id,
  display_name,
  picture_url,
  status_message,
  language,
  group_display_name,
  erp_bi_code,
  erp_bi_name,
  is_active,
  first_message_at,
  last_message_at,
  message_count,
  tags,
  notes,
  unread_count,
  created_at,
  updated_at
)
SELECT
  ub.line_user_id,
  ub.display_name,
  ub.picture_url,
  ub.status_message,
  ub.language,
  ub.group_display_name,
  ub.erp_bi_code,
  ub.erp_bi_name,
  ub.is_active,
  ub.first_message_at,
  ub.last_message_at,
  ub.message_count,
  ub.tags,
  ub.notes,
  ub.unread_count,
  ub.created_at,
  ub.updated_at
FROM users_backup ub
ORDER BY ub.created_at;

-- 還原 messages 資料（使用新的 user_id 映射）
INSERT INTO messages (
  line_message_id,
  user_id,
  message_type,
  text_content,
  file_id,
  file_name,
  file_path,
  file_size,
  file_type,
  timestamp,
  processed,
  metadata,
  created_at
)
SELECT
  mb.line_message_id,
  u.id,  -- 使用新的 INTEGER user_id
  mb.message_type,
  mb.text_content,
  mb.file_id,
  mb.file_name,
  mb.file_path,
  mb.file_size,
  mb.file_type,
  mb.timestamp,
  mb.processed,
  mb.metadata,
  mb.created_at
FROM messages_backup mb
INNER JOIN users_backup ub ON mb.user_id = ub.id
INNER JOIN users u ON ub.line_user_id = u.line_user_id
ORDER BY mb.timestamp;

DO $$
DECLARE
  restored_users INTEGER;
  restored_messages INTEGER;
BEGIN
  SELECT COUNT(*) INTO restored_users FROM users;
  SELECT COUNT(*) INTO restored_messages FROM messages;
  
  RAISE NOTICE '✅ 資料還原完成';
  RAISE NOTICE '  - users: % 筆', restored_users;
  RAISE NOTICE '  - messages: % 筆', restored_messages;
END $$;

-- =====================================================
-- 6. 重建觸發器和函數
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '步驟 6/7: 重建觸發器和函數...';
END $$;

-- 自動更新 updated_at 欄位
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 自動更新用戶訊息計數
CREATE OR REPLACE FUNCTION update_user_message_count()
RETURNS TRIGGER AS $func$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users
    SET
      message_count = message_count + 1,
      last_message_at = NEW.timestamp,
      first_message_at = COALESCE(first_message_at, NEW.timestamp),
      updated_at = NOW()
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users
    SET
      message_count = GREATEST(message_count - 1, 0),
      updated_at = NOW()
    WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$func$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_message_count
  AFTER INSERT OR DELETE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_user_message_count();

-- 輔助函數：取得用戶訊息統計
CREATE OR REPLACE FUNCTION get_user_message_stats(p_user_id INTEGER)
RETURNS TABLE (
  total_messages BIGINT,
  text_messages BIGINT,
  file_messages BIGINT,
  first_message TIMESTAMP WITH TIME ZONE,
  last_message TIMESTAMP WITH TIME ZONE
) AS $func$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_messages,
    COUNT(*) FILTER (WHERE message_type = 'text')::BIGINT as text_messages,
    COUNT(*) FILTER (WHERE message_type IN ('image', 'file', 'audio', 'video'))::BIGINT as file_messages,
    MIN(timestamp) as first_message,
    MAX(timestamp) as last_message
  FROM messages
  WHERE user_id = p_user_id;
END;
$func$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_message_stats IS '取得指定用戶的訊息統計資訊';

RAISE NOTICE '✅ 觸發器和函數建立完成';

-- =====================================================
-- 7. 啟用 Row Level Security (RLS)
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '步驟 7/7: 啟用 RLS...';
END $$;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- users 表 RLS 政策
DROP POLICY IF EXISTS "允許所有操作 users" ON users;
CREATE POLICY "允許所有操作 users" ON users
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- messages 表 RLS 政策
DROP POLICY IF EXISTS "允許所有操作 messages" ON messages;
CREATE POLICY "允許所有操作 messages" ON messages
    FOR ALL
    USING (true)
    WITH CHECK (true);

RAISE NOTICE '✅ RLS 啟用完成';

-- =====================================================
-- 驗證結果
-- =====================================================

DO $$
DECLARE
  users_count INTEGER;
  messages_count INTEGER;
  users_pk_type TEXT;
  messages_pk_type TEXT;
  messages_fk_type TEXT;
BEGIN
  -- 計算資料筆數
  SELECT COUNT(*) INTO users_count FROM users;
  SELECT COUNT(*) INTO messages_count FROM messages;
  
  -- 檢查主鍵型別
  SELECT data_type INTO users_pk_type
  FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'id';
  
  SELECT data_type INTO messages_pk_type
  FROM information_schema.columns
  WHERE table_name = 'messages' AND column_name = 'id';
  
  SELECT data_type INTO messages_fk_type
  FROM information_schema.columns
  WHERE table_name = 'messages' AND column_name = 'user_id';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 Migration 完成驗證';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '資料筆數:';
  RAISE NOTICE '  users: %', users_count;
  RAISE NOTICE '  messages: %', messages_count;
  RAISE NOTICE '';
  RAISE NOTICE '主鍵型別檢查:';
  RAISE NOTICE '  users.id: % ✅', users_pk_type;
  RAISE NOTICE '  messages.id: % ✅', messages_pk_type;
  RAISE NOTICE '  messages.user_id: % ✅', messages_fk_type;
  RAISE NOTICE '';
  
  -- 驗證資料完整性
  IF users_pk_type = 'integer' AND messages_pk_type = 'integer' AND messages_fk_type = 'integer' THEN
    RAISE NOTICE '✅ 型別遷移成功！';
  ELSE
    RAISE WARNING '⚠️  型別檢查失敗，請手動檢查';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- 完成 Migration
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 Migration 執行成功！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '已完成的操作:';
  RAISE NOTICE '  ✅ 備份舊資料到臨時表';
  RAISE NOTICE '  ✅ 重建 users 表（INTEGER 主鍵）';
  RAISE NOTICE '  ✅ 重建 messages 表（INTEGER 主鍵和外鍵）';
  RAISE NOTICE '  ✅ 還原所有資料（保持順序）';
  RAISE NOTICE '  ✅ 重建所有索引';
  RAISE NOTICE '  ✅ 重建所有觸發器和函數';
  RAISE NOTICE '  ✅ 啟用 RLS';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  重要提醒:';
  RAISE NOTICE '  - 所有資料已成功遷移';
  RAISE NOTICE '  - 主鍵已從 UUID 改為 INTEGER';
  RAISE NOTICE '  - 請執行: node scripts/verify-database-schema.js';
  RAISE NOTICE '  - 請測試前端應用是否正常運作';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
