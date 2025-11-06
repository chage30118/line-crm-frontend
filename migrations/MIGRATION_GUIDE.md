# 🚀 資料庫 Migration 完整操作指南

## 📋 目錄

1. [概述](#概述)
2. [方案 A: 完整 Migration（推薦）](#方案-a-完整-migration推薦)
3. [安全檢查清單](#安全檢查清單)
4. [緊急回滾步驟](#緊急回滾步驟)
5. [常見問題](#常見問題)

---

## 概述

本指南將帶你安全地執行資料庫 Migration，新增以下缺少的欄位：

### users 表缺少的欄位（8 個）
- ❌ `customer_name` - 客戶真實姓名
- ❌ `suggested_name` - AI 建議姓名
- ❌ `first_message_at` - 首次訊息時間
- ❌ `last_message_at` - 最後訊息時間 ⚠️ **導致錯誤的欄位**
- ❌ `message_count` - 訊息總數
- ❌ `tags` - 客戶標籤
- ❌ `notes` - 客戶備註
- ❌ `unread_count` - 未讀訊息數

### messages 表缺少的欄位（1 個）
- ❌ `file_path` - Storage 檔案路徑

### 目前資料量
- 👥 users: **684 筆**
- 💬 messages: **3,704 筆**

---

## 方案 A: 完整 Migration（推薦）

### 步驟 1: 備份資料（必要！）

**在終端機執行：**

```bash
npm run backup-db
```

**預期輸出：**
```
🔄 開始備份 Supabase 資料庫
======================================================================
備份時間: 2025/11/6 上午9:30:00

📦 正在備份 users 表...
   已匯出 684 筆資料...
✅ users 表備份完成: 共 684 筆資料

📦 正在備份 messages 表...
   已匯出 1000 筆資料...
   已匯出 2000 筆資料...
   已匯出 3000 筆資料...
   已匯出 3704 筆資料...
✅ messages 表備份完成: 共 3704 筆資料

📊 備份總結報告
======================================================================
總表數: 2
成功備份: 2 ✅
總資料筆數: 4388

📁 備份檔案:
   - D:\line-crm-frontend\backups\users_backup_2025-11-06T01-30-00.json (X.XX MB)
   - D:\line-crm-frontend\backups\messages_backup_2025-11-06T01-30-00.json (X.XX MB)
   - D:\line-crm-frontend\backups\backup_report_2025-11-06T01-30-00.json

✅ 所有資料已成功備份！
下一步: 執行 npm run migrate-db 進行資料庫遷移
======================================================================
```

**⚠️ 重要：記下時間戳記！**
```
備份時間戳記: 2025-11-06T01-30-00
```

**📁 備份檔案位置：**
- `backups/users_backup_<timestamp>.json`
- `backups/messages_backup_<timestamp>.json`
- `backups/backup_report_<timestamp>.json`

---

### 步驟 2: 執行 Migration

**前往 Supabase Dashboard：**

1. 開啟 [Supabase Dashboard](https://app.supabase.com)
2. 選擇你的專案
3. 點擊左側選單的 **SQL Editor**
4. 點擊 **New Query**

**複製並執行以下 SQL：**

開啟檔案 `migrations/002_add_missing_columns_safe.sql`，複製全部內容並貼上到 SQL Editor，然後點擊 **Run**。

**預期輸出（在 Logs 中查看）：**
```
NOTICE:  開始新增 users 表的欄位...
NOTICE:  ✅ users 表欄位新增完成
NOTICE:  開始新增 messages 表的欄位...
NOTICE:  ✅ messages 表欄位新增完成
NOTICE:  開始處理 system_stats 表...
NOTICE:  ✅ system_stats.last_updated 已重新命名為 updated_at
NOTICE:  開始建立索引...
NOTICE:  ✅ 索引建立完成
NOTICE:  開始初始化現有資料...
NOTICE:  ✅ 已更新 684 位用戶的訊息統計資料
NOTICE:  開始建立觸發器...
NOTICE:  ✅ 觸發器建立完成
NOTICE:  開始建立輔助函數...
NOTICE:  ✅ 輔助函數建立完成
NOTICE:
NOTICE:  ========================================
NOTICE:  📊 Migration 完成驗證
NOTICE:  ========================================
NOTICE:  users 表:
NOTICE:    - 資料筆數: 684
NOTICE:    - 欄位數: 18
NOTICE:
NOTICE:  messages 表:
NOTICE:    - 資料筆數: 3704
NOTICE:    - 欄位數: 14
NOTICE:  ========================================
NOTICE:  ✅ 所有現有資料保持完整！
NOTICE:  ========================================
NOTICE:
NOTICE:  ========================================
NOTICE:  🎉 Migration 執行成功！
NOTICE:  ========================================
```

**✅ 成功指標：**
- 看到 "Migration 執行成功" 訊息
- users 欄位數變成 18
- messages 欄位數變成 14
- 資料筆數保持不變（684 和 3704）

**❌ 如果出現錯誤：**
- 立即停止操作
- 記錄錯誤訊息
- 前往「緊急回滾步驟」

---

### 步驟 3: 驗證 Migration 結果

**在終端機執行：**

```bash
npm run verify-db
```

**預期輸出：**
```
🔍 開始驗證 Supabase 資料庫架構...

📋 資料表: users
✅ 狀態: 資料表存在
📈 資料筆數: 684

📝 欄位比對:
   預期欄位數: 18
   實際欄位數: 18

   ✅ 匹配的欄位 (18):
      id, line_user_id, display_name, ... customer_name, last_message_at ... 等 18 個

📊 驗證總結報告
======================================================================
總資料表數: 4
存在的資料表: 4 ✅
缺少的資料表: 0
有問題的資料表: 0

✅ 所有資料表結構都符合定義！
   資料庫架構驗證通過。
```

**✅ 驗證通過指標：**
- 有問題的資料表: 0
- users 欄位數: 18 ✅
- messages 欄位數: 14 ✅
- 資料筆數不變

---

### 步驟 4: 測試前端應用

1. **啟動開發伺服器：**
   ```bash
   npm run dev
   ```

2. **開啟瀏覽器訪問應用**

3. **測試客戶列表頁面：**
   - 檢查客戶列表是否正常載入
   - 確認沒有 "column users.last_message_at does not exist" 錯誤
   - 檢查排序功能是否正常

4. **開啟瀏覽器開發者工具（F12）：**
   - 查看 Console 是否有錯誤
   - 查看 Network 標籤，確認 API 請求成功

**✅ 測試通過指標：**
- 客戶列表正常顯示
- 無 Console 錯誤
- API 請求返回 200 狀態碼

---

### 步驟 5: 清理（可選）

如果一切正常運作超過 24 小時，可以考慮刪除備份檔案：

```bash
# 建議保留至少 7 天
# 之後可以手動刪除 backups/ 目錄中的舊備份
```

---

## 安全檢查清單

在執行 Migration 前，請確認：

- [ ] ✅ 已執行 `npm run backup-db` 成功備份
- [ ] ✅ 已記下備份時間戳記
- [ ] ✅ 備份檔案已存在於 `backups/` 目錄
- [ ] ✅ 檢查備份檔案大小合理（不是 0 bytes）
- [ ] ✅ 已閱讀並理解 Migration SQL 的內容
- [ ] ✅ 了解如何回滾（見下方）
- [ ] ✅ 在非高峰時段執行（建議）

---

## 緊急回滾步驟

### 如果 Migration 失敗或出現問題：

#### 方法一：使用備份還原（推薦）

**在終端機執行：**

```bash
npm run restore-db <你的備份時間戳記>
```

**範例：**
```bash
npm run restore-db 2025-11-06T01-30-00
```

**預期輸出：**
```
🔄 開始還原 Supabase 資料庫
======================================================================
還原時間: 2025/11/6 上午10:00:00
備份時間戳記: 2025-11-06T01-30-00

📂 讀取備份檔案...
✅ users 備份讀取成功: 684 筆
✅ messages 備份讀取成功: 3704 筆

📥 正在還原 users 表...
   ✅ 已還原 684 / 684 筆

📥 正在還原 messages 表...
   ✅ 已還原 1000 / 3704 筆
   ✅ 已還原 2000 / 3704 筆
   ✅ 已還原 3000 / 3704 筆
   ✅ 已還原 3704 / 3704 筆

📊 還原總結報告
======================================================================
users 表: 684 筆成功, 0 筆失敗
messages 表: 3704 筆成功, 0 筆失敗
======================================================================
✅ 所有資料已成功還原！
```

#### 方法二：手動回滾 SQL（如果新增的欄位導致問題）

**在 Supabase SQL Editor 執行：**

```sql
-- 移除 users 表新增的欄位
ALTER TABLE users DROP COLUMN IF EXISTS customer_name;
ALTER TABLE users DROP COLUMN IF EXISTS suggested_name;
ALTER TABLE users DROP COLUMN IF EXISTS first_message_at;
ALTER TABLE users DROP COLUMN IF EXISTS last_message_at;
ALTER TABLE users DROP COLUMN IF EXISTS message_count;
ALTER TABLE users DROP COLUMN IF EXISTS tags;
ALTER TABLE users DROP COLUMN IF EXISTS notes;
ALTER TABLE users DROP COLUMN IF EXISTS unread_count;

-- 移除 messages 表新增的欄位
ALTER TABLE messages DROP COLUMN IF EXISTS file_path;

-- 移除觸發器
DROP TRIGGER IF EXISTS trigger_update_user_message_count ON messages;
DROP FUNCTION IF EXISTS update_user_message_count();
DROP FUNCTION IF EXISTS get_user_message_stats(UUID);
```

⚠️ **注意**：此方法會刪除新增的欄位，但不會影響原有資料。

---

## 常見問題

### Q1: 備份需要多久？
**A:** 根據資料量，約 30 秒到 2 分鐘。你的資料量：
- users: 684 筆 → 約 5-10 秒
- messages: 3,704 筆 → 約 20-30 秒

### Q2: Migration 會鎖定資料表嗎？
**A:** 會有短暫鎖定（幾秒鐘），但使用 `IF NOT EXISTS` 可以減少影響。建議在非高峰時段執行。

### Q3: Migration 失敗會怎樣？
**A:** Migration 使用 `BEGIN` 和 `COMMIT` 交易，如果失敗會自動回滾，不會影響現有資料。

### Q4: 備份檔案可以刪除嗎？
**A:** 建議至少保留 7 天。確認一切正常運作後可以刪除。

### Q5: 可以重複執行 Migration 嗎？
**A:** 可以！SQL 使用 `IF NOT EXISTS`，重複執行不會出錯，也不會重複新增欄位。

### Q6: 如何確認 Migration 真的成功了？
**A:** 三個驗證步驟：
1. SQL Editor 看到成功訊息
2. `npm run verify-db` 驗證通過
3. 前端應用正常運作

### Q7: 備份檔案存在哪裡？
**A:** `D:\line-crm-frontend\backups\` 目錄

### Q8: 如果前端還是出現錯誤怎麼辦？
**A:**
1. 清除瀏覽器快取
2. 重新啟動開發伺服器
3. 檢查 .env 檔案的環境變數是否正確
4. 執行 `npm run verify-db` 再次驗證

---

## 📞 需要協助？

如果遇到任何問題：

1. 查看備份報告：`backups/backup_report_<timestamp>.json`
2. 查看驗證報告：`scripts/schema-verification-report.json`
3. 檢查 Supabase Dashboard 的 Logs
4. 聯繫開發團隊

---

**最後更新**: 2025-11-06
**版本**: 1.0.0
