# Supabase 專案遷移指南

## 情境
從個人帳號遷移到公司付費帳號

## 步驟

### 1. 準備舊專案資料

#### 1.1 匯出資料（使用現有備份腳本）
```powershell
# 已有備份在 backups/ 目錄
# 或重新備份
node scripts/backup-database.js
```

#### 1.2 確認 Migration 檔案
- ✅ `migrations/001_complete_database_schema.sql` - 完整資料庫結構
- ✅ `migrations/002_add_missing_columns_safe.sql` - 額外欄位

### 2. 在公司帳號建立新專案

#### 2.1 登入 Supabase Dashboard
- 網址: https://supabase.com/dashboard
- 使用公司帳號登入

#### 2.2 建立新專案
1. 點擊 "New Project"
2. 選擇組織（公司組織）
3. 填寫：
   - Project Name: `line-crm` (或其他名稱)
   - Database Password: 設定強密碼（記錄下來）
   - Region: 建議選擇 `Northeast Asia (Tokyo)` 或 `Southeast Asia (Singapore)`
   - Pricing Plan: 選擇付費方案

#### 2.3 等待專案建置（約 2 分鐘）

### 3. 執行資料庫 Migration

#### 3.1 開啟 SQL Editor
- 在新專案 Dashboard → SQL Editor

#### 3.2 執行 Migration（依序執行）

**第一步：建立資料表結構**
```sql
-- 複製 migrations/001_complete_database_schema.sql 的內容
-- 貼上並執行
```

**第二步：新增額外欄位**
```sql
-- 複製 migrations/002_add_missing_columns_safe.sql 的內容
-- 貼上並執行
```

#### 3.3 驗證結構
```sql
-- 檢查資料表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 應該看到：users, messages
```

### 4. 遷移資料

#### 4.1 使用還原腳本（推薦）

**步驟 1: 準備備份檔案**
```powershell
# 確認備份檔案存在
ls backups/

# 應該看到類似以下檔案:
# users_backup_2025-11-06T01-29-06.json
# messages_backup_2025-11-06T01-29-06.json
# message_limits_backup_2025-11-06T01-29-06.json
# system_stats_backup_2025-11-06T01-29-06.json
# backup_report_2025-11-06T01-29-06.json
```

**步驟 2: 更新 .env 為新專案憑證**
```env
# 更新為新專案的憑證
VITE_SUPABASE_URL=https://NEW_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=新專案的_ANON_KEY
VITE_SUPABASE_SERVICE_KEY=新專案的_SERVICE_KEY  # ⚠️ 重要！還原需要 SERVICE_KEY
```

**步驟 3: 執行還原（使用 --new-project 參數）**
```powershell
# 使用時間戳記還原（會自動生成新的 ID）
npm run restore-db 2025-11-06T01-29-06 --new-project
```

**為什麼需要 `--new-project` 參數？**
- ✅ 自動忽略舊 ID，讓新專案自動生成
- ✅ 使用唯一鍵（line_user_id, line_message_id）防止重複
- ✅ 正確處理外鍵關聯（users → messages）
- ✅ 適合從個人帳號遷移到公司帳號

#### 4.2 手動匯入（備用方案）

如果自動還原失敗，可使用 SQL Editor 手動匯入：

```sql
-- 範例：手動插入 message_limits
INSERT INTO message_limits (limit_type, limit_value, current_count, is_active)
VALUES
  ('max_messages', 1000, 0, TRUE),
  ('max_users', 100, 0, TRUE)
ON CONFLICT (limit_type) DO UPDATE
SET limit_value = EXCLUDED.limit_value;
```

### 5. 更新 LINE Bot Webhook URL（重要！）

#### 5.1 更新後端的 Supabase 憑證
確認 `.env` 已更新為新專案

#### 5.2 測試連線
```powershell
# 驗證資料庫連線
node scripts/verify-database-schema.js
```

#### 5.3 LINE Developers Console
- 網址: https://developers.line.biz/console/
- 選擇你的 Channel
- Messaging API → Webhook settings
- Webhook URL 保持不變（因為後端程式碼不變）

### 6. 測試驗證

#### 6.1 前端測試
```powershell
npm run dev
```
- 檢查是否能載入用戶列表
- 檢查訊息歷史
- 測試搜尋功能

#### 6.2 後端測試
```powershell
npm run dev:server
```
- 測試健康檢查：訪問 http://localhost:3002/api/health
- 測試頭像刷新 API

#### 6.3 完整測試
```powershell
npm run dev:all
```

### 7. Render 部署更新（如果有使用）

如果後端部署在 Render：
1. Render Dashboard → 你的 Service
2. Environment → 編輯環境變數
3. 更新：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_SERVICE_KEY`
4. 儲存後自動重新部署

## 常見問題

### Q1: 需要停機多久？
- 預計 15-30 分鐘
- 建議在非營業時間操作

### Q2: 舊專案資料會消失嗎？
- 不會，舊專案仍在個人帳號
- 遷移完成並確認無誤後才刪除舊專案

### Q3: 費用什麼時候開始計算？
- 建立新專案時立即開始
- 建議資料遷移完成後再刪除舊專案

### Q4: 遷移失敗怎麼辦？
- 舊專案資料仍完整保留
- 可重新建立新專案再次嘗試
- 或保留兩個專案並行運作一段時間

## 檢查清單

遷移前：
- [ ] 執行 `node scripts/backup-database.js` 備份資料
- [ ] 確認 Migration 檔案完整
- [ ] 記錄舊專案的 URL 和 Keys（備用）

遷移中：
- [ ] 建立新專案並記錄 URL 和 Keys
- [ ] 執行 Migration（001 + 002）
- [ ] 驗證資料表結構正確
- [ ] 匯入資料
- [ ] 更新 `.env` 檔案

遷移後：
- [ ] 前端功能測試（用戶列表、訊息、搜尋）
- [ ] 後端 API 測試
- [ ] LINE Webhook 測試（發送訊息看是否收到）
- [ ] 更新 Render 環境變數（如有）
- [ ] 監控 1-2 天確認穩定後刪除舊專案
