import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 检查是否使用默认配置
const isDefaultConfig = !supabaseUrl || supabaseUrl.includes('default.supabase.co')

// 开发模式下提供默认值，避免应用崩溃
const defaultUrl = 'https://default.supabase.co'
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmF1bHQiLCJpYXQiOjE2ODAwMDAwMDAsImV4cCI6MTk5NTU3NjAwMH0.default'

// 创建Supabase客户端，添加开发模式支持
export const supabase = createClient<Database>(
  supabaseUrl || defaultUrl,
  supabaseAnonKey || defaultKey,
  {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'forum-connector'
    }
  }
})

// 请求拦截器 - 添加认证token
supabase.realtime.setAuth = (token: string) => {
  supabase.realtime.accessToken = token
}

// 错误处理中间件
export const handleSupabaseError = (error: any) => {
  console.error('Supabase错误:', error)
  
  if (error.code === 'PGRST116') {
    // 认证错误
    return { success: false, message: '认证失败，请重新登录', code: error.code }
  } else if (error.code === 'PGRST123') {
    // 权限错误
    return { success: false, message: '权限不足', code: error.code }
  } else if (error.code === 'PGRST301') {
    // 网络错误
    return { success: false, message: '网络连接异常，请检查网络', code: error.code }
  } else {
    // 其他错误
    return { success: false, message: error.message || '操作失败', code: error.code }
  }
}

// 重试机制
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 2,
  delay = 1000
): Promise<T> => {
  let lastError: any
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      
      // 认证错误不重试
      if (error.code === 'PGRST116') {
        throw error
      }
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)))
      }
    }
  }
  
  throw lastError
}