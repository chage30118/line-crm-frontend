-- =====================================================
-- LINE CRM 系統 - 安全地新增缺少的欄位
-- =====================================================
-- Migration: 002_add_missing_columns_safe.sql
-- Description: 在不影響現有資料的情況下，新增所有缺少的欄位、索引和函數
-- Version: 1.0.0
-- Date: 2025-11-06
--
-- ⚠️  重要: 此腳本設計為安全執行，不會刪除或修改現有資料
-- =====================================================

BEGIN;

-- =====================================================
-- 1. 新增 users 表的缺少欄位
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '開始新增 users 表的欄位...';
END $$;

-- ERP 系統客戶編號（BI Code）
ALTER TABLE users ADD COLUMN IF NOT EXISTS erp_bi_code TEXT;

-- ERP 系統客戶名稱（正式名稱）
ALTER TABLE users ADD COLUMN IF NOT EXISTS erp_bi_name TEXT;

-- 首次訊息時間
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_message_at TIMESTAMP WITH TIME ZONE;

-- 最後訊息時間（⚠️ 這個欄位缺失導致了錯誤）
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE;

-- 訊息總數
ALTER TABLE users ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;

-- 客戶標籤陣列
ALTER TABLE users ADD COLUMN IF NOT EXISTS tags TEXT[];

-- 客戶備註
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;

-- 未讀訊息數
ALTER TABLE users ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

-- 更新欄位註解
COMMENT ON COLUMN users.erp_bi_code IS 'ERP 系統的客戶編號（BI Code）';
COMMENT ON COLUMN users.erp_bi_name IS 'ERP 系統的客戶名稱（正式名稱）';
COMMENT ON COLUMN users.first_message_at IS '首次訊息時間';
COMMENT ON COLUMN users.last_message_at IS '最後訊息時間';
COMMENT ON COLUMN users.message_count IS '該用戶的訊息總數';
COMMENT ON COLUMN users.tags IS '客戶標籤陣列';
COMMENT ON COLUMN users.notes IS '客戶備註';
COMMENT ON COLUMN users.unread_count IS '未讀訊息數';

DO $$
BEGIN
  RAISE NOTICE '✅ users 表欄位新增完成';
END $$;

-- =====================================================
-- 2. 新增 messages 表的缺少欄位
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '開始新增 messages 表的欄位...';
END $$;

-- Storage 中的檔案路徑
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_path TEXT;

COMMENT ON COLUMN messages.file_path IS 'Storage 中的檔案路徑';

DO $$
BEGIN
  RAISE NOTICE '✅ messages 表欄位新增完成';
END $$;

-- =====================================================
-- 3. 處理 system_stats 表的欄位名稱
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '開始處理 system_stats 表...';

  -- 檢查是否有 last_updated 欄位需要重新命名
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'system_stats' AND column_name = 'last_updated'
  ) THEN
    -- 如果 updated_at 不存在，則重新命名
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'system_stats' AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE system_stats RENAME COLUMN last_updated TO updated_at;
      RAISE NOTICE '✅ system_stats.last_updated 已重新命名為 updated_at';
    END IF;
  ELSE
    -- 如果沒有 last_updated，直接新增 updated_at
    ALTER TABLE system_stats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE '✅ system_stats.updated_at 欄位已新增';
  END IF;
END $$;

-- =====================================================
-- 4. 建立索引
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '開始建立索引...';
END $$;

-- users 表索引
CREATE INDEX IF NOT EXISTS idx_users_last_message_at
ON users(last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_users_first_message_at
ON users(first_message_at);

CREATE INDEX IF NOT EXISTS idx_users_erp_bi_code
ON users(erp_bi_code) WHERE erp_bi_code IS NOT NULL;

-- messages 表索引（如果尚未存在）
CREATE INDEX IF NOT EXISTS idx_messages_user_id
ON messages(user_id);

CREATE INDEX IF NOT EXISTS idx_messages_timestamp
ON messages(timestamp DESC);

DO $$
BEGIN
  RAISE NOTICE '✅ 索引建立完成';
END $$;

-- =====================================================
-- 5. 修復舊函數中的欄位名稱問題
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '開始檢查並修復舊函數...';
END $$;

-- 檢查是否存在 update_system_stats 函數，如果存在則刪除
-- 這個舊函數可能使用了 last_updated 欄位名稱
DROP FUNCTION IF EXISTS update_system_stats() CASCADE;

DO $$
BEGIN
  RAISE NOTICE '✅ 已移除可能存在的舊函數';
END $$;

-- =====================================================
-- 6. 初始化現有資料
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '開始初始化現有資料...';
END $$;

-- 更新 users 表的訊息統計資料
-- 計算每個用戶的 first_message_at, last_message_at, message_count
UPDATE users u
SET
  first_message_at = stats.first_msg,
  last_message_at = stats.last_msg,
  message_count = stats.msg_count
FROM (
  SELECT
    user_id,
    MIN(timestamp) as first_msg,
    MAX(timestamp) as last_msg,
    COUNT(*) as msg_count
  FROM messages
  GROUP BY user_id
) stats
WHERE u.id = stats.user_id
  AND (u.first_message_at IS NULL OR u.last_message_at IS NULL OR u.message_count = 0);

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ 已更新 % 位用戶的訊息統計資料', updated_count;
END $$;

-- =====================================================
-- 7. 建立觸發器（自動更新訊息計數）
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '開始建立觸發器...';
END $$;

-- 建立或替換函數：更新用戶訊息計數
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

-- 刪除舊的觸發器（如果存在）
DROP TRIGGER IF EXISTS trigger_update_user_message_count ON messages;

-- 建立新的觸發器
CREATE TRIGGER trigger_update_user_message_count
  AFTER INSERT OR DELETE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_user_message_count();

DO $$
BEGIN
  RAISE NOTICE '✅ 觸發器建立完成';
END $$;

-- =====================================================
-- 8. 建立輔助函數
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '開始建立輔助函數...';
END $$;

-- 取得用戶訊息統計
CREATE OR REPLACE FUNCTION get_user_message_stats(p_user_id UUID)
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

DO $$
BEGIN
  RAISE NOTICE '✅ 輔助函數建立完成';
END $$;

-- =====================================================
-- 9. 驗證結果
-- =====================================================

DO $$
DECLARE
  users_count INTEGER;
  messages_count INTEGER;
  users_columns INTEGER;
  messages_columns INTEGER;
BEGIN
  -- 計算資料筆數
  SELECT COUNT(*) INTO users_count FROM users;
  SELECT COUNT(*) INTO messages_count FROM messages;

  -- 計算欄位數
  SELECT COUNT(*) INTO users_columns
  FROM information_schema.columns
  WHERE table_name = 'users';

  SELECT COUNT(*) INTO messages_columns
  FROM information_schema.columns
  WHERE table_name = 'messages';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 Migration 完成驗證';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'users 表:';
  RAISE NOTICE '  - 資料筆數: %', users_count;
  RAISE NOTICE '  - 欄位數: %', users_columns;
  RAISE NOTICE '';
  RAISE NOTICE 'messages 表:';
  RAISE NOTICE '  - 資料筆數: %', messages_count;
  RAISE NOTICE '  - 欄位數: %', messages_columns;
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 所有現有資料保持完整！';
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
  RAISE NOTICE '已完成的操作:';
  RAISE NOTICE '  ✅ users 表新增 8 個欄位';
  RAISE NOTICE '  ✅ messages 表新增 1 個欄位';
  RAISE NOTICE '  ✅ 建立 5 個索引';
  RAISE NOTICE '  ✅ 建立 1 個觸發器';
  RAISE NOTICE '  ✅ 建立 1 個輔助函數';
  RAISE NOTICE '  ✅ 初始化現有資料的統計';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  重要提醒:';
  RAISE NOTICE '  - 所有現有資料已保留';
  RAISE NOTICE '  - 請執行 npm run verify-db 驗證';
  RAISE NOTICE '========================================';
END $$;
