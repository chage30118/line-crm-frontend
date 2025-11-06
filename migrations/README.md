# 資料庫 Migration 指南

本目錄包含 LINE CRM 系統的資料庫遷移腳本。

## 📋 Migration 檔案列表

### 001_complete_database_schema.sql
- **描述**: 建立完整的資料庫架構
- **版本**: 1.0.0
- **建立日期**: 2025-11-06
- **內容**:
  - 4 個資料表 (users, messages, message_limits, system_stats)
  - 13 個索引
  - 4 個觸發器 (自動更新時間戳)
  - 3 個輔助函數
  - Row Level Security (RLS) 政策

## 🚀 如何執行 Migration

### 方法一：透過 Supabase Dashboard（推薦）

1. 登入 [Supabase Dashboard](https://app.supabase.com)
2. 選擇你的專案
3. 點擊左側選單的 **SQL Editor**
4. 點擊 **New Query**
5. 複製 `001_complete_database_schema.sql` 的內容並貼上
6. 點擊 **Run** 執行

### 方法二：使用 Supabase CLI

```bash
# 1. 安裝 Supabase CLI（如果尚未安裝）
npm install -g supabase

# 2. 登入 Supabase
supabase login

# 3. 連結到你的專案
supabase link --project-ref your-project-ref

# 4. 執行 migration
supabase db push
```

### 方法三：使用 psql

```bash
# 從 Supabase Dashboard 取得資料庫連線字串
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f migrations/001_complete_database_schema.sql
```

## ✅ 驗證 Migration 是否成功

執行 Migration 後，執行以下 SQL 查詢來驗證：

```sql
-- 1. 檢查所有資料表是否存在
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 預期結果應該包含:
-- - messages
-- - message_limits
-- - system_stats
-- - users

-- 2. 檢查 users 表的所有欄位
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 3. 檢查索引是否建立
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 4. 檢查觸發器是否建立
SELECT
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 5. 檢查初始資料是否插入
SELECT * FROM message_limits;

-- 預期結果應該有 2 筆資料:
-- - max_messages: 1000
-- - max_users: 100
```

## 🔧 常見問題排解

### 問題 1: 資料表已存在錯誤

如果你看到 "relation already exists" 錯誤，這表示資料表已經存在。Migration 腳本使用 `IF NOT EXISTS`，所以正常情況下不會有問題。

**解決方法**:
- 檢查現有資料表的結構是否與 Migration 一致
- 如需重建，可以先刪除資料表（⚠️ 會遺失資料）:

```sql
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS message_limits CASCADE;
DROP TABLE IF EXISTS system_stats CASCADE;
```

### 問題 2: 權限不足錯誤

如果看到權限錯誤，確認你使用的是 `service_role` key 或 Supabase Dashboard 的 SQL Editor。

### 問題 3: 欄位缺失錯誤

如果前端查詢時出現 "column does not exist" 錯誤:

1. 執行驗證查詢（上方第 2 點）檢查欄位是否存在
2. 比對 `configs/database.js` 中的定義
3. 如果欄位確實缺失，重新執行 Migration

## 📝 Migration 版本管理

### 新增 Migration 的步驟

1. 建立新的 Migration 檔案，遵循命名規則:
   ```
   002_description_of_changes.sql
   003_another_change.sql
   ```

2. 在檔案開頭加入註解說明:
   ```sql
   -- Migration: 002_add_customer_tags.sql
   -- Description: 新增客戶標籤功能相關欄位
   -- Date: 2025-11-XX
   ```

3. 使用可重複執行的語法:
   ```sql
   ALTER TABLE users ADD COLUMN IF NOT EXISTS new_field TEXT;
   ```

4. 更新 `configs/database.js` 中的 schema 定義

5. 記錄在本 README 的 Migration 列表

## 🔄 回滾 Migration

如需回滾 Migration，建立對應的 rollback 腳本:

```sql
-- 001_complete_database_schema_rollback.sql
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS message_limits CASCADE;
DROP TABLE IF EXISTS system_stats CASCADE;

DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS get_user_message_stats CASCADE;
DROP FUNCTION IF EXISTS update_user_message_count CASCADE;
```

⚠️ **警告**: 回滾會刪除所有資料，請務必先備份！

## 📚 相關文件

- **資料庫架構定義**: `configs/database.js`
- **產品需求文件**: `docs/01-產品需求文件(PRD).md`
- **專案重構計劃**: `docs/02-專案重構計劃.md`

## 🆘 需要協助？

如果執行 Migration 時遇到問題:

1. 檢查 Supabase Dashboard 的 Logs
2. 查看 PostgreSQL 錯誤訊息
3. 參考 `configs/database.js` 確認欄位定義
4. 聯繫開發團隊

---

**最後更新**: 2025-11-06
