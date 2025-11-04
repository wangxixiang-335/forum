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
  signature: string | null
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
      console.log('开始初始化认证状态...')
      
      // 检查是否使用默认配置
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (!supabaseUrl || supabaseUrl.includes('default.supabase.co')) {
        console.log('使用默认Supabase配置，创建模拟用户')
        // 创建模拟用户用于开发
        user.value = {
          id: 'dev-user-id',
          email: 'dev@example.com',
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
        
        console.log('开发模式认证初始化完成')
        return
      }
      
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('获取session失败:', error)
        return
      }
      
      if (session?.user) {
        console.log('找到有效session，用户ID:', session.user.id)
        user.value = session.user
        await fetchProfile()
        console.log('认证初始化完成')
      } else {
        console.log('未找到有效session')
      }
    } catch (error) {
      console.warn('认证初始化失败:', error)
    }
  }

  // 获取用户资料
  const fetchProfile = async () => {
    if (!user.value) {
      console.warn('fetchProfile: 用户未登录')
      return
    }
    
    try {
      // 检查是否使用默认配置
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey || 
          supabaseUrl.includes('default.supabase.co') || 
          supabaseKey.includes('default')) {
        // 开发模式：使用模拟资料
        console.log('使用开发模式模拟资料')
        profile.value = {
          id: user.value.id,
          username: user.value.user_metadata?.username || 'user',
          avatar_url: null,
          level: 1,
          experience_points: 25,
          signature: null,
          created_at: new Date().toISOString()
        }
        return
      }
      
      // 真实环境：尝试获取资料，如果不存在则自动创建
      const profileResult = await ensureProfileExists(user.value)
      
      if (profileResult.success && profileResult.profile) {
        profile.value = profileResult.profile
        console.log('✅ 用户资料获取/创建成功')
      } else {
        console.warn('⚠️ 用户资料获取失败，使用默认资料:', profileResult.error)
        
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
          signature: null,
          created_at: new Date().toISOString()
        }
      }
      
    } catch (error: any) {
      console.error('❌ 获取用户资料失败:', error)
      
      // 出错时使用默认资料，确保不会因为资料加载失败而阻塞页面
      profile.value = {
        id: user.value.id,
        username: user.value.email?.split('@')[0] || user.value.user_metadata?.username || 'user',
        avatar_url: null,
        level: 1,
        experience_points: 0,
        signature: null,
        created_at: new Date().toISOString()
      }
      
      // 不抛出错误，让页面继续加载
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
          signature: null,
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
            signature: null,
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

  // 更新用户经验值
  const updateExperience = async (points: number) => {
    if (!profile.value) return
    
    try {
      // 更新本地状态
      profile.value.experience_points += points
      
      // 检查是否需要升级
      const currentLevel = profile.value.level
      
      // 论坛等级经验表
      const getLevelExpRequired = (level: number) => {
        const expTable = [
          0,    // Lv.1
          50,   // Lv.2 - 新手
          150,  // Lv.3 - 初级
          300,  // Lv.4 - 中级
          500,  // Lv.5 - 高级
          800,  // Lv.6 - 资深
          1200, // Lv.7 - 专家
          1800, // Lv.8 - 大师
          2500, // Lv.9 - 宗师
          3500, // Lv.10 - 传奇
          5000, // Lv.11 - 史诗
          7000, // Lv.12 - 神话
          10000 // Lv.13 - 至尊
        ]
        
        if (level <= 1) return 0
        if (level >= expTable.length) {
          const baseExp = expTable[expTable.length - 1]
          const extraLevels = level - expTable.length + 1
          return baseExp + extraLevels * 2000
        }
        
        return expTable[level - 1]
      }
      
      const newLevelExp = getLevelExpRequired(currentLevel + 1)
      
      if (profile.value.experience_points >= newLevelExp) {
        profile.value.level += 1
        console.log(`🎉 恭喜升级！当前等级: Lv.${profile.value.level}`)
      }
      
      // 同步到数据库
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey || 
          supabaseUrl.includes('default.supabase.co') || 
          supabaseKey.includes('default')) {
        // 开发模式下只更新本地状态
        console.log('开发模式：经验值已更新到本地状态')
        return
      }
      
      // 生产环境下同步到数据库
      await supabase
        .from('profiles')
        .update({
          experience_points: profile.value.experience_points,
          level: profile.value.level,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.value.id)
      
    } catch (error) {
      console.error('更新经验值失败:', error)
      // 如果数据库更新失败，回滚本地状态
      profile.value.experience_points -= points
      if (profile.value.level > 1) {
        profile.value.level -= 1
      }
    }
  }

  // 更新个性签名
  const updateSignature = async (signature: string) => {
    if (!profile.value) return
    
    try {
      // 更新本地状态
      profile.value.signature = signature
      
      // 同步到数据库
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey || 
          supabaseUrl.includes('default.supabase.co') || 
          supabaseKey.includes('default')) {
        // 开发模式下只更新本地状态
        console.log('开发模式：个性签名已更新到本地状态')
        localStorage.setItem('userSignature', signature)
        return
      }
      
      // 生产环境下同步到数据库
      await supabase
        .from('profiles')
        .update({
          signature: signature,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.value.id)
      
      localStorage.setItem('userSignature', signature)
      
    } catch (error) {
      console.error('更新个性签名失败:', error)
      // 如果数据库更新失败，回滚本地状态
      if (profile.value) {
        profile.value.signature = profile.value.signature || null
      }
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
    console.log('🔐 认证状态变化:', event, session?.user?.id)
    
    if (event === 'SIGNED_IN' && session?.user) {
      console.log('✅ 用户登录成功，设置用户信息')
      user.value = session.user
      await fetchProfile()
    } else if (event === 'SIGNED_OUT') {
      console.log('👋 用户登出，清除用户信息')
      user.value = null
      profile.value = null
    } else if (event === 'TOKEN_REFRESHED') {
      console.log('🔄 令牌已刷新')
      // 不要在这里刷新页面
    } else if (event === 'USER_UPDATED') {
      console.log('👤 用户信息已更新')
      // 不要在这里刷新页面
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
    fetchProfile,
    updateExperience,
    updateSignature
  }
})