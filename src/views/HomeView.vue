<template>
  <div class="home">
    <header class="header">
      <div class="container">
        <h1 class="logo">连接者论坛</h1>
        <nav class="nav">
          <RouterLink to="/" class="nav-link">首页</RouterLink>
          <RouterLink to="/search" class="nav-link">
            <i class="bi bi-search"></i>
            搜索
          </RouterLink>
          <RouterLink v-if="!isAuthenticated" to="/login" class="nav-link">登录</RouterLink>
          <template v-else>
            <RouterLink to="/profile" class="nav-link">个人中心</RouterLink>
            <RouterLink to="/bookmarks" class="nav-link">
              <i class="bi bi-bookmark"></i>
              收藏
            </RouterLink>
            <RouterLink to="/messages" class="nav-link">
              消息中心
              <span v-if="unreadCount > 0" class="unread-indicator">{{ unreadCount }}</span>
            </RouterLink>
            <button @click="handleSignOut" class="nav-link signout-btn">
              <i class="bi bi-box-arrow-right"></i>
              退出
            </button>
          </template>
        </nav>
      </div>
    </header>

    <main class="main">
      <div class="container">
        <!-- 快速搜索栏 -->
        <div class="quick-search">
          <div class="search-input-group">
            <input
              v-model="quickSearchQuery"
              type="text"
              class="form-control search-input"
              placeholder="快速搜索帖子、用户或评论..."
              @keyup.enter="handleQuickSearch"
            />
            <button class="btn btn-primary search-btn" @click="handleQuickSearch">
              <i class="bi bi-search"></i>
              搜索
            </button>
          </div>
        </div>

        <!-- 帖子筛选器 -->
        <PostFilters 
          @filters-changed="handleFiltersChanged"
          class="post-filters-section"
        />

        <div class="post-list">
          <div class="post-list-header">
            <h2>
              {{ getPostListTitle() }}
              <span v-if="totalPosts > 0" class="post-count">({{ totalPosts }})</span>
            </h2>
            <div class="header-actions">
              <button v-if="isAuthenticated" @click="showCreatePost = true" class="btn-primary">
                <i class="bi bi-plus-circle"></i>
                发布帖子
              </button>
            </div>
          </div>
          
          <PostCard 
            v-for="post in posts" 
            :key="post.id" 
            :post="post" 
            @like="handleLike"
            @comment="handleComment"
            @delete="handlePostDeleted"
          />
          
          <div v-if="loading" class="loading">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">加载中...</span>
            </div>
            <p>加载中...</p>
          </div>
          
          <div v-if="!loading && posts.length === 0" class="empty">
            <i class="bi bi-inbox"></i>
            <h5>暂无帖子</h5>
            <p>{{ getEmptyMessage() }}</p>
            <button v-if="isAuthenticated" @click="showCreatePost = true" class="btn-primary">
              发布第一个帖子
            </button>
          </div>

          <!-- 分页 -->
          <nav v-if="totalPages > 1" class="pagination-nav">
            <ul class="pagination">
              <li class="page-item" :class="{ disabled: currentPage === 1 }">
                <a class="page-link" href="#" @click.prevent="goToPage(currentPage - 1)">
                  <i class="bi bi-chevron-left"></i>
                  上一页
                </a>
              </li>
              <li
                v-for="page in displayedPages"
                :key="page"
                class="page-item"
                :class="{ active: page === currentPage }"
              >
                <a class="page-link" href="#" @click.prevent="goToPage(page)">{{ page }}</a>
              </li>
              <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <a class="page-link" href="#" @click.prevent="goToPage(currentPage + 1)">
                  下一页
                  <i class="bi bi-chevron-right"></i>
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </main>

    <!-- 发布帖子模态框 -->
    <CreatePostModal 
      v-if="showCreatePost" 
      @close="showCreatePost = false" 
      @created="handlePostCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePostsStore } from '@/stores/posts'
import { useMessageStore } from '@/stores/messages'
import { supabase } from '@/services/supabase'
import PostCard from '@/components/PostCard.vue'
import CreatePostModal from '@/components/CreatePostModal.vue'
import PostFilters from '@/components/PostFilters.vue'
import type { PostFilters as PostFiltersType } from '@/stores/posts'

const router = useRouter()
const authStore = useAuthStore()
const postsStore = usePostsStore()
const messageStore = useMessageStore()

const showCreatePost = ref(false)
const loading = ref(false)
const quickSearchQuery = ref('')

const isAuthenticated = computed(() => authStore.isAuthenticated)
const posts = computed(() => postsStore.posts)
const unreadCount = computed(() => messageStore.unreadCount)
const totalPosts = computed(() => postsStore.totalPosts)
const currentPage = computed(() => postsStore.currentPage)
const pageSize = computed(() => postsStore.pageSize)
const filters = computed(() => postsStore.filters)

// 计算总页数
const totalPages = computed(() => Math.ceil(totalPosts.value / pageSize.value))

// 计算显示的页码
const displayedPages = computed(() => {
  const pages = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(totalPages.value, currentPage.value + 2)
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

onMounted(async () => {
  console.log('🏠 HomeView组件已挂载，开始加载数据')
  
  // 检查认证状态，但不重复初始化
  try {
    console.log('🔐 检查认证状态')
    
    // 如果认证状态还未初始化，等待一小段时间让App.vue完成初始化
    if (!authStore.user && authStore.isLoading) {
      console.log('等待认证状态初始化...')
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    console.log('认证状态检查完成:', {
      hasUser: !!authStore.user,
      isAuthenticated: authStore.isAuthenticated,
      isLoading: authStore.isLoading
    })
    
  } catch (error) {
    console.warn('认证状态检查失败，但继续加载帖子:', error)
  }
  
  // 加载帖子
  await loadPosts()
  
  // 如果已登录，加载未读消息数
  if (isAuthenticated.value) {
    console.log('📨 加载未读消息数')
    try {
      await messageStore.fetchUnreadCount()
    } catch (error) {
      console.warn('加载未读消息数失败:', error)
    }
  }
  
  console.log('✅ HomeView数据加载完成')
})

// 监听过滤器变化
watch(filters, async () => {
  await loadPosts(1) // 重置到第一页
}, { deep: true })

const loadPosts = async (page = 1) => {
  loading.value = true
  try {
    console.log('🔄 开始加载帖子...', { page, pageSize: pageSize.value })
    await postsStore.fetchPosts(page, pageSize.value)
    console.log('✅ 帖子加载成功', { 
      postCount: posts.value.length, 
      totalPosts: totalPosts.value 
    })
  } catch (error: any) {
    console.error('❌ 加载帖子失败:', error)
    
    // 提供更详细的错误信息
    if (error.message?.includes('PGRST')) {
      console.warn('数据库连接错误，尝试使用简化模式加载')
      // 可以添加备用数据源或错误提示
    }
  } finally {
    loading.value = false
  }
}

const handleLike = async (postId: string) => {
  if (!isAuthenticated.value) {
    router.push('/login')
    return
  }
  await postsStore.toggleLike(postId)
}

const handleComment = (postId: string) => {
  // 跳转到帖子详情页面
  router.push(`/post/${postId}`)
}

const handlePostDeleted = (postId: string) => {
  // 帖子被删除，立即从UI中移除
  postsStore.posts = postsStore.posts.filter(post => post.id !== postId)
  postsStore.totalPosts = Math.max(0, postsStore.totalPosts - 1)
}

const handlePostCreated = () => {
  showCreatePost.value = false
  loadPosts() // 重新加载帖子列表
}

const handleQuickSearch = () => {
  if (quickSearchQuery.value.trim()) {
    router.push({
      path: '/search',
      query: { q: quickSearchQuery.value.trim() }
    })
  }
}

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

const handleFiltersChanged = (newFilters: PostFiltersType) => {
  // 过滤器变化已经在 watch 中处理
}

const goToPage = async (page: number) => {
  if (page < 1 || page > totalPages.value) return
  await loadPosts(page)
}

const getPostListTitle = () => {
  if (filters.value.sortBy === 'most_liked') return '热门帖子'
  if (filters.value.sortBy === 'most_commented') return '热议帖子'
  if (filters.value.sortBy === 'most_viewed') return '热门浏览'
  if (filters.value.sortBy === 'oldest') return '早期帖子'
  if (filters.value.timeRange === 'today') return '今日帖子'
  if (filters.value.timeRange === 'week') return '本周帖子'
  if (filters.value.timeRange === 'month') return '本月帖子'
  if (filters.value.timeRange === 'year') return '今年帖子'
  if (filters.value.tags && filters.value.tags.length > 0) return '标签筛选'
  return '最新帖子'
}

const getEmptyMessage = () => {
  if (filters.value.tags && filters.value.tags.length > 0) {
    return '没有找到包含这些标签的帖子'
  }
  if (filters.value.timeRange !== 'all') {
    return '该时间范围内暂无帖子'
  }
  if (filters.value.authorId) {
    return '该用户暂无发布的帖子'
  }
  return '快来发布第一个帖子吧！'
}
</script>

<style scoped>
.home {
  min-height: 100vh;
  background-color: var(--background-color);
}

.header {
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.header .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 20px;
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
  color: #1890ff;
}

.nav {
  display: flex;
  gap: 1rem;
}

.nav-link {
  color: #333;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.2s;
  position: relative;
}

.nav-link:hover {
  background: rgba(24, 144, 255, 0.1);
  color: #1890ff;
}

.signout-btn {
  background: transparent;
  border: none;
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
}

.signout-btn:hover {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

.unread-indicator {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  background: #ff4d4f;
  color: white;
  border-radius: 10px;
  padding: 0.125rem 0.375rem;
  font-size: 0.7rem;
  min-width: 16px;
  text-align: center;
  font-weight: bold;
}

.main {
  padding: 2rem 0;
}

.post-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.post-list-header h2 {
  margin: 0;
  color: #333;
}

.btn-primary {
  background: #1890ff;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-primary:hover {
  background: #40a9ff;
}

.quick-search {
  margin-bottom: 24px;
}

.search-input-group {
  display: flex;
  gap: 12px;
  max-width: 600px;
  margin: 0 auto;
}

.search-input {
  flex: 1;
  padding: 12px 16px;
  font-size: 16px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  transition: border-color 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.search-btn {
  padding: 12px 20px;
  border-radius: 8px;
}

.post-filters-section {
  margin-bottom: 24px;
}

.post-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.post-list-header h2 {
  margin: 0;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.post-count {
  font-size: 16px;
  color: #6c757d;
  font-weight: normal;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-primary {
  background: #1890ff;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary:hover {
  background: #40a9ff;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: #666;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.empty {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.empty i {
  font-size: 48px;
  margin-bottom: 16px;
  display: block;
  color: #dee2e6;
}

.empty h5 {
  margin-bottom: 8px;
  color: #495057;
}

.pagination-nav {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

.pagination {
  display: flex;
  gap: 4px;
}

.page-link {
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  background: white;
  color: #495057;
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-link:hover {
  background-color: #e9ecef;
  border-color: #adb5bd;
}

.page-item.active .page-link {
  background-color: #007bff;
  border-color: #007bff;
  color: white;
}

.page-item.disabled .page-link {
  color: #6c757d;
  pointer-events: none;
  background-color: #fff;
  border-color: #dee2e6;
}

@media (max-width: 768px) {
  .search-input-group {
    flex-direction: column;
    gap: 8px;
  }
  
  .post-list-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .pagination {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>