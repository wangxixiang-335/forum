<template>
  <article class="post-card" :class="{ 'post-pinned': post.is_pinned }">
    <div class="post-header">
      <div class="user-info">
        <img 
          :src="post.profiles.avatar_url || '/default-avatar.png'" 
          :alt="post.profiles.username"
          class="avatar"
        />
        <div class="user-details">
          <span class="username" :class="getLevelClass(post.profiles.level)">
            {{ post.profiles.username }}
            <span class="level-badge">Lv.{{ post.profiles.level }}</span>
          </span>
          <span class="post-time">{{ formatTime(post.created_at) }}</span>
        </div>
      </div>
      <div class="post-actions">
        <div v-if="post.is_pinned" class="pinned-indicator">
          <span>📌 置顶</span>
        </div>
        <button 
          v-if="isAuthor" 
          class="delete-btn" 
          @click="handleDeletePost"
          title="删除帖子"
        >
          🗑️
        </button>
      </div>
    </div>

    <div class="post-content">
      <h3 class="post-title">
        <RouterLink :to="`/post/${post.id}`" class="title-link">
          {{ post.title }}
        </RouterLink>
      </h3>
      <p class="post-excerpt">{{ getExcerpt(post.content) }}</p>
      
      <div v-if="post.tags && post.tags.length > 0" class="post-tags">
        <span 
          v-for="tag in post.tags.slice(0, 3)" 
          :key="tag" 
          class="tag"
        >
          #{{ tag }}
        </span>
      </div>
    </div>

    <div class="post-footer">
      <div class="interaction-stats">
        <button 
          class="interaction-btn" 
          :class="{ active: post.user_has_liked }"
          @click="$emit('like', post.id)"
        >
          👍 {{ post.like_count }}
        </button>
        <button class="interaction-btn" @click="$emit('comment', post.id)">
          💬 {{ post.comment_count }}
        </button>
        <span class="view-count">👁️ {{ post.view_count }}</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePostStore } from '@/stores/posts'
import type { Database } from '@/types/supabase'

interface Props {
  post: Database['public']['Tables']['posts']['Row'] & {
    profiles: {
      username: string
      avatar_url: string | null
      level: number
    }
    user_has_liked?: boolean
  }
}

const props = defineProps<Props>()

const authStore = useAuthStore()
const postStore = usePostStore()

defineEmits<{
  like: [postId: string]
  comment: [postId: string]
}>()

// 检查是否为帖子作者
const isAuthor = computed(() => {
  return authStore.user?.id === props.post.user_id
})

// 删除帖子
const handleDeletePost = async () => {
  if (!confirm('确定要删除这个帖子吗？此操作不可恢复。')) {
    return
  }
  
  const result = await postStore.deletePost(props.post.id)
  if (result.success) {
    console.log('帖子删除成功')
  } else {
    console.error('删除帖子失败:', result.error)
    alert('删除失败: ' + result.error)
  }
}

// 根据用户等级获取样式类
const getLevelClass = (level: number) => {
  if (level >= 10) return 'level-10-plus'
  if (level >= 7) return 'level-7-9'
  if (level >= 4) return 'level-4-6'
  return 'level-1-3'
}

// 格式化时间显示
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

// 获取内容摘要
const getExcerpt = (content: string) => {
  const plainText = content.replace(/[#*_~`]/g, '').replace(/\n/g, ' ')
  return plainText.length > 100 ? plainText.substring(0, 100) + '...' : plainText
}
</script>

<style scoped>
.post-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: box-shadow 0.2s;
}

.post-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.post-pinned {
  border-left: 4px solid #ff6b35;
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.post-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.delete-btn:hover {
  background: #fff1f0;
  color: #ff4d4f;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.username {
  font-weight: 600;
  font-size: 1rem;
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

.level-4-6 {
  color: #52c41a;
}

.level-7-9 {
  color: #fa8c16;
}

.level-10-plus {
  color: #f5222d;
  font-weight: 700;
}

.post-time {
  font-size: 0.875rem;
  color: #666;
}

.pinned-indicator {
  background: #fff7e6;
  color: #fa8c16;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.post-content {
  margin-bottom: 1rem;
}

.post-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  line-height: 1.4;
}

.title-link {
  color: #1890ff;
  text-decoration: none;
}

.title-link:hover {
  color: #40a9ff;
  text-decoration: underline;
}

.post-excerpt {
  color: #666;
  line-height: 1.6;
  margin-bottom: 0.75rem;
}

.post-tags {
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

.post-footer {
  border-top: 1px solid #f0f0f0;
  padding-top: 1rem;
}

.interaction-stats {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.interaction-btn {
  background: none;
  border: 1px solid #d9d9d9;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
}

.interaction-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.interaction-btn.active {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.view-count {
  color: #999;
  font-size: 0.875rem;
}
</style>