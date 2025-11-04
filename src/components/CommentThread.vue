<template>
  <div class="comment-thread">
    <!-- 主评论 -->
    <div class="comment-item" :class="{ 'is-reply': isReply }">
      <div class="comment-header">
        <div class="comment-author">
          <UserAvatar 
            :username="comment.profiles?.username || '匿名用户'" 
            :avatar-id="comment.profiles?.avatar_url"
            size="32px"
          />
          <div class="author-info">
            <span class="username" :class="getLevelClass(comment.profiles?.level || 1)">
              {{ comment.profiles?.username || '匿名用户' }}
              <span class="level-badge">Lv.{{ comment.profiles?.level || 1 }}</span>
            </span>
            <span class="comment-time">{{ formatTime(comment.created_at) }}</span>
            <span v-if="isReply" class="reply-indicator">回复 {{ replyToUsername }}</span>
          </div>
        </div>
        
        <div class="comment-actions">
          <div v-if="comment.is_pinned" class="pinned-badge">
            📌 置顶
          </div>
          <button 
            v-if="canPinComment && !comment.is_pinned" 
            class="action-btn pin-btn"
            @click="handleTogglePin"
            title="置顶评论"
          >
            📌
          </button>
          <button 
            v-if="canPinComment && comment.is_pinned" 
            class="action-btn unpin-btn"
            @click="handleTogglePin"
            title="取消置顶"
          >
            📍
          </button>
          <button 
            class="action-btn"
            :class="{ active: comment.user_has_liked }"
            @click="handleLike"
            title="点赞"
          >
            👍 {{ comment.like_count || 0 }}
          </button>
          <button 
            class="action-btn"
            @click="toggleReply"
            title="回复"
          >
            💬 回复
          </button>
          <button 
            v-if="isAuthor"
            class="action-btn delete-btn" 
            @click="handleDeleteComment"
            title="删除评论"
          >
            🗑️
          </button>
        </div>
      </div>
      
      <div class="comment-content">
        {{ comment.content }}
      </div>
      
      <!-- 回复输入框 -->
      <div v-if="showReplyBox" class="reply-box">
        <div class="reply-input-wrapper">
          <UserAvatar 
            :username="currentUserProfile?.username || '用户'" 
            :avatar-id="currentUserProfile?.avatar_url"
            size="32px"
          />
          <div class="reply-input-container">
            <textarea
              v-model="replyContent"
              class="reply-input"
              :placeholder="`回复 ${comment.profiles?.username || '匿名用户'}...`"
              rows="3"
              @keydown.ctrl.enter="submitReply"
            ></textarea>
            <div class="reply-actions">
              <span class="reply-hint">Ctrl + Enter 发送</span>
              <div class="reply-buttons">
                <button @click="cancelReply" class="btn-secondary">
                  取消
                </button>
                <button 
                  @click="submitReply" 
                  class="btn-primary"
                  :disabled="!replyContent.trim()"
                >
                  回复
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 回复列表 -->
    <div v-if="replies.length > 0" class="replies-container">
      <div 
        v-for="reply in replies" 
        :key="reply.id"
        class="reply-item"
      >
        <CommentThread
          :comment="reply"
          :is-reply="true"
          :reply-to-username="comment.profiles?.username"
          @like="$emit('like', $event)"
          @reply="handleReplyReply"
          @delete="$emit('delete', $event)"
        />
      </div>
      
      <!-- 显示更多回复按钮 -->
      <div v-if="hasMoreReplies" class="load-more-replies">
        <button @click="loadMoreReplies" class="load-more-btn">
          加载更多回复 ({{ remainingRepliesCount }})
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePostStore } from '@/stores/posts'
import UserAvatar from '@/components/UserAvatar.vue'
import type { Database } from '@/types/supabase'

interface Props {
  comment: Database['public']['Tables']['comments']['Row'] & {
    profiles?: {
      username: string
      avatar_url: string | null
      level: number
    }
    user_has_liked?: boolean
    replies?: any[]
  }
  isReply?: boolean
  replyToUsername?: string
  postId?: string
  isPostAuthor?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isReply: false,
  replyToUsername: '',
  postId: '',
  isPostAuthor: false
})

const emit = defineEmits<{
  like: [commentId: string]
  reply: [commentId: string, content: string]
  delete: [commentId: string]
  pin: [commentId: string]
}>()

const authStore = useAuthStore()
const postStore = usePostStore()

const showReplyBox = ref(false)
const replyContent = ref('')
const replies = ref<any[]>([])
const loadingReplies = ref(false)
const hasMoreReplies = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)

const currentUserProfile = computed(() => authStore.profile)
const isAuthor = computed(() => {
  return authStore.user?.id === props.comment.user_id
})

// 检查是否有置顶权限
const canPinComment = computed(() => {
  const userLevel = authStore.profile?.level || 1
  const isPostAuthor = props.isPostAuthor || false
  
  // 只有10级以上用户或帖子作者可以置顶评论
  return userLevel >= 10 || isPostAuthor
})

const remainingRepliesCount = computed(() => {
  return Math.max(0, totalPages.value - currentPage.value) * 10 // 假设每页10条
})

const toggleReply = () => {
  showReplyBox.value = !showReplyBox.value
  if (showReplyBox.value) {
    replyContent.value = ''
  }
}

const cancelReply = () => {
  showReplyBox.value = false
  replyContent.value = ''
}

const submitReply = async () => {
  if (!replyContent.value.trim()) return
  
  try {
    const result = await postStore.createComment(
      props.comment.post_id,
      replyContent.value.trim(),
      props.comment.id
    )
    
    if (result.success) {
      // 添加新回复到列表
      const newReply = {
        ...result.data,
        profiles: {
          username: currentUserProfile.value?.username || '用户',
          avatar_url: currentUserProfile.value?.avatar_url,
          level: currentUserProfile.value?.level || 1
        }
      }
      replies.value.unshift(newReply)
      
      // 清空输入框
      replyContent.value = ''
      showReplyBox.value = false
      
      // 通知父组件
      emit('reply', props.comment.id, replyContent.value.trim())
    } else {
      alert('回复失败: ' + result.error)
    }
  } catch (error) {
    console.error('回复评论失败:', error)
    alert('回复失败，请重试')
  }
}

const handleLike = () => {
  emit('like', props.comment.id)
}

const handleDeleteComment = () => {
  if (!confirm('确定要删除这条评论吗？此操作不可恢复。')) {
    return
  }
  emit('delete', props.comment.id)
}

const handleTogglePin = async () => {
  if (!props.postId) {
    console.error('缺少postId，无法执行置顶操作')
    return
  }
  
  const result = await postStore.toggleCommentPin(props.comment.id, props.postId)
  if (result.success) {
    console.log('评论置顶状态切换成功:', result.data?.is_pinned ? '已置顶' : '已取消置顶')
    // 通知父组件刷新评论列表
    emit('pin', props.comment.id)
  } else {
    console.error('切换置顶状态失败:', result.error)
    alert('操作失败: ' + result.error.message)
  }
}

const handleReplyReply = (commentId: string, content: string) => {
  // 处理回复的回复，通知父组件更新计数
  emit('reply', commentId, content)
}

const loadReplies = async () => {
  if (loadingReplies.value) return
  
  loadingReplies.value = true
  try {
    // 这里需要实现获取回复的逻辑
    // const result = await postStore.fetchCommentReplies(props.comment.id, currentPage.value)
    // if (result.success) {
    //   replies.value = [...replies.value, ...result.data]
    //   hasMoreReplies.value = result.hasMore
    //   totalPages.value = result.totalPages
    // }
  } catch (error) {
    console.error('加载回复失败:', error)
  } finally {
    loadingReplies.value = false
  }
}

const loadMoreReplies = () => {
  currentPage.value++
  loadReplies()
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

onMounted(() => {
  // 如果有回复，加载第一页
  if (props.comment.replies && props.comment.replies.length > 0) {
    replies.value = props.comment.replies
  }
})
</script>

<style scoped>
.comment-thread {
  width: 100%;
}

.comment-item {
  background: #fafafa;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid #f0f0f0;
  transition: all 0.2s ease;
}

.comment-item:hover {
  border-color: #e8e8e8;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.comment-item.is-reply {
  margin-left: 2rem;
  background: #f8f9fa;
  border-left: 3px solid #1890ff;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.comment-author {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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
  color: #999;
  font-size: 0.8rem;
}

.reply-indicator {
  color: #1890ff;
  font-size: 0.8rem;
  font-weight: 500;
}

.comment-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-btn {
  background: none;
  border: 1px solid #d9d9d9;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
  font-size: 0.8rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.25rem;
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

.action-btn.delete-btn:hover {
  border-color: #ff4d4f;
  color: #ff4d4f;
}

.action-btn.pin-btn:hover {
  border-color: #fa8c16;
  color: #fa8c16;
}

.action-btn.unpin-btn:hover {
  border-color: #fa8c16;
  color: #fa8c16;
}

.pinned-badge {
  background: #fff7e6;
  color: #fa8c16;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.comment-content {
  color: #333;
  line-height: 1.6;
  margin-bottom: 0.75rem;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.reply-box {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f0f0f0;
}

.reply-input-wrapper {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.reply-input-container {
  flex: 1;
}

.reply-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 0.9rem;
  line-height: 1.5;
  resize: vertical;
  font-family: inherit;
}

.reply-input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.reply-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}

.reply-hint {
  color: #999;
  font-size: 0.8rem;
}

.reply-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-primary, .btn-secondary {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #1890ff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #40a9ff;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f5f5f5;
  color: #666;
}

.btn-secondary:hover {
  background: #e8e8e8;
}

.replies-container {
  margin-top: 1rem;
  padding-left: 1rem;
  border-left: 2px solid #f0f0f0;
}

.reply-item {
  margin-bottom: 0.75rem;
}

.load-more-replies {
  text-align: center;
  margin-top: 1rem;
}

.load-more-btn {
  background: none;
  border: 1px solid #d9d9d9;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.load-more-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .comment-item.is-reply {
    margin-left: 1rem;
  }
  
  .comment-header {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .comment-actions {
    align-self: flex-end;
  }
  
  .reply-input-wrapper {
    flex-direction: column;
  }
  
  .reply-input-container {
    width: 100%;
  }
}
</style>