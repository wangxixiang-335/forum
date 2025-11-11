/**
 * Storage事件同步测试工具
 * 用于验证多个标签页之间的认证状态同步
 */

import { useAuthStore } from '@/stores/auth'

/**
 * 测试storage事件监听
 */
export const testStorageSync = () => {
  console.log('🧪 开始测试storage事件同步...')
  
  // 创建测试事件
  const testEvent = new StorageEvent('storage', {
    key: 'sb-bkintupjzbcjiqvzricz-auth-token',
    oldValue: null,
    newValue: 'test-value',
    storageArea: localStorage,
    url: window.location.href
  })
  
  // 触发测试事件
  window.dispatchEvent(testEvent)
  
  console.log('✅ 测试事件已触发')
}

/**
 * 模拟其他标签页的登录操作
 */
export const simulateOtherTabLogin = () => {
  console.log('🧪 模拟其他标签页登录...')
  
  // 设置一个模拟的认证token
  localStorage.setItem('sb-bkintupjzbcjiqvzricz-auth-token', 'mock-auth-token-' + Date.now())
  
  // 触发storage事件
  const event = new StorageEvent('storage', {
    key: 'sb-bkintupjzbcjiqvzricz-auth-token',
    oldValue: null,
    newValue: 'mock-auth-token',
    storageArea: localStorage,
    url: window.location.href
  })
  
  window.dispatchEvent(event)
  
  console.log('✅ 模拟登录事件已触发')
}

/**
 * 模拟其他标签页的登出操作
 */
export const simulateOtherTabLogout = () => {
  console.log('🧪 模拟其他标签页登出...')
  
  // 清除认证token
  localStorage.removeItem('sb-bkintupjzbcjiqvzricz-auth-token')
  
  // 触发storage事件
  const event = new StorageEvent('storage', {
    key: 'sb-bkintupjzbcjiqvzricz-auth-token',
    oldValue: 'mock-auth-token',
    newValue: null,
    storageArea: localStorage,
    url: window.location.href
  })
  
  window.dispatchEvent(event)
  
  console.log('✅ 模拟登出事件已触发')
}

/**
 * 检查当前认证状态
 */
export const checkAuthStatus = () => {
  const authStore = useAuthStore()
  const storedAuth = localStorage.getItem('sb-bkintupjzbcjiqvzricz-auth-token')
  
  console.log('🔍 当前认证状态检查:', {
    '本地用户状态': authStore.user ? '已登录' : '未登录',
    '存储的认证token': storedAuth ? '存在' : '不存在',
    '状态一致性': (authStore.user && storedAuth) || (!authStore.user && !storedAuth) ? '一致' : '不一致'
  })
  
  return {
    hasLocalUser: !!authStore.user,
    hasStoredAuth: !!storedAuth,
    isConsistent: (authStore.user && storedAuth) || (!authStore.user && !storedAuth)
  }
}

/**
 * 运行完整测试套件
 */
export const runStorageSyncTestSuite = async () => {
  console.log('🧪 ===== Storage同步测试套件开始 =====')
  
  // 1. 检查初始状态
  console.log('📊 步骤1: 检查初始认证状态')
  const initialStatus = checkAuthStatus()
  
  // 2. 模拟其他标签页登录
  console.log('\n📝 步骤2: 模拟其他标签页登录')
  simulateOtherTabLogin()
  
  // 等待同步完成
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // 3. 检查同步后的状态
  console.log('\n📊 步骤3: 检查同步后的认证状态')
  const afterLoginStatus = checkAuthStatus()
  
  // 4. 模拟其他标签页登出
  console.log('\n📝 步骤4: 模拟其他标签页登出')
  simulateOtherTabLogout()
  
  // 等待同步完成
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // 5. 检查最终状态
  console.log('\n📊 步骤5: 检查最终认证状态')
  const finalStatus = checkAuthStatus()
  
  console.log('\n✅ ===== 测试套件完成 =====')
  console.log('📈 测试结果摘要:', {
    '初始状态一致性': initialStatus.isConsistent,
    '登录后状态一致性': afterLoginStatus.isConsistent,
    '登出后状态一致性': finalStatus.isConsistent,
    '整体测试结果': initialStatus.isConsistent && afterLoginStatus.isConsistent && finalStatus.isConsistent ? '通过' : '失败'
  })
  
  return {
    initialStatus,
    afterLoginStatus,
    finalStatus,
    overallSuccess: initialStatus.isConsistent && afterLoginStatus.isConsistent && finalStatus.isConsistent
  }
}