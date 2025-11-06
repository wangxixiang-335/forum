import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 检查环境变量是否配置
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase环境变量未配置，请检查.env文件')
}

// 创建Supabase客户端，优化超时设置
export const supabase = createClient<Database>(
  supabaseUrl || 'https://bkintupjzbcjiqvzricz.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW50dXBqemJjamlxdnpyaWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYzNDEsImV4cCI6MjA3NzE4MjM0MX0.ZA6l95LSZ_x2DFfJGCcXMXLlRg9nOV7kNqEJUC7OG8o',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'X-Client-Info': 'forum-connector'
      },
      // 优化超时时间：根据内容长度动态调整
      fetch: (url, options = {}) => {
        const contentLength = options.body ? options.body.toString().length : 0
        let timeout = 15000 // 默认15秒
        
        if (contentLength > 5000) {
          timeout = 60000 // 超长内容60秒
        } else if (contentLength > 2000) {
          timeout = 45000 // 长内容45秒
        } else if (contentLength > 500) {
          timeout = 30000 // 中等内容30秒
        }
        
        console.log(`API请求超时设置: ${contentLength}字符 -> ${timeout}ms`)
        
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(timeout)
        })
      }
    },
    db: {
      schema: 'public'
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
)

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

// 连接测试方法
export const testConnection = async () => {
  const start = Date.now()
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('id')
      .limit(1)
    
    return {
      latency: Date.now() - start,
      status: error ? 'failed' : 'ok',
      error
    }
  } catch (e) {
    return {
      latency: Date.now() - start,
      status: 'failed',
      error: e
    }
  }
}

// 重试机制
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: any
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`第${attempt + 1}次重试执行操作...`)
      return await operation()
    } catch (error: any) {
      lastError = error
      
      // 认证错误不重试
      if (error.code === 'PGRST116') {
        throw error
      }
      
      // 超时错误增加重试延迟
      if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
        console.log(`检测到超时错误，增加重试延迟: ${delay * Math.pow(2, attempt)}ms`)
      }
      
      if (attempt < maxRetries) {
        const retryDelay = delay * Math.pow(2, attempt)
        console.log(`操作失败，${retryDelay}ms后重试...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
  }
  
  console.log(`所有重试尝试失败，最终错误:`, lastError)
  throw lastError
}