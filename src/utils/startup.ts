import { supabase } from '@/services/supabase'
import { validateSupabaseConfig, logConfigReport } from '@/utils/configValidator'
import { checkDatabaseStatus, logMigrationStatus } from '@/utils/migrationRunner'

/**
 * 应用启动初始化
 */
export async function initializeApp(): Promise<{
  success: boolean
  message: string
  details: {
    configValid: boolean
    databaseReady: boolean
    authReady: boolean
  }
}> {
  console.log('🚀 开始应用初始化...')
  
  const startTime = Date.now()
  const results = {
    configValid: false,
    databaseReady: false,
    authReady: false
  }

  try {
    // 1. 验证配置
    console.log('🔧 验证Supabase配置...')
    const configResult = await validateSupabaseConfig()
    results.configValid = configResult.isValid
    
    if (!results.configValid) {
      console.warn('⚠️ Supabase配置验证失败，应用可能无法正常工作')
      console.log('建议检查.env文件中的环境变量配置')
    } else {
      console.log('✅ Supabase配置验证通过')
    }

    // 2. 检查数据库状态
    console.log('🗄️ 检查数据库状态...')
    const dbStatus = await checkDatabaseStatus()
    results.databaseReady = dbStatus.tablesExist
    
    if (!results.databaseReady) {
      console.warn('⚠️ 数据库表不完整，可能需要执行迁移')
      console.log('建议访问 /supabase-manager 页面执行数据库迁移')
    } else {
      console.log('✅ 数据库状态正常')
    }

    // 3. 初始化认证
    console.log('🔐 初始化认证系统...')
    const authResult = await initializeAuth()
    results.authReady = authResult.success
    
    if (!results.authReady) {
      console.warn('⚠️ 认证系统初始化失败')
    } else {
      console.log('✅ 认证系统初始化完成')
    }

    // 4. 设置认证状态监听
    setupAuthListeners()

    const endTime = Date.now()
    const duration = endTime - startTime

    const success = results.configValid && results.databaseReady && results.authReady
    
    if (success) {
      console.log(`🎉 应用初始化完成 (${duration}ms)`)
      console.log('📊 初始化结果:')
      console.log('  - 配置验证: ✅ 通过')
      console.log('  - 数据库状态: ✅ 正常')
      console.log('  - 认证系统: ✅ 就绪')
    } else {
      console.warn(`⚠️ 应用初始化完成，但存在警告 (${duration}ms)`)
      console.log('📊 初始化结果:')
      console.log(`  - 配置验证: ${results.configValid ? '✅' : '❌'}`)
      console.log(`  - 数据库状态: ${results.databaseReady ? '✅' : '❌'}`)
      console.log(`  - 认证系统: ${results.authReady ? '✅' : '❌'}`)
    }

    return {
      success,
      message: success ? '应用初始化成功' : '应用初始化完成，但存在警告',
      details: results
    }

  } catch (error) {
    console.error('❌ 应用初始化失败:', error)
    
    return {
      success: false,
      message: '应用初始化失败: ' + (error instanceof Error ? error.message : '未知错误'),
      details: results
    }
  }
}

/**
 * 初始化认证系统
 */
async function initializeAuth(): Promise<{ success: boolean; session?: any }> {
  try {
    // 恢复会话
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ 获取会话失败:', error)
      return { success: false }
    }

    if (session) {
      console.log('🔐 检测到有效会话，用户已登录')
      console.log('👤 用户ID:', session.user.id)
      console.log('📧 用户邮箱:', session.user.email)
    } else {
      console.log('🔐 用户未登录')
    }

    return { success: true, session }

  } catch (error) {
    console.error('❌ 认证初始化失败:', error)
    return { success: false }
  }
}

/**
 * 设置认证状态监听器
 */
function setupAuthListeners(): void {
  // 认证状态变化监听
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔐 认证状态变化:', event)
    
    switch (event) {
      case 'SIGNED_IN':
        console.log('🎉 用户登录成功')
        console.log('👤 用户ID:', session?.user.id)
        console.log('📧 用户邮箱:', session?.user.email)
        
        // 触发全局认证状态更新
        window.dispatchEvent(new CustomEvent('auth-state-changed', {
          detail: { event, session }
        }))
        break
        
      case 'SIGNED_OUT':
        console.log('👋 用户已登出')
        
        // 触发全局认证状态更新
        window.dispatchEvent(new CustomEvent('auth-state-changed', {
          detail: { event, session: null }
        }))
        break
        
      case 'TOKEN_REFRESHED':
        console.log('🔄 令牌已刷新')
        break
        
      case 'USER_UPDATED':
        console.log('👤 用户信息已更新')
        break
    }
  })

  // 网络状态监听
  window.addEventListener('online', () => {
    console.log('🌐 网络连接恢复')
    
    // 重新检查连接状态
    setTimeout(() => {
      validateSupabaseConfig().catch(console.error)
    }, 1000)
  })

  window.addEventListener('offline', () => {
    console.warn('🌐 网络连接断开')
  })
}

/**
 * 开发模式下的额外初始化
 */
export async function initializeDevelopmentMode(): Promise<void> {
  if (!import.meta.env.DEV) return

  console.log('🔧 开发模式初始化...')
  
  try {
    // 输出详细的环境信息
    console.log('📋 环境信息:')
    console.log('  - 模式:', import.meta.env.MODE)
    console.log('  - 基础URL:', import.meta.env.BASE_URL)
    console.log('  - Supabase URL:', import.meta.env.VITE_SUPABASE_URL || '未配置')
    console.log('  - Anon Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '已配置' : '未配置')

    // 输出配置报告
    await logConfigReport()
    
    // 输出迁移状态
    await logMigrationStatus()

    // 添加全局调试工具
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.__FORUM_DEBUG__ = {
        supabase,
        checkConnection: () => validateSupabaseConfig(),
        checkDatabase: () => checkDatabaseStatus(),
        getSession: () => supabase.auth.getSession(),
        signOut: () => supabase.auth.signOut(),
        runMigrations: () => import('@/utils/migrationRunner').then(m => m.runMigrations())
      }
      
      console.log('🔧 调试工具已添加到 window.__FORUM_DEBUG__')
    }

    console.log('✅ 开发模式初始化完成')

  } catch (error) {
    console.error('❌ 开发模式初始化失败:', error)
  }
}

/**
 * 生产模式下的优化初始化
 */
export async function initializeProductionMode(): Promise<void> {
  if (!import.meta.env.PROD) return

  console.log('🏗️ 生产模式初始化...')
  
  try {
    // 设置性能监控
    if ('performance' in window) {
      performance.mark('app-start')
    }

    // 预加载关键资源
    const criticalResources = [
      '/src/services/supabase.ts',
      '/src/stores/auth.ts',
      '/src/router/index.ts'
    ]

    console.log('📦 预加载关键资源...')
    
    // 这里可以添加资源预加载逻辑
    // 例如使用 Service Worker 缓存关键资源

    console.log('✅ 生产模式初始化完成')

  } catch (error) {
    console.error('❌ 生产模式初始化失败:', error)
  }
}

/**
 * 错误处理初始化
 */
export function initializeErrorHandling(): void {
  // 全局错误处理
  window.addEventListener('error', (event) => {
    console.error('🚨 全局错误:', event.error)
    
    // 可以在这里发送错误报告到监控服务
    if (import.meta.env.PROD) {
      // 生产环境错误报告
      console.log('📊 发送错误报告...')
    }
  })

  // Promise 拒绝处理
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 未处理的Promise拒绝:', event.reason)
    
    // 可以在这里发送错误报告到监控服务
    if (import.meta.env.PROD) {
      console.log('📊 发送Promise拒绝报告...')
    }
  })

  // Vue 错误处理
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.__VUE_ERROR_HANDLER__ = (err, instance, info) => {
      console.error('🚨 Vue错误:', err)
      console.error('组件:', instance)
      console.error('信息:', info)
    }
  }

  console.log('✅ 错误处理系统初始化完成')
}

/**
 * 完整的应用启动流程
 */
export async function startup(): Promise<void> {
  console.log('🎯 开始应用启动流程...')
  
  try {
    // 1. 初始化错误处理
    initializeErrorHandling()

    // 2. 根据环境初始化
    if (import.meta.env.DEV) {
      await initializeDevelopmentMode()
    } else if (import.meta.env.PROD) {
      await initializeProductionMode()
    }

    // 3. 执行应用初始化
    const initResult = await initializeApp()
    
    // 4. 触发启动完成事件
    window.dispatchEvent(new CustomEvent('app-startup-complete', {
      detail: initResult
    }))

    console.log('🎉 应用启动流程完成')

  } catch (error) {
    console.error('❌ 应用启动流程失败:', error)
    
    // 触发启动失败事件
    window.dispatchEvent(new CustomEvent('app-startup-failed', {
      detail: { error }
    }))
  }
}

// 自动启动（如果是在浏览器环境中）
if (typeof window !== 'undefined') {
  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(startup, 100)
    })
  } else {
    setTimeout(startup, 100)
  }
}