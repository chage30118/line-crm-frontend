/**
 * 測試後端 API 是否正常運作
 */

const BASE_URL = 'http://localhost:3002'

async function testAPI() {
  console.log('🧪 開始測試後端 API...\n')

  // 測試 1: 健康檢查
  console.log('1️⃣ 測試健康檢查...')
  try {
    const response = await fetch(`${BASE_URL}/api/health`)
    const data = await response.json()
    console.log('✅ 健康檢查成功:', data)
  } catch (error) {
    console.error('❌ 健康檢查失敗:', error.message)
  }

  console.log('\n' + '='.repeat(50) + '\n')

  // 測試 2: 刷新用戶頭像（需要有真實用戶 ID）
  console.log('2️⃣ 測試刷新用戶頭像 (user_id = 1)...')
  try {
    const response = await fetch(`${BASE_URL}/api/users/1/refresh-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ 刷新成功:', {
        user_id: data.user?.id,
        display_name: data.user?.display_name,
        picture_url: data.user?.picture_url?.substring(0, 50) + '...'
      })
    } else {
      console.log('⚠️  刷新失敗（可能用戶不存在）:', data.error)
    }
  } catch (error) {
    console.error('❌ 請求失敗:', error.message)
  }

  console.log('\n' + '='.repeat(50) + '\n')
  console.log('✨ 測試完成！')
}

// 檢查伺服器是否啟動
async function checkServer() {
  try {
    await fetch(`${BASE_URL}/api/health`)
    return true
  } catch {
    return false
  }
}

async function main() {
  const isRunning = await checkServer()
  
  if (!isRunning) {
    console.error('❌ 後端伺服器未啟動！')
    console.log('\n請先執行:')
    console.log('  npm run dev:server')
    console.log('\n或:')
    console.log('  npm run dev:all\n')
    process.exit(1)
  }

  await testAPI()
}

main()
