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
import { usePostStore } from '@/stores/posts'
import { useMessageStore } from '@/stores/messages'
import PostCard from '@/components/PostCard.vue'
import CreatePostModal from '@/components/CreatePostModal.vue'
import PostFilters from '@/components/PostFilters.vue'
import type { PostFilters as PostFiltersType } from '@/stores/posts'

const router = useRouter()
const authStore = useAuthStore()
const postStore = usePostStore()
const messageStore = useMessageStore()

const showCreatePost = ref(false)
const loading = ref(false)
const quickSearchQuery = ref('')

const isAuthenticated = computed(() => authStore.isAuthenticated)
const posts = computed(() => postStore.posts)
const unreadCount = computed(() => messageStore.unreadCount)
const totalPosts = computed(() => postStore.totalPosts)
const currentPage = computed(() => postStore.currentPage)
const pageSize = computed(() => postStore.pageSize)
const filters = computed(() => postStore.filters)

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
  await loadPosts()
  if (isAuthenticated.value) {
    await messageStore.fetchUnreadCount()
  }
})

// 监听过滤器变化
watch(filters, async () => {
  await loadPosts(1) // 重置到第一页
}, { deep: true })

const loadPosts = async (page = 1) => {
  loading.value = true
  try {
    await postStore.fetchPosts(page, pageSize.value)
  } catch (error) {
    console.error('加载帖子失败:', error)
  } finally {
    loading.value = false
  }
}

const handleLike = async (postId: string) => {
  if (!isAuthenticated.value) {
    router.push('/login')
    return
  }
  await postStore.toggleLike(postId)
}

const handleComment = (postId: string) => {
  // 跳转到帖子详情页面
  router.push(`/post/${postId}`)
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
  background-color: #f5f5f5;
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