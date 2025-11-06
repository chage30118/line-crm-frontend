# LINE CRM 系統 - AI 協作指引

## 專案概述

**技術棧**: Vue 3 + Element Plus + Supabase + Vite  
**目的**: LINE 客戶訊息收集與 CRM 系統前端介面

## 核心架構

### 資料流向
```
Supabase (PostgreSQL) → Pinia Store → Vue Components → Element Plus UI
```

### 關鍵設計決策

1. **資料庫架構單一來源**: `configs/database.js`
   - 定義所有資料表結構、型別、索引
   - 提供輔助函數: `getTableColumns()`, `hasColumn()`, `getColumnDefinition()`
   - 用於驗證欄位存在性和型別檢查

2. **Pinia Store 模式** (`src/stores/`)
   - `customers.js`: 客戶列表、搜尋、過濾
   - `messages.js`: 訊息歷史和對話管理
   - `ui.js`: UI 狀態（側邊欄展開/收合）

3. **元件結構** (`src/components/`)
   ```
   customer/CustomerList.vue    → 客戶列表（左欄）
   message/MessageThread.vue    → 訊息歷史（中欄）
   crm/CustomerCRM.vue          → 客戶資料（右欄）
   ```

4. **備註系統**: 使用 JSON 陣列儲存多個備註
   ```javascript
   // notes 欄位格式
   [
     { id: timestamp, content: "備註內容", created_at: "ISO日期" }
   ]
   ```

## 重要開發規範

### 環境變數
```env
VITE_SUPABASE_URL=你的_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=你的_ANON_KEY
```

### 常用指令
```bash
npm run dev              # 開發伺服器 (port 5173)
npm run build            # 生產建置
npm run verify-db        # 驗證資料庫架構
npm run test-migration   # 測試 Migration
```

### 資料庫 Migration
- 位置: `migrations/*.sql`
- 執行: 在 Supabase SQL Editor 手動執行
- 測試: `npm run test-migration`

### 程式碼風格
- **語言**: 繁體中文註解、變數名稱使用英文
- **Composition API**: 使用 `<script setup>`
- **狀態管理**: Pinia stores (不使用 Vuex)
- **UI 元件**: Element Plus (按需引入)
- **樣式**: Tailwind CSS + scoped CSS

### 元件模式
```vue
<script setup>
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCustomersStore } from '@/stores/customers'

const store = useCustomersStore()
const { selectedCustomer } = storeToRefs(store)
</script>
```

## 關鍵整合點

### Supabase 查詢模式
```javascript
// ✅ 正確: 使用 store 方法
await customersStore.fetchCustomers()

// ❌ 避免: 直接在元件中呼叫 supabase
const { data } = await supabase.from('users').select('*')
```

### ERP 欄位優先級
- 顯示名稱: `erp_bi_name` > `display_name`
- 搜尋範圍: 包含 `erp_bi_code` 和 `erp_bi_name`
- 空值顯示: "需建立客戶主檔,請與業務部確認"

### 檔案路徑別名
```javascript
import { formatDateTime } from '@/utils/formatters'
import CustomerCRM from '@/components/crm/CustomerCRM.vue'
```

## 專案特定約定

1. **資料表 ID 型別不一致**
   - `users.id`: INTEGER (舊架構遺留)
   - `messages.id`: UUID (新架構)
   - 函數參數需注意型別轉換

2. **備註更新機制**
   - 儲存時過濾空內容: `filter(note => note.content.trim())`
   - 轉為 JSON 字串: `JSON.stringify(filteredNotes)`
   - 至少保留一個備註欄位

3. **搜尋功能**
   - 支援模糊搜尋: `toLowerCase().includes(keyword)`
   - 搜尋欄位: display_name, line_user_id, group_display_name, erp_bi_code, erp_bi_name

## 文件參考

- **完整文件**: `docs/00-文件索引.md`
- **資料庫架構**: `configs/database.js`
- **Migration 紀錄**: `docs/13-Migration測試報告.md`
- **CRM 變更**: `CHANGELOG_CRM_ERP.md`

## AI 協作原則

⚠️ **重要**: 不要主動產生說明文檔（如 README.md, CHANGELOG.md 等），若認為必要請先詢問使用者

### 建議工作流程
1. 查閱 `configs/database.js` 確認資料表結構
2. 檢查對應的 Pinia store 是否已有相關邏輯
3. 使用 Element Plus 元件保持 UI 一致性
4. 提交前執行 `npm run verify-db` 驗證資料庫相容性

### 除錯提示
- Supabase 錯誤: 檢查 `.env` 環境變數
- 欄位不存在: 參考 `configs/database.js` 確認欄位名稱
- Store 狀態異常: 使用 Vue DevTools 檢查 Pinia 狀態
