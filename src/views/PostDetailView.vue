<template>
  <div class="post-detail">
    <header class="header">
      <div class="container">
        <RouterLink to="/" class="back-link">← 返回首页</RouterLink>
        <h1 class="title">{{ post?.title }}</h1>
      </div>
    </header>

    <main class="main">
      <div class="container">
        <div v-if="loading" class="loading">加载中...</div>
        
        <div v-else-if="post" class="post-content">
          <!-- 帖子内容 -->
          <article class="post-article">
            <div class="post-header">
              <div class="author-info">
                <img 
                  :src="post.profiles.avatar_url || '/default-avatar.png'" 
                  :alt="post.profiles.username"
                  class="avatar"
                />
                <div class="author-details">
                  <span class="username" :class="getLevelClass(post.profiles.level)">
                    {{ post.profiles.username }}
                    <span class="level-badge">Lv.{{ post.profiles.level }}</span>
                  </span>
                  <span class="post-time">{{ formatTime(post.created_at) }}</span>
                </div>
              </div>
              
              <div class="post-stats">
                <span class="stat">👁️ {{ post.view_count }} 浏览</span>
                <span class="stat">👍 {{ post.like_count }} 点赞</span>
                <span class="stat">💬 {{ post.comment_count }} 评论</span>
              </div>
            </div>

            <div class="post-body">
              <div class="content" v-html="formatContent(post.content)"></div>
              
              <!-- 帖子图片 -->
              <div v-if="post.post_images && post.post_images.length > 0" class="post-images">
                <h4>帖子图片 ({{ post.post_images.length }})</h4>
                <div class="images-grid">
                  <div 
                    v-for="image in post.post_images" 
                    :key="image.id" 
                    class="image-item"
                  >
                    <img 
                      :src="image.image_url" 
                      :alt="image.alt_text || '帖子图片'"
                      @click="openImage(image.image_url)"
                      class="post-image"
                    />
                  </div>
                </div>
              </div>
              
              <div v-if="post.tags && post.tags.length > 0" class="post-tags">
                <span 
                  v-for="tag in post.tags" 
                  :key="tag" 
                  class="tag"
                >
                  #{{ tag }}
                </span>
              </div>
            </div>

            <div class="post-actions">
              <button 
                class="action-btn" 
                :class="{ active: post.user_has_liked }"
                @click="handleLike"
              >
                👍 {{ post.like_count }}
              </button>
              <button class="action-btn" @click="focusCommentInput">
                💬 评论
              </button>
              <button class="action-btn">
                📌 收藏
              </button>
            </div>
          </article>

          <!-- 评论区域 -->
          <section class="comments-section">
            <h3>评论 ({{ post.comment_count }})</h3>
            
            <!-- 评论输入框 -->
            <div v-if="isAuthenticated" class="comment-input">
              <textarea
                ref="commentInput"
                v-model="newComment"
                placeholder="写下你的评论..."
                rows="3"
                maxlength="1000"
              ></textarea>
              <div class="comment-actions">
                <span class="char-count">{{ newComment.length }}/1000</span>
                <button 
                  @click="submitComment" 
                  :disabled="!newComment.trim()"
                  class="submit-btn"
                >
                  发布评论
                </button>
              </div>
            </div>
            <div v-else class="comment-login-prompt">
              <p>请 <RouterLink to="/login">登录</RouterLink> 后发表评论</p>
            </div>

            <!-- 评论列表 -->
            <div v-if="comments.length > 0" class="comments-list">
              <CommentItem 
                v-for="comment in comments" 
                :key="comment.id" 
                :comment="comment"
                :post-id="postId"
                :is-post-author="isPostAuthor"
                @like="handleCommentLike"
                @refresh="loadComments"
              />
            </div>
            <div v-else class="no-comments">
              <p>暂无评论，快来发表第一条评论吧！</p>
            </div>
          </section>
        </div>
        
        <div v-else class="error">
          <p>帖子不存在或已被删除</p>
          <RouterLink to="/" class="back-link">返回首页</RouterLink>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePostStore } from '@/stores/posts'
import { supabase } from '@/services/supabase'
import CommentItem from '@/components/CommentItem.vue'
import type { Database } from '@/types/supabase'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const postStore = usePostStore()

const postId = route.params.id as string
const loading = ref(true)
const newComment = ref('')
const commentInput = ref<HTMLTextAreaElement>()

const post = computed(() => postStore.currentPost)
const isAuthenticated = computed(() => authStore.isAuthenticated)
const isPostAuthor = computed(() => {
  return authStore.user?.id === post.value?.user_id
})

const comments = ref<Database['public']['Tables']['comments']['Row'][]>([])

onMounted(async () => {
  await loadPost()
  await loadComments()
})

const loadPost = async () => {
  try {
    await postStore.fetchPostById(postId)
  } catch (error) {
    console.error('加载帖子失败:', error)
  } finally {
    loading.value = false
  }
}

const loadComments = async () => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:user_id (username, avatar_url, level)
      `)
      .eq('post_id', postId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: true })
    
    if (error) throw error
    comments.value = data || []
  } catch (error) {
    console.error('加载评论失败:', error)
    comments.value = []
  }
}

const handleLike = async () => {
  if (!isAuthenticated.value) {
    router.push('/login')
    return
  }
  
  try {
    await postStore.toggleLike(postId)
  } catch (error) {
    console.error('点赞失败:', error)
  }
}

const focusCommentInput = () => {
  if (!isAuthenticated.value) {
    router.push('/login')
    return
  }
  commentInput.value?.focus()
}

const submitComment = async () => {
  if (!newComment.value.trim()) return
  
  try {
    const result = await postStore.createComment(postId, newComment.value.trim())
    if (result.success) {
      newComment.value = ''
      await loadComments() // 重新加载评论列表
    } else {
      alert(result.error?.message || '评论发布失败')
    }
  } catch (error) {
    console.error('提交评论失败:', error)
    alert('评论发布失败，请重试')
  }
}

const handleCommentLike = (commentId: string) => {
  console.log('点赞评论:', commentId)
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
  return date.toLocaleString('zh-CN')
}

const formatContent = (content: string) => {
  // 简单的Markdown转HTML（实际应该使用专门的库）
  return content
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
}

const openImage = (imageUrl: string) => {
  window.open(imageUrl, '_blank')
}
</script>

<style scoped>
.post-detail {
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

.title {
  margin: 1rem 0 0 0;
  font-size: 1.75rem;
  color: #333;
  line-height: 1.4;
}

.main {
  padding: 2rem 0;
}

.loading, .error {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.post-article {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
}

.author-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.username {
  font-weight: 600;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.level-badge {
  background: #e8f4fd;
  color: #1890ff;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.level-4-6 { color: #52c41a; }
.level-7-9 { color: #fa8c16; }
.level-10-plus { color: #f5222d; font-weight: 700; }

.post-time {
  font-size: 0.875rem;
  color: #666;
}

.post-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #666;
}

.post-body {
  margin-bottom: 2rem;
}

.content {
  line-height: 1.8;
  font-size: 1.1rem;
  color: #333;
}

.post-tags {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  background: #f0f2f5;
  color: #666;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.post-actions {
  display: flex;
  gap: 1rem;
  border-top: 1px solid #f0f0f0;
  padding-top: 1rem;
}

.action-btn {
  background: none;
  border: 1px solid #d9d9d9;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.action-btn.active {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.comments-section {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.comments-section h3 {
  margin: 0 0 1.5rem 0;
  color: #333;
}

.comment-input {
  margin-bottom: 2rem;
}

.comment-input textarea {
  width: 100%;
  padding: 1rem;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 1rem;
  resize: vertical;
  box-sizing: border-box;
}

.comment-input textarea:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.comment-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}

.char-count {
  font-size: 0.875rem;
  color: #999;
}

.submit-btn {
  background: #1890ff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.submit-btn:hover:not(:disabled) {
  background: #40a9ff;
}

.submit-btn:disabled {
  background: #bae7ff;
  cursor: not-allowed;
}

.comment-login-prompt {
  text-align: center;
  padding: 2rem;
  color: #666;
  background: #fafafa;
  border-radius: 4px;
  margin-bottom: 2rem;
}

.comment-login-prompt a {
  color: #1890ff;
  text-decoration: none;
}

.comment-login-prompt a:hover {
  text-decoration: underline;
}

.no-comments {
  text-align: center;
  padding: 3rem;
  color: #666;
  background: #fafafa;
  border-radius: 4px;
}

/* 帖子图片样式 */
.post-images {
  margin: 1.5rem 0;
  padding: 1rem 0;
  border-top: 1px solid #f0f0f0;
}

.post-images h4 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: #333;
  font-weight: 600;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.image-item {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.image-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.post-image {
  width: 100%;
  height: 150px;
  object-fit: cover;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.post-image:hover {
  opacity: 0.9;
}
</style>