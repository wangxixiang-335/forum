<template>
  <div class="search-result-item" @click="$emit('click', result)">
    <!-- 帖子结果 -->
    <div v-if="result.type === 'post'" class="result-post">
      <div class="result-header">
        <span class="result-type-badge post-badge">帖子</span>
        <h5 class="result-title">{{ result.title }}</h5>
        <div v-if="result.is_pinned" class="pinned-indicator">
          <i class="bi bi-pin-fill"></i>
          置顶
        </div>
      </div>
      
      <p class="result-content">{{ truncateText(result.content, 200) }}</p>
      
      <div class="result-meta">
        <div class="user-info">
          <UserAvatar :user="result" size="sm" />
          <span class="username">{{ result.username }}</span>
          <span class="user-level">Lv.{{ result.level }}</span>
        </div>
        
        <div class="post-stats">
          <span class="stat-item">
            <i class="bi bi-heart"></i>
            {{ result.like_count }}
          </span>
          <span class="stat-item">
            <i class="bi bi-chat"></i>
            {{ result.comment_count }}
          </span>
          <span class="stat-item">
            <i class="bi bi-eye"></i>
            {{ result.view_count }}
          </span>
        </div>
      </div>
      
      <div v-if="result.tags && result.tags.length > 0" class="result-tags">
        <span v-for="tag in result.tags.slice(0, 5)" :key="tag" class="tag">
          #{{ tag }}
        </span>
      </div>
      
      <div class="result-time">
        {{ formatTime(result.created_at) }}
      </div>
    </div>

    <!-- 用户结果 -->
    <div v-else-if="result.type === 'user'" class="result-user">
      <div class="result-header">
        <span class="result-type-badge user-badge">用户</span>
        <h5 class="result-title">{{ result.user_data?.username }}</h5>
      </div>
      
      <div class="user-profile">
        <UserAvatar :user="result.user_data" size="lg" />
        <div class="user-details">
          <p class="user-bio">{{ result.content }}</p>
          <div class="user-stats">
            <span class="stat-item">
              <i class="bi bi-trophy"></i>
              等级 {{ result.user_data?.level }}
            </span>
            <span class="stat-item">
              <i class="bi bi-star"></i>
              {{ result.user_data?.experience_points }} 经验值
            </span>
          </div>
        </div>
      </div>
      
      <div class="result-time">
        加入于 {{ formatTime(result.created_at) }}
      </div>
    </div>

    <!-- 评论结果 -->
    <div v-else-if="result.type === 'comment'" class="result-comment">
      <div class="result-header">
        <span class="result-type-badge comment-badge">评论</span>
        <h5 class="result-title">
          评论于: {{ result.post_title }}
        </h5>
      </div>
      
      <p class="result-content">{{ truncateText(result.content, 200) }}</p>
      
      <div class="result-meta">
        <div class="user-info">
          <UserAvatar :user="result" size="sm" />
          <span class="username">{{ result.username }}</span>
          <span class="user-level">Lv.{{ result.level }}</span>
        </div>
        
        <div v-if="result.like_count > 0" class="comment-stats">
          <span class="stat-item">
            <i class="bi bi-heart"></i>
            {{ result.like_count }}
          </span>
        </div>
      </div>
      
      <div v-if="result.parent_id" class="reply-indicator">
        <i class="bi bi-reply"></i>
        回复评论
      </div>
      
      <div class="result-time">
        {{ formatTime(result.created_at) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UserAvatar from './UserAvatar.vue'
import type { SearchResult } from '@/stores/search'

interface Props {
  result: SearchResult
}

const props = defineProps<Props>()
defineEmits<{
  click: [result: SearchResult]
}>()

// 方法
const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<style scoped>
.search-result-item {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.search-result-item:hover {
  border-color: #007bff;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
  transform: translateY(-1px);
}

.result-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.result-type-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.post-badge {
  background-color: #e3f2fd;
  color: #1976d2;
}

.user-badge {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.comment-badge {
  background-color: #e8f5e8;
  color: #388e3c;
}

.result-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #212529;
  flex: 1;
}

.pinned-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #dc3545;
  font-size: 14px;
  font-weight: 500;
}

.result-content {
  color: #6c757d;
  line-height: 1.6;
  margin-bottom: 16px;
}

.result-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.username {
  font-weight: 500;
  color: #495057;
}

.user-level {
  font-size: 12px;
  color: #6c757d;
  background-color: #f8f9fa;
  padding: 2px 6px;
  border-radius: 10px;
}

.post-stats,
.comment-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #6c757d;
}

.result-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.tag {
  background-color: #e9ecef;
  color: #495057;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.result-time {
  font-size: 12px;
  color: #6c757d;
}

/* 用户结果特定样式 */
.user-profile {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}

.user-details {
  flex: 1;
}

.user-bio {
  color: #6c757d;
  margin-bottom: 12px;
}

.user-stats {
  display: flex;
  gap: 16px;
}

/* 评论结果特定样式 */
.reply-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #6c757d;
  font-size: 14px;
  margin-bottom: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .search-result-item {
    padding: 16px;
  }
  
  .result-header {
    flex-wrap: wrap;
  }
  
  .result-title {
    font-size: 16px;
  }
  
  .result-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .user-profile {
    flex-direction: column;
    text-align: center;
  }
  
  .post-stats,
  .comment-stats,
  .user-stats {
    gap: 12px;
  }
}
</style>