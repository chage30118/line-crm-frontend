# Supabase Storage 設定指南

## 📋 目錄
1. [現有設定檢查](#現有設定檢查)
2. [Storage Bucket 說明](#storage-bucket-說明)
3. [RLS 政策設定](#rls-政策設定)
4. [測試與驗證](#測試與驗證)
5. [遷移到新專案](#遷移到新專案)

---

## 現有設定檢查

### 執行檢查腳本
```powershell
npm run check-storage
```

### 目前狀態
- ✅ **Bucket 名稱**: `line-files`
- ✅ **公開狀態**: 是（公開）
- ✅ **檔案大小限制**: 50 MB
- ✅ **允許的 MIME 類型**: 所有類型
- ✅ **資料夾結構**:
  ```
  line-files/
  ├── video/       # 影片檔案
  ├── images/      # 圖片檔案
  └── documents/   # 文件檔案
  ```

---

## Storage Bucket 說明

### 什麼是 Storage Bucket?
Storage Bucket 是 Supabase 提供的檔案儲存空間，類似 AWS S3。

### `line-files` Bucket 用途
- 儲存 LINE 訊息中的檔案（圖片、影片、文件等）
- 公開存取（任何人都可下載）
- 適合儲存不敏感的媒體檔案

### 建議的資料夾結構
```
line-files/
├── images/              # 圖片
│   ├── 2025/
│   │   ├── 01/         # 按月份分類
│   │   └── 02/
│   └── thumbnails/     # 縮圖（可選）
├── video/              # 影片
│   └── 2025/
├── audio/              # 音訊
│   └── 2025/
└── documents/          # 文件
    ├── pdf/
    ├── word/
    └── excel/
```

---

## RLS 政策設定

### 什麼是 RLS (Row Level Security)?
RLS 控制誰可以存取 Storage 中的檔案。

### 目前需要的政策

#### 1. 允許所有人讀取公開檔案
```sql
-- 因為 line-files 是公開 Bucket
-- 任何人都可以讀取（下載）檔案
```

#### 2. 允許服務角色完整存取
```sql
-- 後端使用 SERVICE_KEY 可以:
-- - 上傳檔案
-- - 刪除檔案
-- - 更新檔案
```

#### 3. 允許已認證用戶上傳
```sql
-- 前端已登入用戶可以上傳檔案
-- （如果有前端上傳需求）
```

### 執行 RLS 設定

**方式 1: 使用 SQL Migration（推薦）**
```powershell
# 在 Supabase SQL Editor 中執行
# 複製 migrations/004_setup_storage_policies.sql 的內容並執行
```

**方式 2: 使用 Dashboard UI**
1. Supabase Dashboard → Storage
2. 點擊 `line-files` Bucket
3. 點擊 "Policies" 標籤
4. 點擊 "New Policy"
5. 設定政策（參考下方範例）

---

## 測試與驗證

### 1. 檢查 Storage 設定
```powershell
npm run check-storage
```

應該看到:
- ✅ Bucket 存在
- ✅ 有資料夾
- ✅ 上傳測試成功

### 2. 手動測試上傳

建立測試腳本 `test-upload.js`:
```javascript
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
)

// 上傳測試檔案
const testContent = 'Hello from LINE CRM!'
const fileName = `test/${Date.now()}.txt`

const { data, error } = await supabase.storage
  .from('line-files')
  .upload(fileName, testContent)

if (error) {
  console.error('上傳失敗:', error)
} else {
  console.log('上傳成功:', data)
  
  // 取得公開 URL
  const { data: urlData } = supabase.storage
    .from('line-files')
    .getPublicUrl(fileName)
  
  console.log('公開 URL:', urlData.publicUrl)
}
```

### 3. 驗證公開存取

```javascript
// 測試公開 URL 是否可訪問
const publicUrl = 'https://pkaausgckqagwjkboobs.supabase.co/storage/v1/object/public/line-files/test/xxx.txt'

fetch(publicUrl)
  .then(res => res.text())
  .then(text => console.log('檔案內容:', text))
  .catch(err => console.error('無法存取:', err))
```

---

## 遷移到新專案

### 步驟 1: 在新專案建立 Bucket

**方式 A: 使用 Dashboard（推薦）**
1. 登入新的 Supabase 專案
2. 點擊左側 "Storage"
3. 點擊 "Create a new bucket"
4. 設定:
   - **Name**: `line-files`
   - **Public bucket**: ✅ 勾選（設為公開）
   - **File size limit**: `52428800` (50 MB)
   - **Allowed MIME types**: 留空（允許所有類型）
5. 點擊 "Create bucket"

**方式 B: 使用 SQL**
```sql
-- 注意: Supabase 不建議用 SQL 建立 Bucket
-- 請使用 Dashboard 或 API
```

### 步驟 2: 建立資料夾結構

在 Dashboard 中手動建立資料夾:
1. 點擊 `line-files` Bucket
2. 點擊 "Create folder"
3. 依序建立:
   - `images`
   - `video`
   - `audio`
   - `documents`

### 步驟 3: 設定 RLS 政策

在新專案的 SQL Editor 中執行:
```sql
-- 複製 migrations/004_setup_storage_policies.sql 的內容
-- 貼上並執行
```

### 步驟 4: 遷移現有檔案（如果需要）

**選項 1: 手動複製（小量檔案）**
- 從舊專案下載檔案
- 上傳到新專案

**選項 2: 使用腳本批次遷移（大量檔案）**

建立 `migrate-storage.js`:
```javascript
import { createClient } from '@supabase/supabase-js'

// 舊專案
const oldSupabase = createClient(
  'OLD_SUPABASE_URL',
  'OLD_SERVICE_KEY'
)

// 新專案
const newSupabase = createClient(
  'NEW_SUPABASE_URL',
  'NEW_SERVICE_KEY'
)

async function migrateFiles() {
  // 1. 列出舊專案的所有檔案
  const { data: files } = await oldSupabase.storage
    .from('line-files')
    .list('', { limit: 1000 })
  
  // 2. 逐一下載並上傳到新專案
  for (const file of files) {
    // 下載
    const { data: fileData } = await oldSupabase.storage
      .from('line-files')
      .download(file.name)
    
    // 上傳到新專案
    await newSupabase.storage
      .from('line-files')
      .upload(file.name, fileData)
    
    console.log(`✅ ${file.name}`)
  }
}

migrateFiles()
```

### 步驟 5: 更新資料庫中的 URL

如果 `messages` 表中儲存了舊的檔案 URL，需要更新:

```sql
-- 批次更新 file_path（如果有儲存完整 URL）
UPDATE messages
SET file_path = REPLACE(
  file_path,
  'OLD_PROJECT_ID.supabase.co',
  'NEW_PROJECT_ID.supabase.co'
)
WHERE file_path LIKE '%supabase.co%';
```

### 步驟 6: 驗證

```powershell
# 在新專案執行
npm run check-storage
```

確認:
- ✅ Bucket 存在
- ✅ 資料夾完整
- ✅ 檔案已遷移（如有）
- ✅ RLS 政策正確
- ✅ 可以上傳新檔案

---

## 常見問題

### Q1: 檔案上傳失敗，顯示「row-level security policy」錯誤
**解決方案**:
1. 確認已執行 `004_setup_storage_policies.sql`
2. 確認使用的是 `VITE_SUPABASE_SERVICE_KEY`
3. 在 Dashboard 檢查 Policies 設定

### Q2: 公開 URL 無法存取（404）
**解決方案**:
1. 確認 Bucket 已設為 Public
2. 檢查檔案路徑是否正確
3. URL 格式: `https://PROJECT_ID.supabase.co/storage/v1/object/public/BUCKET_NAME/FILE_PATH`

### Q3: 如何限制檔案大小？
**解決方案**:
- 在 Dashboard → Storage → Bucket Settings
- 設定 "File size limit"（單位: bytes）
- 50 MB = 52428800 bytes

### Q4: 如何自動清理舊檔案？
**解決方案**:

建立定期執行的 Edge Function（Supabase Functions）:
```javascript
// 刪除 30 天前的檔案
const thirtyDaysAgo = new Date()
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

const { data: oldFiles } = await supabase.storage
  .from('line-files')
  .list('', {
    limit: 1000,
    sortBy: { column: 'created_at', order: 'asc' }
  })

const filesToDelete = oldFiles.filter(file => 
  new Date(file.created_at) < thirtyDaysAgo
)

for (const file of filesToDelete) {
  await supabase.storage
    .from('line-files')
    .remove([file.name])
}
```

### Q5: Storage 容量限制？
**Free Plan**:
- 1 GB 儲存空間
- 2 GB 傳輸量/月

**Pro Plan**:
- 100 GB 儲存空間
- 200 GB 傳輸量/月
- 超出部分按量計費

---

## 檢查清單

### 新專案 Storage 設定
- [ ] 建立 `line-files` Bucket
- [ ] 設定為公開（Public）
- [ ] 設定檔案大小限制（50 MB）
- [ ] 建立資料夾結構
- [ ] 執行 RLS 政策 SQL
- [ ] 測試檔案上傳
- [ ] 測試公開 URL 存取
- [ ] 更新 `.env` 中的 URL（如需要）

### 檔案遷移（如需要）
- [ ] 備份舊專案檔案清單
- [ ] 執行檔案遷移腳本
- [ ] 驗證檔案完整性
- [ ] 更新資料庫中的 URL
- [ ] 測試前端檔案顯示

---

## 參考資源

- [Supabase Storage 官方文件](https://supabase.com/docs/guides/storage)
- [Storage RLS 政策指南](https://supabase.com/docs/guides/storage/security/access-control)
- [Storage API 參考](https://supabase.com/docs/reference/javascript/storage-from-upload)
