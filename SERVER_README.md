# LINE CRM Full-Stack 專案

## 專案結構

```
line-crm-frontend/
├── src/                 # 前端 Vue 3 程式碼
│   ├── components/      # Vue 元件
│   ├── stores/          # Pinia 狀態管理
│   ├── utils/           # 工具函數
│   └── composables/     # Vue Composables
├── server/              # 後端 Express 程式碼
│   ├── index.js         # Express 主程式
│   └── routes/          # API 路由
│       ├── health.js    # 健康檢查
│       ├── users.js     # 用戶管理 API
│       └── webhook.js   # LINE Webhook
├── configs/             # 資料庫架構定義
├── docs/                # 專案文件
└── scripts/             # 工具腳本
```

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

確保 `.env` 檔案包含：

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_SERVICE_KEY=your_service_key

# LINE Bot
LINE_CHANNEL_ACCESS_TOKEN=your_access_token
LINE_CHANNEL_SECRET=your_channel_secret

# 後端 API
VITE_BACKEND_URL=http://localhost:3002
```

### 3. 開發模式

#### 方法 A：同時啟動前端和後端（推薦）

```bash
npm run dev:all
```

這會同時啟動：
- 前端 Vite Dev Server: http://localhost:5173
- 後端 Express API: http://localhost:3002

#### 方法 B：分別啟動

Terminal 1（前端）:
```bash
npm run dev
```

Terminal 2（後端）:
```bash
npm run dev:server
```

### 4. 生產部署

```bash
# 1. 建置前端
npm run build

# 2. 啟動生產伺服器（會同時提供前端和 API）
npm start
```

生產環境下，Express 會：
- 提供 API 在 `/api/*`
- 提供前端靜態檔案
- 處理 SPA 路由

## API 端點

### 健康檢查
```
GET /api/health
```

### 用戶管理
```
POST /api/users/:userId/refresh-profile  # 刷新單一用戶頭像
POST /api/users/batch-refresh             # 批次刷新
```

### LINE Webhook
```
POST /webhook  # 接收 LINE 事件
```

## 開發指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 只啟動前端 (port 5173) |
| `npm run dev:server` | 只啟動後端 (port 3002) |
| `npm run dev:all` | 同時啟動前端和後端 |
| `npm run build` | 建置前端生產檔案 |
| `npm start` | 啟動生產伺服器 |
| `npm run verify-db` | 驗證資料庫架構 |

## 部署到 Render.com

### 設定方式

1. **Build Command**:
   ```bash
   npm install && npm run build
   ```

2. **Start Command**:
   ```bash
   npm start
   ```

3. **環境變數** (在 Render 控制台設定):
   - `NODE_ENV=production`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_SERVICE_KEY`
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_CHANNEL_SECRET`

## 技術棧

### 前端
- Vue 3.5 (Composition API)
- Element Plus 2.11
- Pinia 3.0 (狀態管理)
- Vue Router 4.6
- Vite 7.2

### 後端
- Node.js + Express 4.21
- @line/bot-sdk 9.4
- Supabase Client 2.79
- Helmet (安全性)
- Morgan (日誌)

### 資料庫
- Supabase (PostgreSQL)
- 參考 `configs/database.js` 查看完整架構

## 常見問題

### Q: 為什麼要整合前後端？
A: 簡化部署流程，單一專案管理，方便維護。

### Q: 開發時如何同時運行前後端？
A: 使用 `npm run dev:all` 或分別開兩個 terminal。

### Q: 生產環境如何運作？
A: Express 會提供編譯後的前端檔案，並處理 API 請求。

### Q: 如何設定 LINE Webhook URL？
A: 在 LINE Developers 設定為：
```
https://your-domain.com/webhook
```

## 相關文件

- [API 實作指南](docs/14-頭像自動更新功能.md)
- [資料庫架構](configs/database.js)
- [完整文件索引](docs/00-文件索引.md)
