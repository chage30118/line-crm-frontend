/**
 * 部署前檢查腳本
 * 
 * 檢查項目：
 * 1. 必要的環境變數
 * 2. package.json 設定
 * 3. 建置測試
 * 4. 檔案結構
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('=' .repeat(70))
console.log('🔍 Railway 部署前檢查')
console.log('=' .repeat(70))
console.log()

let hasErrors = false
let hasWarnings = false

// ============================================
// 1. 檢查 package.json
// ============================================

console.log('1️⃣  檢查 package.json...')

const packageJsonPath = path.join(__dirname, '../package.json')
if (!fs.existsSync(packageJsonPath)) {
  console.error('   ❌ package.json 不存在')
  hasErrors = true
} else {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
  
  // 檢查必要的 scripts
  const requiredScripts = {
    'build': 'vite build',
    'start': 'NODE_ENV=production node server/index.js'
  }
  
  for (const [script, expectedCommand] of Object.entries(requiredScripts)) {
    if (!packageJson.scripts[script]) {
      console.error(`   ❌ 缺少 script: ${script}`)
      hasErrors = true
    } else if (packageJson.scripts[script] !== expectedCommand) {
      console.warn(`   ⚠️  script "${script}" 與預期不同`)
      console.warn(`      預期: ${expectedCommand}`)
      console.warn(`      實際: ${packageJson.scripts[script]}`)
      hasWarnings = true
    } else {
      console.log(`   ✅ script "${script}" 正確`)
    }
  }
  
  // 檢查 Node.js 版本
  if (packageJson.engines && packageJson.engines.node) {
    console.log(`   ✅ Node.js 版本要求: ${packageJson.engines.node}`)
  } else {
    console.warn('   ⚠️  未指定 Node.js 版本，建議新增:')
    console.warn('      "engines": { "node": ">=18.0.0" }')
    hasWarnings = true
  }
}

console.log()

// ============================================
// 2. 檢查檔案結構
// ============================================

console.log('2️⃣  檢查檔案結構...')

const requiredFiles = [
  'server/index.js',
  'server/routes/health.js',
  'server/routes/users.js',
  'server/routes/webhook.js',
  'railway.json',
  '.env'
]

for (const file of requiredFiles) {
  const filePath = path.join(__dirname, '..', file)
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`)
  } else {
    if (file === '.env') {
      console.warn(`   ⚠️  ${file} 不存在（生產環境會使用 Railway 的環境變數）`)
      hasWarnings = true
    } else {
      console.error(`   ❌ ${file} 不存在`)
      hasErrors = true
    }
  }
}

console.log()

// ============================================
// 3. 檢查環境變數（從 .env）
// ============================================

console.log('3️⃣  檢查環境變數範本...')

const envPath = path.join(__dirname, '../.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  
  const requiredEnvVars = [
    'LINE_CHANNEL_ACCESS_TOKEN',
    'LINE_CHANNEL_SECRET',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_SUPABASE_SERVICE_KEY',
    'PORT',
    'NODE_ENV'
  ]
  
  for (const envVar of requiredEnvVars) {
    if (envContent.includes(envVar)) {
      console.log(`   ✅ ${envVar}`)
    } else {
      console.error(`   ❌ 缺少環境變數: ${envVar}`)
      hasErrors = true
    }
  }
  
  console.log()
  console.log('   ⚠️  提醒: 部署到 Railway 時需要在 Dashboard 設定這些環境變數')
} else {
  console.warn('   ⚠️  .env 不存在，確保 Railway 已設定所有環境變數')
  hasWarnings = true
}

console.log()

// ============================================
// 4. 檢查 railway.json
// ============================================

console.log('4️⃣  檢查 railway.json...')

const railwayJsonPath = path.join(__dirname, '../railway.json')
if (fs.existsSync(railwayJsonPath)) {
  const railwayJson = JSON.parse(fs.readFileSync(railwayJsonPath, 'utf-8'))
  
  if (railwayJson.build && railwayJson.build.buildCommand) {
    console.log(`   ✅ Build command: ${railwayJson.build.buildCommand}`)
  } else {
    console.warn('   ⚠️  未設定 build command')
    hasWarnings = true
  }
  
  if (railwayJson.deploy && railwayJson.deploy.startCommand) {
    console.log(`   ✅ Start command: ${railwayJson.deploy.startCommand}`)
  } else {
    console.warn('   ⚠️  未設定 start command')
    hasWarnings = true
  }
} else {
  console.warn('   ⚠️  railway.json 不存在（Railway 會使用預設設定）')
  hasWarnings = true
}

console.log()

// ============================================
// 5. 檢查 .gitignore
// ============================================

console.log('5️⃣  檢查 .gitignore...')

const gitignorePath = path.join(__dirname, '../.gitignore')
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8')
  
  const shouldIgnore = ['.env', 'node_modules', 'dist']
  let allCorrect = true
  
  for (const item of shouldIgnore) {
    if (gitignoreContent.includes(item)) {
      console.log(`   ✅ 已忽略 ${item}`)
    } else {
      console.error(`   ❌ 未忽略 ${item}（可能會上傳敏感資訊）`)
      hasErrors = true
      allCorrect = false
    }
  }
  
  if (allCorrect) {
    console.log('   ✅ .gitignore 設定正確')
  }
} else {
  console.error('   ❌ .gitignore 不存在')
  hasErrors = true
}

console.log()

// ============================================
// 6. 檢查 Git 狀態
// ============================================

console.log('6️⃣  檢查 Git 狀態...')

import { execSync } from 'child_process'

try {
  // 檢查是否有未提交的變更
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' })
  
  if (gitStatus.trim() === '') {
    console.log('   ✅ 所有變更已提交')
  } else {
    console.warn('   ⚠️  有未提交的變更:')
    console.warn(gitStatus)
    hasWarnings = true
  }
  
  // 檢查當前分支
  const currentBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim()
  console.log(`   ✅ 當前分支: ${currentBranch}`)
  
  if (currentBranch !== 'main' && currentBranch !== 'master') {
    console.warn(`   ⚠️  不在 main/master 分支，確認要部署此分支嗎？`)
    hasWarnings = true
  }
  
} catch (error) {
  console.warn('   ⚠️  無法檢查 Git 狀態（可能不是 Git repository）')
  hasWarnings = true
}

console.log()

// ============================================
// 總結
// ============================================

console.log('=' .repeat(70))
console.log('📊 檢查總結')
console.log('=' .repeat(70))

if (!hasErrors && !hasWarnings) {
  console.log('✅ 所有檢查通過！可以部署到 Railway')
  console.log()
  console.log('下一步:')
  console.log('  1. 推送程式碼到 GitHub: git push origin main')
  console.log('  2. 在 Railway 建立新專案')
  console.log('  3. 連接 GitHub repository')
  console.log('  4. 設定環境變數')
  console.log('  5. 部署！')
} else if (hasErrors) {
  console.log('❌ 發現錯誤，請修正後再部署')
  process.exit(1)
} else if (hasWarnings) {
  console.log('⚠️  有警告訊息，建議檢查後再部署')
  console.log()
  console.log('可以繼續部署，但請注意上述警告')
}

console.log('=' .repeat(70))
