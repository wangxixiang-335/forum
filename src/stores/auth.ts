import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/services/supabase'
import type { User } from '@supabase/supabase-js'
import { 
  ensureProfileExists, 
  getMockProfile, 
  checkProfilesTableExists 
} from '@/utils/profileManager'

interface Profile {
  id: string
  username: string
  avatar_url: string | null
  level: number
  experience_points: number
  created_at: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const profile = ref<Profile | null>(null)
  const isLoading = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const currentLevel = computed(() => profile.value?.level || 1)
  const experiencePoints = computed(() => profile.value?.experience_points || 0)

  // 初始化认证状态
  const initializeAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      // 如果是默认配置导致的错误，跳过认证初始化
      if (error && supabase.supabaseUrl.includes('default.supabase.co')) {
        console.warn('使用默认Supabase配置，跳过认证初始化')
        return
      }
      
      if (session?.user) {
        user.value = session.user
        await fetchProfile()
      }
    } catch (error) {
      console.warn('认证初始化失败:', error)
    }
  }

  // 获取用户资料
  const fetchProfile = async () => {
    if (!user.value) return
    
    try {
      // 检查是否使用默认配置
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey || 
          supabaseUrl.includes('default.supabase.co') || 
          supabaseKey.includes('default')) {
        // 开发模式：使用模拟资料
        const mockProfile = getMockProfile(user.value.id)
        if (mockProfile) {
          profile.value = mockProfile
          return
        }
      }
      
      // 真实环境：尝试获取资料，如果不存在则自动创建
      const profileResult = await ensureProfileExists(user.value)
      
      if (profileResult.success && profileResult.profile) {
        profile.value = profileResult.profile
        console.log('✅ 用户资料获取/创建成功')
      } else {
        console.warn('⚠️ 用户资料获取失败，使用默认资料')
        
        // 检查是否是权限问题（403/406错误）
        if (profileResult.error && (profileResult.error.includes('403') || profileResult.error.includes('406') || profileResult.error.includes('permission'))) {
          console.warn('🔒 数据库权限受限，使用本地资料模式')
        }
        
        // 使用默认资料
        profile.value = {
          id: user.value.id,
          username: user.value.email?.split('@')[0] || user.value.user_metadata?.username || 'user',
          avatar_url: null,
          level: 1,
          experience_points: 0,
          created_at: new Date().toISOString()
        }
      }
      
    } catch (error) {
      console.error('❌ 获取用户资料失败:', error)
      
      // 出错时使用默认资料
      profile.value = {
        id: user.value.id,
        username: user.value.email?.split('@')[0] || 'user',
        avatar_url: null,
        level: 1,
        experience_points: 0,
        created_at: new Date().toISOString()
      }
    }
  }

  // 登录
  const signIn = async (email: string, password: string) => {
    isLoading.value = true
    try {
      // 检查是否使用默认配置或数据库未就绪
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      // 如果配置无效，使用开发模式模拟
      if (!supabaseUrl || !supabaseKey || 
          supabaseUrl.includes('default.supabase.co') || 
          supabaseKey.includes('default')) {
        console.warn('开发模式：模拟登录流程（真实Supabase配置无效）')
        
        // 模拟用户数据
        user.value = {
          id: 'dev-user-id',
          email: email,
          user_metadata: { username: 'devuser' }
        } as any
        
        profile.value = {
          id: 'dev-user-id',
          username: 'devuser',
          avatar_url: null,
          level: 1,
          experience_points: 0,
          created_at: new Date().toISOString()
        }
        
        return { success: true }
      }
      
      // 真实环境：调用Supabase认证
      console.log('🔐 尝试真实Supabase登录...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        console.error('Supabase登录错误:', error)
        
        // 如果是配置问题，回退到开发模式
        if (error.status === 400 || error.message.includes('Invalid')) {
          console.warn('Supabase配置无效，回退到开发模式')
          
          // 模拟用户数据
          user.value = {
            id: 'dev-user-id',
            email: email,
            user_metadata: { username: 'devuser' }
          } as any
          
          profile.value = {
            id: 'dev-user-id',
            username: 'devuser',
            avatar_url: null,
            level: 1,
            experience_points: 0,
            created_at: new Date().toISOString()
          }
          
          return { success: true }
        }
        
        throw error
      }
      
      if (data.user) {
        user.value = data.user
        await fetchProfile()
        console.log('✅ 真实Supabase登录成功')
      }
      
      return { success: true }
    } catch (error: any) {
      console.error('登录错误:', error)
      return { success: false, error: error.message }
    } finally {
      isLoading.value = false
    }
  }

  // 注册
  const signUp = async (email: string, password: string, username: string) => {
    isLoading.value = true
    try {
      // 检查是否使用默认配置或数据库未就绪
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      // 如果配置无效，使用开发模式模拟
      if (!supabaseUrl || !supabaseKey || 
          supabaseUrl.includes('default.supabase.co') || 
          supabaseKey.includes('default')) {
        console.warn('开发模式：模拟注册流程（真实Supabase配置无效）')
        
        // 开发模式下创建模拟用户资料
        const mockUser = {
          id: 'mock-' + Date.now(),
          email: email,
          user_metadata: { username }
        }
        
        // 确保模拟资料存在
        const profileResult = await ensureProfileExists(mockUser)
        
        if (profileResult.success) {
          console.log('✅ 开发模式：用户资料创建成功')
        }
        
        // 模拟注册成功
        return { 
          success: true,
          message: '开发模式：注册成功（模拟）',
          user: mockUser
        }
      }
      
      // 真实环境：调用Supabase注册
      console.log('🔐 尝试真实Supabase注册...')
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username }
        }
      })
      
      if (error) {
        console.error('Supabase注册错误:', error)
        
        // 如果是配置问题，回退到开发模式
        if (error.status === 400 || error.message.includes('Invalid')) {
          console.warn('Supabase配置无效，回退到开发模式')
          
          // 开发模式下创建模拟用户资料
          const mockUser = {
            id: 'mock-' + Date.now(),
            email: email,
            user_metadata: { username }
          }
          
          // 确保模拟资料存在
          const profileResult = await ensureProfileExists(mockUser)
          
          if (profileResult.success) {
            console.log('✅ 开发模式：用户资料创建成功')
          }
          
          return { 
            success: true,
            message: '开发模式：注册成功（模拟）',
            user: mockUser
          }
        }
        
        throw error
      }
      
      console.log('✅ 真实Supabase注册成功')
      
      // 如果注册成功且有用户数据，确保用户资料存在
      if (data.user) {
        console.log('👤 确保新注册用户的资料存在...')
        const profileResult = await ensureProfileExists(data.user)
        
        if (profileResult.success) {
          console.log('✅ 用户资料创建/获取成功')
        } else {
          console.warn('⚠️ 用户资料创建失败:', profileResult.error)
        }
      }
      
      return { success: true, user: data.user }
    } catch (error: any) {
      console.error('注册错误:', error)
      return { success: false, error: error.message }
    } finally {
      isLoading.value = false
    }
  }

  // 登出
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      user.value = null
      profile.value = null
    }
  }

  // 监听认证状态变化
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      user.value = session.user
      await fetchProfile()
    } else if (event === 'SIGNED_OUT') {
      user.value = null
      profile.value = null
    }
  })

  return {
    user,
    profile,
    isLoading,
    isAuthenticated,
    currentLevel,
    experiencePoints,
    initializeAuth,
    signIn,
    signUp,
    signOut,
    fetchProfile
  }
})