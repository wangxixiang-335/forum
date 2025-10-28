<template>
  <div class="profile">
    <header class="header">
      <div class="container">
        <RouterLink to="/" class="back-link">← 返回首页</RouterLink>
        <h1>个人中心</h1>
      </div>
    </header>

    <main class="main">
      <div class="container">
        <div v-if="loading" class="loading">加载中...</div>
        
        <div v-else-if="profile" class="profile-content">
          <!-- 用户信息卡片 -->
          <div class="profile-card">
            <div class="profile-header">
              <img 
                :src="profile.avatar_url || '/default-avatar.png'" 
                :alt="profile.username"
                class="avatar"
              />
              <div class="profile-info">
                <h2 class="username" :class="getLevelClass(profile.level)">
                  {{ profile.username }}
                  <span class="level-badge">Lv.{{ profile.level }}</span>
                </h2>
                <p class="member-since">
                  注册时间：{{ formatDate(profile.created_at) }}
                </p>
              </div>
            </div>

            <!-- 经验值进度条 -->
            <div class="experience-section">
              <div class="exp-info">
                <span>经验值：{{ profile.experience_points }}</span>
                <span>下一等级：{{ nextLevelExp - profile.experience_points > 0 ? (nextLevelExp - profile.experience_points) + ' EXP' : '已满' }}</span>
              </div>
              <div class="exp-progress">
                <div 
                  class="exp-bar" 
                  :style="{ width: expProgress + '%' }"
                ></div>
                <span class="exp-text">{{ expProgress }}%</span>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePostStore } from '@/stores/posts'
import PostCard from '@/components/PostCard.vue'
import type { Database } from '@/types/supabase'

const authStore = useAuthStore()
const postStore = usePostStore()

const loading = ref(true)
const userPosts = ref<Database['public']['Tables']['posts']['Row'][]>([])

const profile = computed(() => authStore.profile)

// 计算下一等级所需经验值
const nextLevelExp = computed(() => {
  if (!profile.value) return 0
  return Math.floor(100 * Math.pow(profile.value.level + 1, 1.5))
})

// 计算当前等级所需经验值
const currentLevelExp = computed(() => {
  if (!profile.value) return 0
  return Math.floor(100 * Math.pow(profile.value.level, 1.5))
})

// 计算经验值进度
const expProgress = computed(() => {
  if (!profile.value) return 0
  
  const currentExp = profile.value.experience_points
  const currentLevelReq = currentLevelExp.value
  const nextLevelReq = nextLevelExp.value
  
  // 如果已经达到或超过下一等级要求，显示100%
  if (currentExp >= nextLevelReq) return 100
  
  // 计算当前等级的进度
  const expInCurrentLevel = currentExp - currentLevelReq
  const expNeededForNextLevel = nextLevelReq - currentLevelReq
  
  if (expNeededForNextLevel <= 0) return 0
  
  const progress = Math.floor((expInCurrentLevel / expNeededForNextLevel) * 100)
  
  // 确保进度在0-100之间
  return Math.max(0, Math.min(100, progress))
})

// 当前特权列表
const currentPrivileges = computed(() => {
  const level = profile.value?.level || 1
  const privileges = []

  // 基础特权
  privileges.push({ id: 'basic', name: '发帖、评论、点赞', icon: '📝' })

  if (level >= 4) {
    privileges.push({ id: 'style', name: '特殊徽章显示', icon: '🎖️' })
  }

  if (level >= 7) {
    privileges.push({ id: 'color', name: '个性化色彩', icon: '🎨' })
  }

  if (level >= 10) {
    privileges.push({ id: 'mod', name: '评论置顶权限', icon: '⭐' })
  }

  return privileges
})

onMounted(async () => {
  await loadUserData()
})

const loadUserData = async () => {
  try {
    if (!authStore.profile) {
      await authStore.fetchProfile()
    }
    await loadUserPosts()
  } catch (error) {
    console.error('加载用户数据失败:', error)
  } finally {
    loading.value = false
  }
}

const loadUserPosts = async () => {
  if (!authStore.user) return
  
  try {
    const result = await postStore.fetchUserPosts(authStore.user.id)
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

// 工具函数
const getLevelClass = (level: number) => {
  if (level >= 10) return 'level-10-plus'
  if (level >= 7) return 'level-7-9'
  if (level >= 4) return 'level-4-6'
  return 'level-1-3'
}

const formatDate = (timestamp: string) => {
  return new Date(timestamp).toLocaleDateString('zh-CN')
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

.back-link {
  color: #1890ff;
  text-decoration: none;
  font-size: 0.875rem;
}

.back-link:hover {
  text-decoration: underline;
}

.header h1 {
  margin: 1rem 0 0 0;
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

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #f0f0f0;
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
</style>