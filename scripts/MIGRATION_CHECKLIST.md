# 遷移到新 Supabase 專案檢查清單

## 📋 準備階段

### ✅ 舊專案備份
- [ ] 執行 `npm run backup-db` 備份所有資料
- [ ] 確認備份檔案完整（4 個表 + 1 個報告）：
  - [ ] `users_backup_TIMESTAMP.json`
  - [ ] `messages_backup_TIMESTAMP.json`
  - [ ] `message_limits_backup_TIMESTAMP.json`
  - [ ] `system_stats_backup_TIMESTAMP.json`
  - [ ] `backup_report_TIMESTAMP.json`
- [ ] 記錄備份時間戳記（TIMESTAMP）：`_________________`

### ✅ 舊專案憑證記錄（備用）
```env
# 舊專案憑證（備份用，遷移後可刪除）
OLD_SUPABASE_URL=_________________________
OLD_SUPABASE_ANON_KEY=____________________
OLD_SUPABASE_SERVICE_KEY=_________________
```

---

## 🏗️ 新專案建立

### ✅ 在 Supabase Dashboard 建立新專案
- [ ] 登入公司 Supabase 帳號
- [ ] 建立新專案
  - 專案名稱：`_________________`
  - 資料庫密碼：`_________________`（請妥善保管）
  - 區域：[ ] Tokyo  [ ] Singapore  [ ] 其他
  - 方案：[ ] Free  [ ] Pro  [ ] Team  [ ] Enterprise
- [ ] 等待專案建置完成（約 2-5 分鐘）

### ✅ 記錄新專案憑證
```env
# 新專案憑證
VITE_SUPABASE_URL=_________________________
VITE_SUPABASE_ANON_KEY=____________________
VITE_SUPABASE_SERVICE_KEY=_________________
```

**取得位置**：
- Supabase Dashboard → Settings → API
- `VITE_SUPABASE_URL`：Project URL
- `VITE_SUPABASE_ANON_KEY`：anon public key
- `VITE_SUPABASE_SERVICE_KEY`：service_role secret key（⚠️ 保密！）

---

## 🔧 資料庫結構建立

### ✅ 執行 Migration SQL
在新專案的 SQL Editor 中依序執行：

- [ ] 執行 `migrations/003_migrate_to_integer_ids.sql`
  - 這個檔案包含完整的資料庫結構（users, messages, message_limits, system_stats）
  - 執行時間：約 10-30 秒
  - 狀態：[ ] 成功  [ ] 失敗（錯誤訊息：____________）

### ✅ 驗證資料庫結構
在 SQL Editor 執行：
```sql
-- 檢查資料表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 應該看到 4 個表：
-- messages, message_limits, system_stats, users
```

- [ ] 4 個資料表都存在
- [ ] users.id 是 INTEGER 型別
- [ ] messages.id 是 INTEGER 型別
- [ ] messages.user_id 是 INTEGER 型別（外鍵）

---

## 📦 資料遷移

### ✅ 更新本地環境變數
編輯 `.env` 檔案：

```env
# ⚠️ 更新為新專案憑證
VITE_SUPABASE_URL=新專案的_URL
VITE_SUPABASE_ANON_KEY=新專案的_ANON_KEY
VITE_SUPABASE_SERVICE_KEY=新專案的_SERVICE_KEY  # 還原時必需！

# LINE Bot 設定（不變）
LINE_CHANNEL_ACCESS_TOKEN=保持不變
LINE_CHANNEL_SECRET=保持不變

# 後端設定（不變）
PORT=3002
NODE_ENV=development
VITE_BACKEND_URL=http://localhost:3002
```

- [ ] `.env` 已更新
- [ ] 環境變數已儲存

### ✅ 執行資料還原
```powershell
# 使用備份時間戳記（從步驟 1 記錄的）
npm run restore-db 2025-11-06T01-29-06 --new-project
```

**重要**：務必加上 `--new-project` 參數！

還原進度檢查：
- [ ] users 表還原成功
- [ ] messages 表還原成功
- [ ] message_limits 表還原成功
- [ ] system_stats 表還原成功

如果失敗：
- 錯誤訊息：`_________________`
- 解決方案：`_________________`

---

## ✅ 驗證與測試

### ✅ 資料庫驗證
```powershell
npm run verify-db
```

檢查項目：
- [ ] 資料表結構正確
- [ ] 欄位型別正確
- [ ] 索引已建立
- [ ] 資料筆數正確
  - users：`____` 筆
  - messages：`____` 筆
  - message_limits：`____` 筆
  - system_stats：`____` 筆

### ✅ 前端測試
```powershell
npm run dev
```

測試項目：
- [ ] 能開啟 http://localhost:5173
- [ ] 客戶列表能載入
- [ ] 能查看訊息歷史
- [ ] 搜尋功能正常
- [ ] 客戶資料顯示正確
- [ ] 頭像顯示正常（或顯示預設圖示）

### ✅ 後端測試
```powershell
npm run dev:server
```

測試項目：
- [ ] 後端伺服器啟動成功（port 3002）
- [ ] 健康檢查正常：http://localhost:3002/api/health
- [ ] LINE Webhook 可以接收訊息
- [ ] 頭像刷新 API 正常

### ✅ 完整測試
```powershell
npm run dev:all
```

整合測試：
- [ ] 前端 + 後端同時運行
- [ ] 前端能呼叫後端 API
- [ ] 能正常收發 LINE 訊息
- [ ] 資料能正確儲存到 Supabase

---

## 🚀 部署更新（如有使用 Render）

### ✅ 更新 Render 環境變數
Render Dashboard → 你的 Service → Environment

更新以下變數：
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_SUPABASE_SERVICE_KEY`

- [ ] 儲存後等待自動重新部署
- [ ] 部署狀態：[ ] 成功  [ ] 失敗

### ✅ 測試線上環境
- [ ] 訪問線上網址正常
- [ ] LINE Webhook 能接收訊息
- [ ] 資料能正確儲存

---

## 🧹 清理舊專案

### ⚠️ 重要：確認新專案穩定運行 1-2 天後再執行

### ✅ 監控新專案
監控期間：`_____` 至 `_____`

- [ ] 無資料遺失
- [ ] 無功能異常
- [ ] 效能正常
- [ ] LINE 訊息正常收發

### ✅ 刪除舊專案（謹慎！）
- [ ] 再次確認新專案一切正常
- [ ] 最後一次備份舊專案資料
- [ ] Supabase Dashboard → 舊專案 → Settings → General → Delete Project
- [ ] 輸入專案名稱確認刪除
- [ ] 舊專案已刪除

---

## 📝 遷移記錄

| 項目 | 記錄 |
|------|------|
| 遷移日期 | `_________________` |
| 執行人員 | `_________________` |
| 舊專案 URL | `_________________` |
| 新專案 URL | `_________________` |
| 備份時間戳記 | `_________________` |
| users 資料筆數 | `_____` → `_____` |
| messages 資料筆數 | `_____` → `_____` |
| 遷移耗時 | `_____` 分鐘 |
| 遇到的問題 | `_________________` |
| 解決方案 | `_________________` |

---

## 🆘 常見問題

### Q1: 還原時顯示「權限不足」
**解決**：確認使用 `VITE_SUPABASE_SERVICE_KEY`，不是 `ANON_KEY`

### Q2: 還原後資料筆數不對
**解決**：
1. 檢查備份檔案是否完整
2. 查看還原過程的錯誤訊息
3. 嘗試重新還原

### Q3: 前端無法連接資料庫
**解決**：
1. 確認 `.env` 已更新
2. 重新啟動開發伺服器（`npm run dev`）
3. 清除瀏覽器快取

### Q4: 外鍵錯誤
**解決**：
1. 確保 users 表先還原
2. 使用 `--new-project` 參數
3. 檢查 Migration 是否正確執行

### Q5: ID 衝突
**解決**：
1. 確實使用 `--new-project` 參數
2. 新專案會自動生成新的 ID，不會衝突

---

## ✅ 完成確認

- [ ] 所有資料已遷移
- [ ] 所有功能測試通過
- [ ] 舊專案已備份
- [ ] 新專案穩定運行
- [ ] 文件已更新
- [ ] 團隊已通知

**遷移完成時間**：`_________________`

**簽名確認**：`_________________`
