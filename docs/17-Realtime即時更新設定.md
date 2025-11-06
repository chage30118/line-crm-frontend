# Supabase Realtime 即時更新設定指南

## 📌 功能說明

使用 Supabase Realtime 實現：
- ✅ 新訊息即時出現在客戶列表和對話中
- ✅ 未讀計數即時更新
- ✅ 客戶資料變更即時同步
- ✅ 無需手動刷新頁面

---

## 🔧 Supabase Dashboard 設定步驟

### 1. 啟用 Realtime Replication

1. 前往 [Supabase Dashboard](https://app.supabase.com)
2. 選擇你的專案
3. 左側選單 → **Database** → **Replication**
4. 找到 `users` 表，點擊右側開關 **啟用 Realtime**
5. 找到 `messages` 表，點擊右側開關 **啟用 Realtime**

### 2. 驗證設定

在 Supabase SQL Editor 執行：

```sql
-- 檢查 Realtime 是否已啟用
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN tablename = ANY(
      SELECT tablename 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime'
    ) 
    THEN 'Realtime 已啟用 ✅'
    ELSE 'Realtime 未啟用 ❌'
  END as realtime_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'messages')
ORDER BY tablename;
```

預期結果：
```
 schemaname | tablename |   realtime_status   
------------+-----------+---------------------
 public     | messages  | Realtime 已啟用 ✅
 public     | users     | Realtime 已啟用 ✅
```

---

## 💻 前端實作說明

### 已實作的功能

#### 1. 客戶列表即時更新 (`src/stores/customers.js`)

```javascript
// 訂閱 users 表變更
subscribeToRealtimeUpdates() {
  this.realtimeChannel = supabase
    .channel('users-changes')
    .on('postgres_changes', {
      event: '*',  // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'users'
    }, (payload) => {
      this.handleUserChange(payload)
    })
    .subscribe()
}
```

**功能**：
- 新用戶自動出現在列表
- 用戶資料更新（顯示名稱、未讀計數等）即時同步
- 有新訊息的客戶自動移到最上方

#### 2. 訊息列表即時更新 (`src/stores/messages.js`)

```javascript
// 訂閱特定用戶的新訊息
subscribeToMessages(userId) {
  this.realtimeChannel = supabase
    .channel(`messages:${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      this.messages.unshift(payload.new)
    })
    .subscribe()
}
```

**功能**：
- 新訊息即時出現在對話中
- 支援文字、圖片、檔案等所有類型

#### 3. Dashboard 自動訂閱 (`src/views/Dashboard.vue`)

```javascript
onMounted(() => {
  customersStore.fetchCustomers()
  customersStore.subscribeToRealtimeUpdates()
})

onUnmounted(() => {
  customersStore.unsubscribeFromRealtimeUpdates()
})
```

---

## 🧪 測試步驟

### 測試 1: 客戶列表即時更新

1. 打開前端網頁 (`http://localhost:5173`)
2. 打開瀏覽器 DevTools Console（F12）
3. 從 LINE 傳送訊息到 Bot
4. **預期結果**：
   - Console 顯示 `[Realtime] 收到 users 變更: ...`
   - 客戶自動移到列表最上方
   - 未讀徽章數字更新

### 測試 2: 訊息即時出現

1. 在前端選擇一個客戶
2. 從 LINE 向該客戶發送訊息
3. **預期結果**：
   - Console 顯示 `收到新訊息: ...`
   - 訊息立即出現在對話中
   - 無需刷新頁面

### 測試 3: 多視窗同步

1. 打開兩個瀏覽器視窗，都進入前端
2. 在其中一個視窗標記訊息已讀
3. **預期結果**：
   - 另一個視窗的未讀徽章也立即消失

---

## 🐛 常見問題

### Q: Realtime 沒有作用？

**檢查清單**：
1. ✅ Supabase Dashboard → Replication 已啟用
2. ✅ 使用正確的 `VITE_SUPABASE_ANON_KEY`
3. ✅ Console 看到 `[Realtime] 訂閱狀態: SUBSCRIBED`
4. ✅ 沒有防火牆封鎖 WebSocket 連線

### Q: Console 顯示 "CHANNEL_ERROR"？

**原因**：RLS (Row Level Security) 阻擋
**解決**：確保 Supabase RLS Policies 允許匿名讀取

```sql
-- 允許匿名讀取 users
CREATE POLICY "Enable read access for all users" ON public.users
  FOR SELECT USING (true);

-- 允許匿名讀取 messages
CREATE POLICY "Enable read access for all users" ON public.messages
  FOR SELECT USING (true);
```

### Q: Realtime 延遲太高？

**優化**：
- 確保 Supabase 專案在附近的區域（例如：ap-southeast-1）
- 檢查網路連線品質
- 考慮升級到 Supabase Pro（更高優先級）

---

## 📊 Realtime 運作原理

```
LINE 用戶發訊息
    ↓
Railway Webhook 接收
    ↓
儲存到 Supabase PostgreSQL (users, messages 表)
    ↓
Supabase Realtime 偵測資料庫變更
    ↓
透過 WebSocket 推送到所有訂閱的前端
    ↓
前端 Store 自動更新 → Vue 響應式更新 UI
```

**延遲**：通常 < 500ms

---

## 🚀 部署注意事項

### 生產環境設定

確保 Railway 環境變數包含：
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 安全性建議

1. **使用 RLS Policies** 限制資料存取
2. **不要在前端使用 SERVICE_KEY**（已在後端使用）
3. **定期檢查 Realtime 連線數**（避免超過方案限制）

---

## 📚 相關文件

- [Supabase Realtime 官方文件](https://supabase.com/docs/guides/realtime)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/subscribe)
- [PostgreSQL Change Data Capture](https://supabase.com/docs/guides/realtime/postgres-changes)
