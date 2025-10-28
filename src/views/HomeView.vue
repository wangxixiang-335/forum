<template>
  <div class="home">
    <header class="header">
      <div class="container">
        <h1 class="logo">连接者论坛</h1>
        <nav class="nav">
          <RouterLink to="/" class="nav-link">首页</RouterLink>
          <RouterLink v-if="!isAuthenticated" to="/login" class="nav-link">登录</RouterLink>
          <RouterLink v-else to="/profile" class="nav-link">个人中心</RouterLink>
        </nav>
      </div>
    </header>

    <main class="main">
      <div class="container">
        <div class="post-list">
          <div class="post-list-header">
            <h2>最新帖子</h2>
            <button v-if="isAuthenticated" @click="showCreatePost = true" class="btn-primary">
              发布帖子
            </button>
          </div>
          
          <PostCard 
            v-for="post in posts" 
            :key="post.id" 
            :post="post" 
            @like="handleLike"
            @comment="handleComment"
          />
          
          <div v-if="loading" class="loading">加载中...</div>
          <div v-if="!loading && posts.length === 0" class="empty">
            暂无帖子，快来发布第一个帖子吧！
          </div>
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
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePostStore } from '@/stores/posts'
import PostCard from '@/components/PostCard.vue'
import CreatePostModal from '@/components/CreatePostModal.vue'

const router = useRouter()
const authStore = useAuthStore()
const postStore = usePostStore()

const showCreatePost = ref(false)
const loading = ref(false)

const isAuthenticated = computed(() => authStore.isAuthenticated)
const posts = computed(() => postStore.posts)

onMounted(async () => {
  await loadPosts()
})

const loadPosts = async () => {
  loading.value = true
  try {
    await postStore.fetchPosts()
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
  text-decoration: none;
  color: #666;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.nav-link:hover {
  background-color: #f0f0f0;
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

.loading, .empty {
  text-align: center;
  padding: 3rem;
  color: #666;
}
</style>