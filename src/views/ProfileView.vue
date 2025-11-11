<template>
  <div class="profile">
    <header class="header">
      <div class="container">
        <div class="header-nav">
          <RouterLink to="/" class="back-link">← 返回首页</RouterLink>
          <nav class="nav" v-if="!isViewingOtherUser">
            <RouterLink to="/profile" class="nav-link active">个人中心</RouterLink>
            <RouterLink to="/bookmarks" class="nav-link">
              <i class="bi bi-bookmark"></i>
              收藏
            </RouterLink>
            <RouterLink to="/messages" class="nav-link">
              <i class="bi bi-envelope"></i>
              消息
            </RouterLink>
            <button @click="showAccountSettings = true" class="nav-link">
              <i class="bi bi-gear"></i>
              账号设置
            </button>
            <button @click="handleSignOut" class="nav-link signout-btn">
              <i class="bi bi-box-arrow-right"></i>
              退出
            </button>
          </nav>
        </div>
        <h1>{{ isViewingOtherUser ? '用户资料' : '个人中心' }}</h1>
      </div>
    </header>

    <main class="main">
      <div class="container">
        <div v-if="loading" class="loading">加载中...</div>
        
        <div v-else-if="profile" class="profile-content">
          <!-- 用户信息卡片 -->
          <div class="profile-card">
            <div class="profile-header">
              <div class="avatar-container" @click="!isViewingOtherUser && canChangeAvatar && (showAvatarSelector = true)">
                <UserAvatar 
                  :username="profile.username" 
                  :avatar-id="profile.avatar_url"
                  size="80px"
                />
                <div class="avatar-edit-hint" v-if="!isViewingOtherUser && canChangeAvatar">
                  <span>点击更换</span>
                </div>
                <div class="avatar-locked" v-else-if="!isViewingOtherUser">
                  <span>Lv.3 解锁</span>
                </div>
              </div>
              <div class="profile-info">
                <h2 class="username" :class="getLevelClass(profile.level)">
                  {{ profile.username }}
                  <span class="level-badge">Lv.{{ profile.level }} {{ getLevelName(profile.level) }}</span>
                </h2>
                <div class="signature-section" v-if="!isViewingOtherUser">
                  <div v-if="canEditSignature" class="signature-edit">
                    <input 
                      v-model="signatureInput"
                      @blur="updateSignature"
                      @keyup.enter="updateSignature"
                      placeholder="编辑你的个性签名..."
                      class="signature-input"
                      maxlength="50"
                    />
                    <div class="signature-hint">按回车或点击其他地方保存</div>
                  </div>
                  <div v-else-if="profile.signature" class="signature-display">
                    {{ profile.signature }}
                  </div>
                  <div v-else class="signature-locked">
                    <span>个性签名功能暂不可用</span>
                  </div>
                </div>
                <div v-else-if="profile.signature" class="signature-display">
                  {{ profile.signature }}
                </div>
                <p class="member-since">
                  注册时间：{{ formatDate(profile.created_at) }}
                </p>
              </div>
            </div>

            <!-- 经验值进度条 -->
            <div class="experience-section">
              <div class="exp-info">
                <span>经验值：{{ profile.experience_points || 0 }}</span>
                <span>下一等级：{{ (nextLevelExp - (profile.experience_points || 0)) > 0 ? (nextLevelExp - (profile.experience_points || 0)) + ' EXP' : '已满' }}</span>
                <button @click="debugExperience" class="debug-btn" title="调试经验值">
                  调试
                </button>
              </div>
              <div class="exp-progress">
                <div 
                  class="exp-bar" 
                  :style="{ width: expProgress + '%' }"
                ></div>
                <span class="exp-text">{{ expProgress }}%</span>
              </div>
              <div class="exp-debug">
                <button @click="addTestExperience" class="test-btn">
                  测试+10经验
                </button>
              </div>
            </div>

            

            <!-- 用户特权 -->
            <div class="privileges-section">
              <h3>当前特权</h3>
              <div class="privileges-list">
                <div 
                  v-for="privilege in currentPrivileges" 
                  :key="privilege.id"
                  class="privilege-item"
                >
                  <span class="privilege-icon">{{ privilege.icon }}</span>
                  <span class="privilege-name">{{ privilege.name }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 用户帖子 -->
          <div class="user-posts">
            <h3>我的帖子</h3>
            <div v-if="userPosts.length > 0" class="posts-list">
              <PostCard 
                v-for="post in userPosts" 
                :key="post.id" 
                :post="post"
                @like="handleLike"
                @comment="handleComment"
                @delete="handlePostDeleted"
              />
            </div>
            <div v-else class="no-posts">
              <p>还没有发布过帖子</p>
              <RouterLink to="/" class="btn-primary">去发布第一个帖子</RouterLink>
            </div>
          </div>
        </div>
        
        <div v-else class="error">
          <p>用户信息加载失败</p>
        </div>
      </div>
    </main>

    <!-- 头像选择器模态框 -->
    <div v-if="showAvatarSelector" class="modal-overlay" @click.self="showAvatarSelector = false">
      <div class="modal-content">
        <AvatarSelector 
          @close="showAvatarSelector = false"
          @select="handleAvatarSelect"
        />
      </div>
    </div>

    <!-- 账号设置模态框 -->
    <div v-if="showAccountSettings" class="modal-overlay" @click.self="showAccountSettings = false">
      <div class="modal-content">
        <div class="account-settings-modal">
          <div class="modal-header">
            <h3>账号设置</h3>
            <button @click="showAccountSettings = false" class="close-btn">×</button>
          </div>
          <div class="modal-body">
            <AccountSettings />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePostsStore } from '@/stores/posts'
import PostCard from '@/components/PostCard.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import AvatarSelector from '@/components/AvatarSelector.vue'
import AccountSettings from '@/components/AccountSettings.vue'
import type { Database } from '@/types/supabase'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const postsStore = usePostsStore()

// 检查是否是查看其他用户的资料
const isViewingOtherUser = computed(() => !!route.params.id)
const targetUserId = computed(() => route.params.id as string)

const loading = ref(true)
const userPosts = ref<Database['public']['Tables']['posts']['Row'][]>([])
const showAvatarSelector = ref(false)
const showAccountSettings = ref(false)

const profile = computed(() => {
  if (isViewingOtherUser.value) {
    return otherUserProfile.value
  }
  return authStore.profile
})

const otherUserProfile = ref<any>(null)
const signatureInput = ref('')

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
    // 超过表格范围，使用递增公式
    const baseExp = expTable[expTable.length - 1]
    const extraLevels = level - expTable.length + 1
    return baseExp + extraLevels * 2000
  }
  
  return expTable[level - 1]
}

// 计算下一等级所需经验值
const nextLevelExp = computed(() => {
  if (!profile.value) return 50
  const level = profile.value.level
  return getLevelExpRequired(level + 1)
})

// 计算当前等级所需经验值
const currentLevelExp = computed(() => {
  if (!profile.value) return 0
  const level = profile.value.level
  return getLevelExpRequired(level)
})

// 计算经验值进度
const expProgress = computed(() => {
  if (!profile.value) return 0
  
  const currentExp = profile.value.experience_points || 0
  const currentLevelReq = currentLevelExp.value
  const nextLevelReq = nextLevelExp.value
  
  console.log('计算经验进度:', {
    currentExp,
    currentLevelReq,
    nextLevelReq,
    level: profile.value.level
  })
  
  // 如果已经达到或超过下一等级要求，显示100%
  if (currentExp >= nextLevelReq) return 100
  
  // 按照你的要求：经验值 / (经验值 + 到下一等级所需经验值)
  const expNeededForNext = nextLevelReq - currentExp
  const totalExpForProgress = currentExp + expNeededForNext
  
  console.log('进度计算:', {
    expNeededForNext,
    totalExpForProgress
  })
  
  if (totalExpForProgress <= 0) return 0
  
  // 新的进度计算：当前经验值 / (当前经验值 + 到下一等级所需经验值)
  const progress = Math.floor((currentExp / totalExpForProgress) * 100)
  
  console.log('最终进度:', progress)
  
  // 确保进度在0-100之间
  return Math.max(0, Math.min(100, progress))
})

// 获取等级名称
const getLevelName = (level: number) => {
  const levelNames = [
    '新手', '初级', '中级', '高级', '资深',
    '专家', '大师', '宗师', '传奇', '史诗',
    '神话', '至尊'
  ]
  
  if (level <= 1) return '新手'
  if (level > levelNames.length) return '至尊'
  return levelNames[level - 1]
}

// 检查是否可以更换头像
const canChangeAvatar = computed(() => {
  const level = profile.value?.level || 1
  return level >= 3
})

// 检查是否可以编辑个性签名
const canEditSignature = computed(() => {
  const level = profile.value?.level || 1
  return level >= 1  // 临时设置为1级，方便测试
})



// 当前特权列表
const currentPrivileges = computed(() => {
  const level = profile.value?.level || 1
  const privileges = []

  // 基础特权
  privileges.push({ id: 'basic', name: '发帖、评论、点赞', icon: '📝' })

  if (level >= 3) {
    privileges.push({ id: 'avatar', name: '自定义头像', icon: '🖼️' })
  }

  if (level >= 5) {
    privileges.push({ id: 'signature', name: '个性签名', icon: '✍️' })
  }

  

  if (level >= 10) {
    privileges.push({ id: 'mod', name: '评论置顶权限', icon: '⭐' })
  }

  return privileges
})

onMounted(async () => {
  await loadUserData()
  // 初始化个性签名输入框
  if (profile.value?.signature) {
    signatureInput.value = profile.value.signature
  }
})

const loadUserData = async () => {
  console.log('开始加载用户数据...')
  loading.value = true
  
  try {
    if (isViewingOtherUser.value) {
      // 加载其他用户的资料
      console.log('加载其他用户资料，ID:', targetUserId.value)
      await loadOtherUserData()
    } else {
      // 加载当前用户的资料
      // 确保用户已登录
      if (!authStore.user) {
        console.warn('用户未登录，无法加载个人资料')
        loading.value = false
        return
      }
      
      console.log('用户已登录，ID:', authStore.user.id)
      
      // 加载用户资料，如果失败则使用默认值
      if (!authStore.profile) {
        console.log('用户资料为空，尝试获取...')
        try {
          console.log('调用fetchProfile...')
          await authStore.fetchProfile()
          console.log('fetchProfile完成')
        } catch (profileError) {
          console.warn('加载用户资料失败，使用默认值:', profileError)
          // 不抛出错误，继续加载用户帖子
        }
      } else {
        console.log('用户资料已存在:', authStore.profile)
      }
      
      // 加载用户帖子
      console.log('开始加载用户帖子...')
      await loadUserPosts()
      console.log('用户帖子加载完成')
    }
  } catch (error) {
    console.error('加载用户数据失败:', error)
  } finally {
    // 确保loading状态总是被设置为false
    console.log('设置loading为false')
    loading.value = false
  }
}

const loadUserPosts = async () => {
  if (!authStore.user) {
    console.warn('用户未登录，无法加载用户帖子')
    userPosts.value = []
    return
  }
  
  try {
    const result = await postsStore.fetchUserPosts(authStore.user.id)
    if (result.success) {
      userPosts.value = result.data || []
    } else {
      console.error('加载用户帖子失败:', result.error)
      userPosts.value = []
    }
  } catch (error) {
    console.error('加载用户帖子失败:', error)
    userPosts.value = []
  }
}

const handleLike = (postId: string) => {
  console.log('点赞帖子:', postId)
}

const handleComment = (postId: string) => {
  console.log('评论帖子:', postId)
}

const handlePostDeleted = (postId: string) => {
  // 帖子被删除，立即从UI中移除
  userPosts.value = userPosts.value.filter(post => post.id !== postId)
  console.log('帖子已从用户帖子列表中移除:', postId)
}

const handleAvatarSelect = async (avatar: any) => {
  try {
    // 先关闭模态框，避免DOM操作冲突
    showAvatarSelector.value = false
    
    // 更新本地存储
    localStorage.setItem('userAvatar', avatar.id)
    
    // 更新本地状态
    if (profile.value) {
      profile.value.avatar_url = avatar.id
    }
    
    // 更新到数据库
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey || 
        supabaseUrl.includes('default.supabase.co') || 
        supabaseKey.includes('default')) {
      // 开发模式下只更新本地状态
      console.log('开发模式：头像已更新到本地状态')
      return
    }
    
    // 生产环境下同步到数据库
    const { supabase } = await import('@/services/supabase')
    const { error } = await supabase
      .from('profiles')
      .update({
        avatar_url: avatar.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', authStore.user?.id)
    
    if (error) {
      console.error('更新头像失败:', error)
      // 回滚本地状态
      const previousAvatar = localStorage.getItem('userAvatar')
      if (profile.value) {
        profile.value.avatar_url = previousAvatar || null
      }
    } else {
      console.log('头像更新成功')
    }
  } catch (error) {
    console.error('更新头像失败:', error)
  }
}

// 加载其他用户数据
const loadOtherUserData = async () => {
  try {
    const { supabase } = await import('@/services/supabase')
    
    // 获取用户资料
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUserId.value)
      .single()
    
    if (profileError) {
      console.error('获取用户资料失败:', profileError)
      loading.value = false
      return
    }
    
    otherUserProfile.value = profileData
    console.log('其他用户资料加载成功:', profileData)
    
    // 获取用户帖子
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', targetUserId.value)
      .order('created_at', { ascending: false })
    
    if (postsError) {
      console.error('获取用户帖子失败:', postsError)
    } else {
      userPosts.value = postsData || []
    }
    
  } catch (error) {
    console.error('加载其他用户数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 登出处理函数
const handleSignOut = async () => {
  try {
    await authStore.signOut()
    console.log('✅ 用户已退出')
    // 登出后回到首页
    router.push('/')
  } catch (error) {
    console.error('退出失败:', error)
  }
}

// 工具函数
const getLevelClass = (level: number) => {
  if (level >= 10) return 'level-10-plus'
  if (level >= 7) return 'level-7-9'
  if (level >= 4) return 'level-4-6'
  return 'level-1-3'
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  
  return date.toLocaleDateString('zh-CN')
}

// 临时调试函数
const debugExperience = () => {
  if (profile.value) {
    console.log('Profile data:', profile.value)
    console.log('Experience points:', profile.value.experience_points)
    console.log('Level:', profile.value.level)
    console.log('Current level exp:', currentLevelExp.value)
    console.log('Next level exp:', nextLevelExp.value)
    console.log('Progress:', expProgress.value)
  }
}

// 测试添加经验值
const addTestExperience = async () => {
  await authStore.updateExperience(10)
  debugExperience()
}

const formatDate = (timestamp: string) => {
  if (!timestamp) return '未知时间'
  return new Date(timestamp).toLocaleDateString('zh-CN')
}



// 更新个性签名
const updateSignature = async () => {
  if (!canEditSignature.value || !authStore.user) return
  
  try {
    // 使用store中的updateSignature方法
    await authStore.updateSignature(signatureInput.value)
    console.log('✅ 个性签名更新成功')
  } catch (error) {
    console.error('❌ 个性签名更新失败:', error)
  }
}


</script>

<style scoped>
.profile {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.header {
  background: white;
  border-bottom: 1px solid #f0f0f0;
  padding: 1rem 0;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 20px;
}

.header-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.nav {
  display: flex;
  gap: 1rem;
}

.nav-link {
  color: #666;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-link:hover {
  background: rgba(24, 144, 255, 0.1);
  color: #1890ff;
}

.nav-link.active {
  background: #1890ff;
  color: white;
}

.back-link {
  color: #1890ff;
  text-decoration: none;
  font-size: 0.875rem;
}

.back-link:hover {
  text-decoration: underline;
}

.header h1 {
  margin: 0;
  color: #333;
}

.main {
  padding: 2rem 0;
}

.loading, .error {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.profile-card {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.avatar-container {
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.avatar-container:hover {
  transform: scale(1.05);
}

.avatar-container:hover .avatar-edit-hint {
  opacity: 1;
}

.avatar-edit-hint {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  text-align: center;
  padding: 4px;
  font-size: 0.75rem;
  border-radius: 0 0 50% 50%;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
}

.profile-info {
  flex: 1;
}

.username {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.level-badge {
  background: #e8f4fd;
  color: #1890ff;
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 0.9rem;
  font-weight: 500;
}

.level-4-6 { color: #52c41a; }
.level-7-9 { color: #fa8c16; }
.level-10-plus { color: #f5222d; font-weight: 700; }

.member-since {
  color: #666;
  margin: 0;
}

.experience-section {
  margin-bottom: 2rem;
  padding: 1rem;
  background: #fafafa;
  border-radius: 8px;
}

.exp-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #666;
}

.exp-progress {
  position: relative;
  height: 20px;
  background: #e8e8e8;
  border-radius: 10px;
  overflow: hidden;
}

.exp-bar {
  height: 100%;
  background: linear-gradient(90deg, #52c41a, #1890ff);
  transition: width 0.3s ease;
  border-radius: 10px;
}

.exp-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.8rem;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.privileges-section h3 {
  margin: 0 0 1rem 0;
  color: #333;
}

.privileges-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.privilege-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #1890ff;
}

.privilege-icon {
  font-size: 1.2rem;
}

.privilege-name {
  font-weight: 500;
  color: #333;
}

.user-posts {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.user-posts h3 {
  margin: 0 0 1.5rem 0;
  color: #333;
}

.no-posts {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.btn-primary {
  background: #1890ff;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  text-decoration: none;
  display: inline-block;
  margin-top: 1rem;
}

.btn-primary:hover {
  background: #40a9ff;
}

.debug-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-left: 8px;
}

.debug-btn:hover {
  background: #5a6268;
}

.test-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-top: 8px;
}

.test-btn:hover {
  background: #218838;
}

.avatar-container {
  position: relative;
  cursor: pointer;
}

.avatar-container:not(.can-change) {
  cursor: not-allowed;
}

.avatar-edit-hint {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  text-align: center;
  padding: 4px;
  font-size: 12px;
  border-radius: 0 0 50% 50%;
}

.avatar-locked {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 0, 0, 0.7);
  color: white;
  text-align: center;
  padding: 4px;
  font-size: 12px;
  border-radius: 0 0 50% 50%;
}

.exp-debug {
  margin-top: 8px;
  text-align: center;
}

.signature-section {
  margin: 1rem 0;
}

.signature-edit {
  position: relative;
}

.signature-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

.signature-input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.signature-hint {
  font-size: 0.75rem;
  color: #999;
  margin-top: 0.25rem;
}

.signature-display {
  font-style: italic;
  color: #666;
  padding: 0.5rem 0;
  font-size: 0.9rem;
}

.signature-locked {
  color: #999;
  font-style: italic;
  padding: 0.5rem 0;
  font-size: 0.9rem;
}

.signature-section {
  margin: 1rem 0;
}

.signature-edit {
  position: relative;
}

.signature-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

.signature-input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.signature-hint {
  font-size: 0.75rem;
  color: #999;
  margin-top: 0.25rem;
}

.signature-display {
  font-style: italic;
  color: #666;
  padding: 0.5rem 0;
  font-size: 0.9rem;
}

/* 账号设置模态框样式 */
.account-settings-modal {
  background: white;
  border-radius: 8px;
  max-width: 600px;
  max-height: 90vh;
  overflow: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 1.5rem;
}

.modal-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.25rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0.25rem;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 0 1.5rem 1.5rem;
}

/* 导航栏按钮样式 */
.nav button.nav-link {
  background: none;
  border: none;
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
  color: #666;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav button.nav-link:hover {
  background: rgba(24, 144, 255, 0.1);
  color: #1890ff;
}

.signout-btn:hover {
  background: rgba(255, 77, 79, 0.1) !important;
  color: #ff4d4f !important;
}

.signout-btn:hover {
  background: rgba(255, 77, 79, 0.1) !important;
  color: #ff4d4f !important;
}

</style>