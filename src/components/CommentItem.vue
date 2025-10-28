<template>
  <div class="comment-item">
    <div class="comment-header">
      <div class="comment-author">
        <img 
          :src="comment.profiles?.avatar_url || '/default-avatar.png'" 
          :alt="comment.profiles?.username"
          class="avatar"
        />
        <div class="author-info">
          <span class="username" :class="getLevelClass(comment.profiles?.level || 1)">
            {{ comment.profiles?.username || '匿名用户' }}
            <span class="level-badge">Lv.{{ comment.profiles?.level || 1 }}</span>
          </span>
          <span class="comment-time">{{ formatTime(comment.created_at) }}</span>
        </div>
      </div>
      
      <div class="comment-actions">
        <div v-if="comment.is_pinned" class="pinned-badge">
          📌 置顶
        </div>
        <button 
          v-if="isAuthor" 
          class="delete-btn" 
          @click="handleDeleteComment"
          title="删除评论"
        >
          🗑️
        </button>
      </div>
    </div>
    
    <div class="comment-content">
      <p>{{ comment.content }}</p>
    </div>
    
    <div class="comment-actions">
      <button 
        class="action-btn" 
        :class="{ active: comment.user_has_liked }"
        @click="$emit('like', comment.id)"
      >
        👍 {{ comment.like_count }}
      </button>
      <button class="action-btn">
        💬 回复
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePostStore } from '@/stores/posts'
import type { Database } from '@/types/supabase'

interface Props {
  comment: Database['public']['Tables']['comments']['Row'] & {
    profiles?: {
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
  like: [commentId: string]
}>()

// 检查是否为评论作者
const isAuthor = computed(() => {
  return authStore.user?.id === props.comment.user_id
})

// 删除评论
const handleDeleteComment = async () => {
  if (!confirm('确定要删除这条评论吗？此操作不可恢复。')) {
    return
  }
  
  const result = await postStore.deleteComment(props.comment.id)
  if (result.success) {
    console.log('评论删除成功')
    // 触发父组件刷新评论列表
    location.reload()
  } else {
    console.error('删除评论失败:', result.error)
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
</script>

<style scoped>
.comment-item {
  background: #fafafa;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  border: 1px solid #f0f0f0;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.comment-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.delete-btn:hover {
  background: #fff1f0;
  color: #ff4d4f;
}

.comment-author {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.author-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.username {
  font-weight: 600;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.level-badge {
  background: #e8f4fd;
  color: #1890ff;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
}

.level-4-6 { color: #52c41a; }
.level-7-9 { color: #fa8c16; }
.level-10-plus { color: #f5222d; font-weight: 700; }

.comment-time {
  font-size: 0.8rem;
  color: #999;
}

.pinned-badge {
  background: #fff7e6;
  color: #fa8c16;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.comment-content {
  margin-bottom: 1rem;
}

.comment-content p {
  margin: 0;
  line-height: 1.6;
  color: #333;
}

.comment-actions {
  display: flex;
  gap: 1rem;
}

.action-btn {
  background: none;
  border: 1px solid #d9d9d9;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
  font-size: 0.85rem;
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
</style>