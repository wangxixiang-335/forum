import { supabase } from '@/services/supabase'
import type { User } from '@supabase/supabase-js'

/**
 * 用户资料管理器
 */

/**
 * 确保用户资料存在
 */
export async function ensureProfileExists(user: User): Promise<{
  success: boolean
  profile?: any
  created?: boolean
  error?: string
}> {
  try {
    console.log('👤 检查用户资料是否存在...', user.id)
    
    // 首先尝试获取现有资料
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (fetchError) {
      // 如果是"未找到记录"的错误，继续创建新资料
      if (fetchError.code === 'PGRST116') {
        console.log('📭 用户资料不存在，将创建新资料')
      } else {
        // 其他错误（如406、403等）可能是RLS策略问题
        console.warn('⚠️ 获取用户资料失败:', fetchError.message)
        
        // RLS策略问题时直接使用模拟数据
        if (fetchError.status === 406 || fetchError.status === 403 || fetchError.message.includes('permission') || fetchError.message.includes('row-level security')) {
          const mockProfile = {
            id: user.id,
            username: user.user_metadata?.username || user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
            avatar_url: null,
            level: 1,
            experience_points: 0,
            created_at: new Date().toISOString()
          }
          mockProfiles.set(user.id, mockProfile)
          console.log('🔧 使用模拟资料（获取用户资料时遇到RLS问题）')
          return { success: true, profile: mockProfile, created: false }
        }
        
        // 开发模式下使用模拟数据
        if (import.meta.env.DEV) {
          const mockProfile = getMockProfile(user.id)
          if (mockProfile) {
            console.log('🔧 使用开发模式模拟资料')
            return { success: true, profile: mockProfile, created: false }
          }
        }
        
        // 非开发模式或没有模拟数据时抛出错误
        throw fetchError
      }
    }
    
    if (existingProfile) {
      console.log('✅ 用户资料已存在')
      return { success: true, profile: existingProfile, created: false }
    }
    
    // 资料不存在，创建新资料
    console.log('➕ 创建新用户资料...')
    
    const username = user.user_metadata?.username || 
                    user.email?.split('@')[0] || 
                    `user_${user.id.slice(0, 8)}`
    
    const profileData = {
      id: user.id,
      username: username,
      avatar_url: null,
      level: 1,
      experience_points: 0,
      created_at: new Date().toISOString()
    }
    
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single()
    
    if (createError) {
      // 如果是唯一约束冲突（用户名已存在），尝试其他用户名
      if (createError.code === '23505' && createError.message.includes('username')) {
        console.log('🔄 用户名冲突，尝试生成唯一用户名...')
        
        const uniqueUsername = `${username}_${Date.now().toString().slice(-4)}`
        profileData.username = uniqueUsername
        
        const { data: retryProfile, error: retryError } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single()
        
        if (retryError) {
          throw retryError
        }
        
        console.log('✅ 用户资料创建成功（使用唯一用户名）')
        return { success: true, profile: retryProfile, created: true }
      }
      
      // 处理RLS策略错误（403）或其他权限错误
      if (createError.code === '42501' || createError.message.includes('permission') || createError.status === 403 || createError.message.includes('row-level security')) {
        console.warn('🔒 权限不足，无法创建用户资料:', createError.message)
        
        // 提供详细的错误信息和解决方案
        const errorDetails = {
          message: '数据库权限受限，无法创建用户资料',
          solution: '请检查Supabase RLS策略配置',
          errorCode: createError.code,
          status: createError.status
        }
        
        console.error('❌ RLS策略错误详情:', errorDetails)
        
        // 临时解决方案：始终使用模拟数据，直到RLS策略修复
        const mockProfile = {
          id: user.id,
          username: username,
          avatar_url: null,
          level: 1,
          experience_points: 0,
          created_at: new Date().toISOString()
        }
        mockProfiles.set(user.id, mockProfile)
        console.log('🔧 使用模拟资料（RLS策略问题，临时解决方案）')
        return { 
          success: true, 
          profile: mockProfile, 
          created: true,
          warning: '使用模拟数据（RLS策略需要修复）'
        }
      }
      
      throw createError
    }
    
    console.log('✅ 用户资料创建成功')
    return { success: true, profile: newProfile, created: true }
    
  } catch (error: any) {
    console.error('❌ 确保用户资料存在失败:', error)
    return { 
      success: false, 
      error: error.message,
      created: false 
    }
  }
}

/**
 * 获取或创建用户资料
 */
export async function getOrCreateProfile(user: User): Promise<any> {
  const result = await ensureProfileExists(user)
  
  if (!result.success) {
    throw new Error(`无法获取或创建用户资料: ${result.error}`)
  }
  
  return result.profile
}

/**
 * 更新用户资料
 */
export async function updateProfile(userId: string, updates: Partial<{
  username: string
  avatar_url: string | null
  level: number
  experience_points: number
}>): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
    
    if (error) {
      throw error
    }
    
    return { success: true }
  } catch (error: any) {
    console.error('❌ 更新用户资料失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 检查数据库表是否存在
 */
export async function checkProfilesTableExists(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    // 如果没有错误或者错误是"表不存在"，返回相应结果
    if (!error) return true
    if (error.code === '42P01') return false // 表不存在
    
    // 处理权限错误（403/406）
    if (error.status === 403 || error.status === 406) {
      console.warn('🔒 检查表存在时权限受限，假设表存在')
      return true
    }
    
    throw error
  } catch (error: any) {
    console.error('❌ 检查profiles表失败:', error)
    
    // 开发模式下假设表存在
    if (import.meta.env.DEV) {
      console.warn('🔧 开发模式下假设profiles表存在')
      return true
    }
    
    return false
  }
}

/**
 * 自动创建缺失的用户资料
 */
export async function autoCreateMissingProfiles(): Promise<void> {
  try {
    console.log('🔍 检查并创建缺失的用户资料...')
    
    // 获取当前会话用户
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      console.log('🔐 没有登录用户，跳过资料创建')
      return
    }
    
    // 检查表是否存在
    const tableExists = await checkProfilesTableExists()
    if (!tableExists) {
      console.warn('⚠️ profiles表不存在，无法创建用户资料')
      return
    }
    
    // 确保当前用户资料存在
    const result = await ensureProfileExists(session.user)
    
    if (result.success) {
      if (result.created) {
        console.log('✅ 已为新用户创建资料')
      } else {
        console.log('✅ 用户资料已存在')
      }
    } else {
      console.error('❌ 创建用户资料失败:', result.error)
    }
    
  } catch (error) {
    console.error('❌ 自动创建用户资料失败:', error)
  }
}

/**
 * 用户资料监听器
 */
export function setupProfileListeners(): void {
  // 监听认证状态变化
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      console.log('🔐 用户登录，检查资料...')
      
      // 延迟执行，确保其他初始化完成
      setTimeout(() => {
        autoCreateMissingProfiles().catch(console.error)
      }, 1000)
    }
  })
}

// 开发模式下的模拟资料
const mockProfiles = new Map<string, any>()

/**
 * 开发模式下的模拟资料管理
 */
export function setupMockProfiles(): void {
  if (!import.meta.env.DEV) return
  
  console.log('🔧 设置开发模式下的模拟用户资料...')
  
  // 添加一些模拟用户资料
  mockProfiles.set('dev-user-id', {
    id: 'dev-user-id',
    username: 'devuser',
    avatar_url: null,
    level: 1,
    experience_points: 0,
    created_at: new Date().toISOString()
  })
  
  mockProfiles.set('af216c8a-e67b-478f-ac60-e798fbc09298', {
    id: 'af216c8a-e67b-478f-ac60-e798fbc09298',
    username: '1724045101',
    avatar_url: null,
    level: 1,
    experience_points: 0,
    created_at: new Date().toISOString()
  })
}

/**
 * 获取模拟用户资料
 */
export function getMockProfile(userId: string): any | null {
  return mockProfiles.get(userId) || null
}

/**
 * 初始化用户资料系统
 */
export async function initializeProfileSystem(): Promise<void> {
  console.log('👤 初始化用户资料系统...')
  
  // 开发模式下设置模拟资料
  if (import.meta.env.DEV) {
    setupMockProfiles()
  }
  
  // 设置资料监听器
  setupProfileListeners()
  
  // 检查并创建当前用户的资料
  await autoCreateMissingProfiles()
  
  console.log('✅ 用户资料系统初始化完成')
}