# Railway 部署指南

## 📋 Railway vs Render 比較

| 功能 | Railway | Render (目前) |
|------|---------|---------------|
| 休眠問題 | ❌ 無休眠 | ✅ Free plan 會休眠 |
| 冷啟動 | 極快 (~1s) | 慢 (~30s) |
| 免費額度 | $5/月 + 500 小時 | 750 小時/月 |
| 部署速度 | 非常快 | 中等 |
| 設定複雜度 | 簡單 | 中等 |
| Webhook 穩定性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ (休眠影響) |

**結論**: Railway 更適合 LINE Webhook（不會遺漏訊息）

---

## 🚀 部署步驟

### 步驟 1: 準備專案

#### 1.1 確認專案結構
```
line-crm-frontend/
├── server/           # Express 後端
│   ├── index.js
│   └── routes/
├── dist/            # Vite 打包後的前端（部署時生成）
├── package.json
├── .env             # 本地開發用（不上傳）
└── railway.json     # Railway 設定（即將建立）
```

#### 1.2 確認 package.json scripts
已有的 scripts：
```json
{
  "start": "NODE_ENV=production node server/index.js",
  "build": "vite build"
}
```

✅ 已正確設定！

---

### 步驟 2: 建立 Railway 專案

#### 2.1 註冊 Railway
1. 訪問 https://railway.app/
2. 使用 GitHub 登入
3. 驗證 Email

#### 2.2 連接 GitHub Repository
1. Railway Dashboard → "New Project"
2. 選擇 "Deploy from GitHub repo"
3. 授權 Railway 存取你的 GitHub
4. 選擇 `line-crm-frontend` repository

#### 2.3 Railway 會自動偵測
- ✅ Node.js 專案
- ✅ 自動執行 `npm install`
- ✅ 自動執行 `npm run build`（如果有）
- ✅ 執行 `npm start`

---

### 步驟 3: 設定環境變數

在 Railway Dashboard → 你的專案 → Variables：

```bash
# LINE Bot 設定
LINE_CHANNEL_ACCESS_TOKEN=你的_CHANNEL_ACCESS_TOKEN
LINE_CHANNEL_SECRET=你的_CHANNEL_SECRET

# Supabase 設定（新的公司帳號）
VITE_SUPABASE_URL=https://你的新專案.supabase.co
VITE_SUPABASE_ANON_KEY=你的新專案_ANON_KEY
VITE_SUPABASE_SERVICE_KEY=你的新專案_SERVICE_KEY

# 伺服器設定
PORT=3000
NODE_ENV=production

# 系統限制
MAX_MESSAGES=1000
MAX_USERS=100
```

**⚠️ 注意**: Railway 會自動分配 `PORT`，通常是 3000 或隨機埠號

---

### 步驟 4: 設定建置與啟動命令

#### 4.1 建立 `railway.json`
Railway 設定檔（可選，使用預設值即可）：

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### 4.2 或在 Railway Dashboard 手動設定

Settings → Build & Deploy：
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Watch Paths**: `/` (監控所有檔案變更)

---

### 步驟 5: 部署

#### 5.1 自動部署
推送到 GitHub main 分支會自動觸發部署：
```bash
git add .
git commit -m "Deploy to Railway"
git push origin main
```

#### 5.2 手動部署
Railway Dashboard → Deployments → "Deploy"

#### 5.3 查看部署狀態
- ✅ Building...
- ✅ Deploying...
- ✅ Running

#### 5.4 取得專案 URL
部署成功後，Railway 會提供 URL：
```
https://你的專案名稱.railway.app
```

---

### 步驟 6: 設定 LINE Webhook

#### 6.1 複製 Railway URL
```
https://你的專案名稱.railway.app
```

#### 6.2 更新 LINE Developers Console
1. 訪問 https://developers.line.biz/console/
2. 選擇你的 Channel
3. Messaging API → Webhook settings
4. Webhook URL: 
   ```
   https://你的專案名稱.railway.app/webhook
   ```
5. 點擊 "Verify" 驗證
6. 啟用 "Use webhook"

---

### 步驟 7: 測試

#### 7.1 測試健康檢查
```bash
curl https://你的專案名稱.railway.app/api/health
```

應該返回：
```json
{
  "status": "ok",
  "timestamp": "2025-11-06T...",
  "uptime": 123
}
```

#### 7.2 測試 Webhook
發送 LINE 訊息到機器人，檢查：
- Railway Logs → 應該看到 Webhook 請求
- Supabase → messages 表應該有新訊息

#### 7.3 測試前端
訪問 `https://你的專案名稱.railway.app`

應該看到 CRM 系統前端

---

## 🔧 進階設定

### 自訂網域（可選）

#### 在 Railway 設定
1. Settings → Domains
2. 點擊 "Add Custom Domain"
3. 輸入你的網域（例如：crm.yourcompany.com）
4. 在 DNS 設定 CNAME 記錄：
   ```
   crm.yourcompany.com → 你的專案名稱.railway.app
   ```

### 自動擴展（可選）

Railway 會自動根據流量擴展，無需設定。

### 日誌查看

Railway Dashboard → Deployments → 點擊部署 → View Logs

可看到：
- 建置日誌
- 應用程式日誌
- 錯誤日誌

---

## 📊 監控與除錯

### 即時日誌
```bash
# Railway CLI（可選）
npm install -g @railway/cli
railway login
railway logs
```

### 查看指標
Railway Dashboard → Metrics：
- CPU 使用率
- 記憶體使用率
- 網路流量
- 請求數

### 常見問題

#### Q1: 部署失敗
**檢查**：
- Build logs 中的錯誤訊息
- package.json 的 scripts 是否正確
- Node.js 版本是否相容

**解決**：
```json
// package.json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### Q2: 應用程式無法啟動
**檢查**：
- 環境變數是否設定正確
- PORT 是否使用 `process.env.PORT`
- Start command 是否正確

**解決**：
```javascript
// server/index.js
const PORT = process.env.PORT || 3002
```

#### Q3: LINE Webhook 驗證失敗
**檢查**：
- Webhook URL 是否正確（要加 `/webhook`）
- LINE_CHANNEL_SECRET 是否正確
- Railway 應用程式是否正在運行

#### Q4: 前端無法載入
**檢查**：
- `npm run build` 是否成功
- `dist/` 目錄是否存在
- server/index.js 的靜態檔案路徑是否正確

---

## 💰 費用估算

### Railway 免費額度
- $5 美元免費額度/月
- 500 小時執行時間
- 100 GB 出站流量

### 預估費用（小型專案）
- 應用程式運行：~$1-2/月
- 資料庫（Supabase 免費）：$0
- 總計：~$1-2/月

**足夠用於**：
- < 1000 位用戶
- < 10000 則訊息/月
- 中小型企業使用

---

## 🔄 從 Render 遷移

### 1. 保留 Render 作為備份（建議）
先不要刪除 Render，讓兩個服務並行運行 1-2 天

### 2. 切換 Webhook
LINE Developers Console → 將 Webhook URL 改為 Railway

### 3. 監控 Railway
觀察 1-2 天，確認穩定後再關閉 Render

### 4. 關閉 Render
Render Dashboard → 你的服務 → Settings → Delete Service

---

## 📋 部署檢查清單

### 部署前
- [ ] 程式碼已推送到 GitHub
- [ ] package.json scripts 正確
- [ ] .env 包含所有必要變數（本地測試用）
- [ ] 前端已測試（`npm run build` 成功）
- [ ] 後端已測試（`npm run dev:server` 成功）

### Railway 設定
- [ ] Railway 專案已建立
- [ ] GitHub repository 已連接
- [ ] 環境變數已設定（11 個）
- [ ] Build command: `npm install && npm run build`
- [ ] Start command: `npm start`

### 部署後
- [ ] 部署狀態為 "Running"
- [ ] 健康檢查成功（/api/health）
- [ ] LINE Webhook 驗證成功
- [ ] 發送測試訊息成功
- [ ] 前端可正常訪問
- [ ] Supabase 連接正常

### LINE Bot 設定
- [ ] Webhook URL 已更新
- [ ] Webhook 已驗證
- [ ] "Use webhook" 已啟用
- [ ] 測試訊息接收成功

---

## 🎯 最佳實踐

### 1. 使用環境變數
❌ 不要將敏感資訊寫入程式碼
✅ 所有設定都使用環境變數

### 2. 監控日誌
定期檢查 Railway Logs，及早發現問題

### 3. 設定告警（可選）
Railway → Settings → Notifications
設定部署失敗或應用程式崩潰的告警

### 4. 版本控制
使用 Git tags 標記每次部署：
```bash
git tag v1.0.0
git push origin v1.0.0
```

### 5. 回滾機制
Railway 支援一鍵回滾到上一個版本：
Deployments → 選擇舊版本 → Redeploy

---

## 📞 支援

- Railway 文件: https://docs.railway.app/
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app/

---

## 🎉 完成！

部署成功後，你的 LINE CRM 系統將：
- ✅ 24/7 運行，無休眠
- ✅ 不會遺漏 LINE 訊息
- ✅ 快速回應 Webhook
- ✅ 自動擴展以應對流量
- ✅ 享受 Railway 的高可用性
