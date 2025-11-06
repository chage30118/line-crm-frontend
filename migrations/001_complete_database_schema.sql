-- =====================================================
-- LINE CRM 系統 - 完整資料庫架構
-- =====================================================
-- Migration: 001_complete_database_schema.sql
-- Description: 建立完整的資料庫結構，包含所有資料表、索引和初始資料
-- Version: 1.0.0
-- Date: 2025-11-06
-- =====================================================

-- =====================================================
-- 1. 建立 users 資料表
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_user_id TEXT UNIQUE NOT NULL,
    display_name TEXT,
    picture_url TEXT,
    status_message TEXT,
    language TEXT,
    group_display_name TEXT,        -- 群組顯示名稱（從 LINE Bot API）
    customer_name TEXT,              -- 客戶真實姓名（手動設定）
    suggested_name TEXT,             -- AI 建議姓名
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    first_message_at TIMESTAMP WITH TIME ZONE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    message_count INTEGER DEFAULT 0 NOT NULL,
    tags TEXT[],                     -- 標籤陣列
    notes TEXT,                      -- 備註
    unread_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- users 表索引
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_last_message_at ON users(last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

COMMENT ON TABLE users IS '用戶資料表 - 儲存 LINE 用戶的基本資料和客戶資訊';
COMMENT ON COLUMN users.id IS '用戶唯一識別碼 (主鍵)';
COMMENT ON COLUMN users.line_user_id IS 'LINE 平台用戶唯一識別碼';
COMMENT ON COLUMN users.display_name IS '從 LINE Profile API 獲取的顯示名稱';
COMMENT ON COLUMN users.picture_url IS '用戶頭像 URL';
COMMENT ON COLUMN users.status_message IS 'LINE 狀態訊息';
COMMENT ON COLUMN users.language IS '用戶語言設定';
COMMENT ON COLUMN users.group_display_name IS '群組聊天的名稱（從 LINE Bot API getGroupSummary() 獲取）';
COMMENT ON COLUMN users.customer_name IS '客戶真實姓名（客服手動設定）';
COMMENT ON COLUMN users.suggested_name IS '系統建議的姓名（從訊息分析）';
COMMENT ON COLUMN users.is_active IS '用戶是否啟用';
COMMENT ON COLUMN users.first_message_at IS '首次訊息時間';
COMMENT ON COLUMN users.last_message_at IS '最後訊息時間';
COMMENT ON COLUMN users.message_count IS '該用戶的訊息總數';
COMMENT ON COLUMN users.tags IS '客戶標籤陣列';
COMMENT ON COLUMN users.notes IS '客戶備註';
COMMENT ON COLUMN users.unread_count IS '未讀訊息數';

-- =====================================================
-- 2. 建立 messages 資料表
-- =====================================================

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_message_id TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'file', 'audio', 'video', 'sticker', 'location')),
    text_content TEXT,
    file_id TEXT,
    file_name TEXT,
    file_path TEXT,
    file_size BIGINT,
    file_type TEXT,                  -- MIME type
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    processed BOOLEAN DEFAULT FALSE NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- messages 表索引
CREATE INDEX IF NOT EXISTS idx_messages_line_message_id ON messages(line_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_text_content_gin ON messages USING GIN(to_tsvector('simple', COALESCE(text_content, '')));

COMMENT ON TABLE messages IS '訊息資料表 - 儲存 LINE 訊息的完整資料';
COMMENT ON COLUMN messages.id IS '訊息唯一識別碼 (主鍵)';
COMMENT ON COLUMN messages.line_message_id IS 'LINE 平台訊息唯一識別碼';
COMMENT ON COLUMN messages.user_id IS '關聯到 users 表的外鍵';
COMMENT ON COLUMN messages.message_type IS '訊息類型 (text/image/file/audio/video/sticker/location)';
COMMENT ON COLUMN messages.text_content IS '文字訊息內容';
COMMENT ON COLUMN messages.file_id IS 'Supabase Storage 檔案 ID';
COMMENT ON COLUMN messages.file_name IS '原始檔案名稱';
COMMENT ON COLUMN messages.file_path IS 'Storage 中的檔案路徑';
COMMENT ON COLUMN messages.file_size IS '檔案大小（bytes）';
COMMENT ON COLUMN messages.file_type IS 'MIME 類型';
COMMENT ON COLUMN messages.timestamp IS '訊息時間戳（LINE 提供）';
COMMENT ON COLUMN messages.processed IS '訊息是否已處理';
COMMENT ON COLUMN messages.metadata IS '額外的 JSON 資料';

-- =====================================================
-- 3. 建立 message_limits 資料表
-- =====================================================

CREATE TABLE IF NOT EXISTS message_limits (
    id SERIAL PRIMARY KEY,
    limit_type TEXT UNIQUE NOT NULL CHECK (limit_type IN ('max_messages', 'max_users')),
    limit_value INTEGER NOT NULL,
    current_count INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- message_limits 表索引
CREATE INDEX IF NOT EXISTS idx_message_limits_limit_type ON message_limits(limit_type);

COMMENT ON TABLE message_limits IS '系統限制表 - 儲存系統的訊息和用戶數量限制';
COMMENT ON COLUMN message_limits.limit_type IS '限制類型 (max_messages/max_users)';
COMMENT ON COLUMN message_limits.limit_value IS '限制數值';
COMMENT ON COLUMN message_limits.current_count IS '目前計數';
COMMENT ON COLUMN message_limits.is_active IS '限制是否啟用';

-- 插入初始資料
INSERT INTO message_limits (limit_type, limit_value, current_count, is_active)
VALUES
    ('max_messages', 1000, 0, TRUE),
    ('max_users', 100, 0, TRUE)
ON CONFLICT (limit_type) DO NOTHING;

-- =====================================================
-- 4. 建立 system_stats 資料表
-- =====================================================

CREATE TABLE IF NOT EXISTS system_stats (
    id SERIAL PRIMARY KEY,
    stat_name TEXT UNIQUE NOT NULL,
    stat_value INTEGER NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- system_stats 表索引
CREATE INDEX IF NOT EXISTS idx_system_stats_stat_name ON system_stats(stat_name);

COMMENT ON TABLE system_stats IS '系統統計表 - 儲存系統統計資訊';
COMMENT ON COLUMN system_stats.stat_name IS '統計項目名稱';
COMMENT ON COLUMN system_stats.stat_value IS '統計數值';

-- =====================================================
-- 5. 建立觸發器 (Triggers)
-- =====================================================

-- 自動更新 users.updated_at 欄位
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_limits_updated_at
    BEFORE UPDATE ON message_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_stats_updated_at
    BEFORE UPDATE ON system_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. 建立 Row Level Security (RLS) 政策
-- =====================================================

-- 啟用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_stats ENABLE ROW LEVEL SECURITY;

-- users 表 RLS 政策
CREATE POLICY "允許所有操作 users" ON users
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- messages 表 RLS 政策
CREATE POLICY "允許所有操作 messages" ON messages
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- message_limits 表 RLS 政策
CREATE POLICY "允許所有操作 message_limits" ON message_limits
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- system_stats 表 RLS 政策
CREATE POLICY "允許所有操作 system_stats" ON system_stats
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- 7. 建立輔助函數 (Helper Functions)
-- =====================================================

-- 取得用戶訊息統計
CREATE OR REPLACE FUNCTION get_user_message_stats(p_user_id UUID)
RETURNS TABLE (
    total_messages BIGINT,
    text_messages BIGINT,
    file_messages BIGINT,
    first_message TIMESTAMP WITH TIME ZONE,
    last_message TIMESTAMP WITH TIME ZONE
) AS $$
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
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_message_stats IS '取得指定用戶的訊息統計資訊';

-- 更新用戶訊息計數
CREATE OR REPLACE FUNCTION update_user_message_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users
        SET
            message_count = message_count + 1,
            last_message_at = NEW.timestamp,
            first_message_at = COALESCE(first_message_at, NEW.timestamp)
        WHERE id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users
        SET
            message_count = GREATEST(message_count - 1, 0)
        WHERE id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器：自動更新用戶訊息計數
CREATE TRIGGER trigger_update_user_message_count
    AFTER INSERT OR DELETE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_user_message_count();

COMMENT ON FUNCTION update_user_message_count IS '自動更新 users 表的訊息計數和時間';

-- =====================================================
-- 完成 Migration
-- =====================================================

-- 顯示建立完成訊息
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'LINE CRM 資料庫架構建立完成！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '已建立的資料表:';
    RAISE NOTICE '  - users (用戶資料表)';
    RAISE NOTICE '  - messages (訊息資料表)';
    RAISE NOTICE '  - message_limits (系統限制表)';
    RAISE NOTICE '  - system_stats (系統統計表)';
    RAISE NOTICE '';
    RAISE NOTICE '已建立的索引: 13 個';
    RAISE NOTICE '已建立的觸發器: 4 個';
    RAISE NOTICE '已建立的函數: 3 個';
    RAISE NOTICE '已啟用 Row Level Security (RLS)';
    RAISE NOTICE '========================================';
END $$;
