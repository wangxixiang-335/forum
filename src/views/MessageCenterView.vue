<template>
  <div class="message-center">
    <header class="header">
      <div class="container">
        <div class="header-nav">
          <RouterLink to="/" class="back-link">← 返回首页</RouterLink>
          <nav class="nav">
            <RouterLink to="/profile" class="nav-link">
              <i class="bi bi-person"></i>
              个人中心
            </RouterLink>
            <RouterLink to="/bookmarks" class="nav-link">
              <i class="bi bi-bookmark"></i>
              收藏
            </RouterLink>
            <RouterLink to="/messages" class="nav-link active">
              <i class="bi bi-envelope"></i>
              消息
              <span v-if="unreadCount > 0" class="unread-indicator">{{ unreadCount }}</span>
            </RouterLink>
          </nav>
        </div>
        <h1>消息中心</h1>
      </div>
    </header>

    <main class="main">
      <div class="container">
        <div class="message-layout">
          <!-- 侧边栏 -->
          <aside class="sidebar">
            <div class="sidebar-tabs">
              <button 
                class="tab-btn"
                :class="{ active: activeTab === 'conversations' }"
                @click="activeTab = 'conversations'"
              >
                💬 私信
                <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
              </button>
              <button 
                class="tab-btn"
                :class="{ active: activeTab === 'bookmarks' }"
                @click="activeTab = 'bookmarks'"
              >
                🔖 收藏
              </button>
            </div>

            <!-- 私信列表 -->
            <div v-if="activeTab === 'conversations'" class="conversation-list">
              <div class="search-box">
                <input
                  v-model="userSearchQuery"
                  type="text"
                  placeholder="搜索用户..."
                  @input="searchUsers"
                />
                <div v-if="searchResults.length > 0" class="search-results">
                  <div
                    v-for="user in searchResults"
                    :key="user.id"
                    class="search-result-item"
                    @click="startNewConversation(user)"
                  >
                    <UserAvatar :username="user.username" :avatar-id="user.avatar_url" size="32px" />
                    <span>{{ user.username }}</span>
                  </div>
                </div>
              </div>

              <div v-if="conversations.length === 0" class="empty-state">
                <p>暂无私信对话</p>
              </div>
              <div
                v-for="conversation in conversations"
                :key="conversation.id"
                class="conversation-item"
                :class="{ active: selectedConversationId === conversation.id }"
                @click="selectConversation(conversation.id)"
              >
                <UserAvatar 
                  :username="conversation.other_user?.username || '用户'" 
                  :avatar-id="conversation.other_user?.avatar_url"
                  size="40px"
                />
                <div class="conversation-info">
                  <div class="conversation-header">
                    <span class="username">{{ conversation.other_user?.username }}</span>
                    <span class="time">{{ formatTime(conversation.last_message_at) }}</span>
                  </div>
                  <div class="last-message">
                    {{ conversation.last_message?.content || '暂无消息' }}
                  </div>
                </div>
                <div class="conversation-meta">
                  <span v-if="conversation.unread_count > 0" class="unread-count">
                    {{ conversation.unread_count }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 收藏列表 -->
            <div v-if="activeTab === 'bookmarks'" class="bookmark-list">
              <div class="folder-selector">
                <select v-model="selectedFolder" @change="loadBookmarks">
                  <option v-for="folder in folders" :key="folder" :value="folder">
                    {{ folder }}
                  </option>
                </select>
                <button @click="showCreateFolderDialog = true" class="create-folder-btn">
                  + 新建文件夹
                </button>
              </div>

              <div v-if="bookmarks.length === 0" class="empty-state">
                <p>暂无收藏内容</p>
              </div>
              <div
                v-for="bookmark in bookmarks"
                :key="bookmark.id"
                class="bookmark-item"
                @click="openBookmark(bookmark)"
              >
                <div class="bookmark-content">
                  <h4 v-if="bookmark.target_type === 'post'">
                    {{ bookmark.target_data?.title }}
                  </h4>
                  <p class="bookmark-excerpt">
                    {{ getBookmarkExcerpt(bookmark) }}
                  </p>
                  <div class="bookmark-meta">
                    <span class="bookmark-type">
                      {{ bookmark.target_type === 'post' ? '帖子' : '评论' }}
                    </span>
                    <span class="bookmark-time">{{ formatTime(bookmark.created_at) }}</span>
                  </div>
                </div>
                <div class="bookmark-actions">
                  <button @click.stop="removeBookmark(bookmark.id)" class="remove-btn">
                    取消收藏
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <!-- 主内容区 -->
          <section class="content">
            <!-- 私信对话 -->
            <div v-if="activeTab === 'conversations'" class="conversation-view">
              <div v-if="!selectedConversationId" class="empty-conversation">
                <p>选择一个对话开始聊天</p>
              </div>
              <div v-else class="chat-container">
                <div class="chat-header">
                  <UserAvatar 
                    :username="selectedConversation?.other_user?.username || '用户'" 
                    :avatar-id="selectedConversation?.other_user?.avatar_url"
                    size="32px"
                  />
                  <span class="chat-username">
                    {{ selectedConversation?.other_user?.username }}
                  </span>
                  <button @click="deleteCurrentConversation" class="delete-conversation-btn">
                    删除对话
                  </button>
                </div>

                <div class="messages-container" ref="messagesContainer">
                  <div
                    v-for="message in currentMessages"
                    :key="message.id"
                    class="message"
                    :class="{ 'is-sent': message.sender_id === currentUserId }"
                  >
                    <UserAvatar 
                      :username="message.sender_profile?.username || '用户'" 
                      :avatar-id="message.sender_profile?.avatar_url"
                      size="32px"
                    />
                    <div class="message-content">
                      <div class="message-bubble">
                        {{ message.content }}
                      </div>
                      <span class="message-time">{{ formatTime(message.created_at) }}</span>
                    </div>
                  </div>
                </div>

                <div class="message-input">
                  <div class="input-wrapper">
                    <textarea
                      v-model="newMessage"
                      placeholder="输入消息..."
                      rows="3"
                      @keydown.ctrl.enter="sendMessage"
                    ></textarea>
                    <div class="input-actions">
                      <span class="input-hint">Ctrl + Enter 发送</span>
                      <button 
                        @click="sendMessage"
                        :disabled="!newMessage.trim()"
                        class="send-btn"
                      >
                        发送
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 收藏详情 -->
            <div v-if="activeTab === 'bookmarks'" class="bookmark-view">
              <div v-if="!selectedBookmark" class="empty-bookmark">
                <p>选择一个收藏查看详情</p>
              </div>
              <div v-else class="bookmark-detail">
                <div class="bookmark-header">
                  <h3 v-if="selectedBookmark.target_type === 'post'">
                    {{ selectedBookmark.target_data?.title }}
                  </h3>
                  <div class="bookmark-info">
                    <span class="bookmark-type">
                      {{ selectedBookmark.target_type === 'post' ? '帖子' : '评论' }}
                    </span>
                    <span class="bookmark-folder">{{ selectedBookmark.folder_name }}</span>
                    <span class="bookmark-time">{{ formatTime(selectedBookmark.created_at) }}</span>
                  </div>
                </div>
                <div class="bookmark-content-full">
                  {{ selectedBookmark.target_data?.content }}
                </div>
                <div class="bookmark-note">
                  <label>备注：</label>
                  <textarea
                    v-model="bookmarkNote"
                    placeholder="添加备注..."
                    @blur="updateBookmarkNote"
                  ></textarea>
                </div>
                <div class="bookmark-actions">
                  <button @click="removeBookmark(selectedBookmark.id)" class="remove-btn">
                    取消收藏
                  </button>
                  <button 
                    v-if="selectedBookmark.target_type === 'post'"
                    @click="goToPost(selectedBookmark.target_id)"
                    class="view-btn"
                  >
                    查看原帖
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>

    <!-- 创建收藏夹对话框 -->
    <div v-if="showCreateFolderDialog" class="modal-overlay" @click.self="showCreateFolderDialog = false">
      <div class="modal-content">
        <h3>新建收藏夹</h3>
        <input
          v-model="newFolderName"
          type="text"
          placeholder="收藏夹名称"
          @keydown.enter="createFolder"
        />
        <div class="modal-actions">
          <button @click="showCreateFolderDialog = false" class="btn-secondary">
            取消
          </button>
          <button @click="createFolder" :disabled="!newFolderName.trim()" class="btn-primary">
            创建
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMessageStore } from '@/stores/messages'
import { useBookmarkStore } from '@/stores/bookmarks'
import UserAvatar from '@/components/UserAvatar.vue'

const router = useRouter()
const authStore = useAuthStore()
const messageStore = useMessageStore()
const bookmarkStore = useBookmarkStore()

const activeTab = ref<'conversations' | 'bookmarks'>('conversations')
const selectedConversationId = ref<string>('')
const selectedBookmark = ref<any>(null)
const newMessage = ref('')
const userSearchQuery = ref('')
const searchResults = ref<any[]>([])
const selectedFolder = ref('默认收藏夹')
const bookmarkNote = ref('')
const showCreateFolderDialog = ref(false)
const newFolderName = ref('')
const messagesContainer = ref<HTMLElement>()

const conversations = computed(() => {
  const convs = messageStore.conversations
  console.log('conversations computed:', convs.length, convs)
  return convs
})
const currentMessages = computed(() => messageStore.currentMessages)
const unreadCount = computed(() => messageStore.unreadCount)
const bookmarks = computed(() => bookmarkStore.bookmarks)
const folders = computed(() => bookmarkStore.folders)
const currentUserId = computed(() => authStore.user?.id || '')

const selectedConversation = computed(() => 
  conversations.value.find(c => c.id === selectedConversationId.value)
)

onMounted(() => {
  loadInitialData()
})

const loadInitialData = async () => {
  try {
    // 确保用户已登录，如果未登录则跳转到登录页
    if (!authStore.isAuthenticated) {
      console.warn('用户未登录，跳转到登录页面')
      router.push('/login')
      return
    }
    
    console.log('开始加载消息中心数据...')
    
    await Promise.all([
      messageStore.fetchConversations().catch(err => {
        console.error('获取会话失败:', err)
        return { success: false }
      }),
      messageStore.fetchUnreadCount().catch(err => {
        console.error('获取未读数量失败:', err)
        return { success: false }
      }),
      bookmarkStore.fetchFolders().catch(err => {
        console.error('获取收藏夹失败:', err)
        return { success: false }
      }),
      loadBookmarks().catch(err => {
        console.error('加载收藏失败:', err)
        return { success: false }
      })
    ])
    
    console.log('消息中心数据加载完成')
  } catch (error) {
    console.error('加载初始数据失败:', error)
  }
}

const loadBookmarks = async () => {
  await bookmarkStore.fetchBookmarks(selectedFolder.value)
}

const selectConversation = async (conversationId: string) => {
  console.log('选择对话:', conversationId)
  selectedConversationId.value = conversationId
  
  const result = await messageStore.fetchMessages(conversationId)
  console.log('获取消息结果:', result)
  
  // 标记消息为已读
  const conversation = conversations.value.find(c => c.id === conversationId)
  console.log('找到的对话:', conversation)
  if (conversation && conversation.other_user) {
    console.log('对话的other_user:', conversation.other_user)
    console.log('other_user.id:', conversation.other_user.id)
    if (conversation.other_user.id) {
      await messageStore.markMessagesAsRead(conversation.other_user.id)
    } else {
      console.warn('other_user.id 为空，跳过标记已读')
    }
  } else {
    console.warn('对话或other_user不存在:', { conversation, conversationId })
  }
  
  // 滚动到底部
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const sendMessage = async () => {
  if (!newMessage.value.trim()) return
  
  const conversation = selectedConversation.value
  if (!conversation || !conversation.other_user) return
  
  const result = await messageStore.sendMessage(
    conversation.other_user.id,
    newMessage.value.trim()
  )
  
  if (result.success) {
    newMessage.value = ''
    // 滚动到底部
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    })
  } else {
    alert('发送失败: ' + result.error)
  }
}

const searchUsers = async () => {
  if (!userSearchQuery.value.trim()) {
    searchResults.value = []
    return
  }
  
  const result = await messageStore.searchUsers(userSearchQuery.value.trim())
  if (result.success) {
    searchResults.value = result.data
  }
}

const startNewConversation = async (user: any) => {
  // 这里可以创建新会话或直接跳转到对话
  searchResults.value = []
  userSearchQuery.value = ''
  
  // 查找是否已有会话
  const existingConversation = conversations.value.find(c => 
    c.other_user?.id === user.id
  )
  
  if (existingConversation) {
    selectConversation(existingConversation.id)
  } else {
    // 创建新会话的逻辑可以在这里实现
    alert('会话功能将在发送第一条消息时自动创建')
  }
}

const deleteCurrentConversation = async () => {
  if (!selectedConversationId.value) return
  
  if (!confirm('确定要删除这个对话吗？')) return
  
  const result = await messageStore.deleteConversation(selectedConversationId.value)
  if (result.success) {
    selectedConversationId.value = ''
  } else {
    alert('删除失败: ' + result.error)
  }
}

const openBookmark = (bookmark: any) => {
  selectedBookmark.value = bookmark
  bookmarkNote.value = bookmark.note || ''
}

const removeBookmark = async (bookmarkId: string) => {
  if (!confirm('确定要取消收藏吗？')) return
  
  const result = await bookmarkStore.removeBookmark(bookmarkId)
  if (result.success) {
    if (selectedBookmark.value?.id === bookmarkId) {
      selectedBookmark.value = null
    }
  } else {
    alert('取消收藏失败: ' + result.error)
  }
}

const updateBookmarkNote = async () => {
  if (!selectedBookmark.value) return
  
  await bookmarkStore.updateBookmarkNote(selectedBookmark.value.id, bookmarkNote.value)
}

const createFolder = async () => {
  if (!newFolderName.value.trim()) return
  
  const result = bookmarkStore.createFolder(newFolderName.value.trim())
  if (result.success) {
    newFolderName.value = ''
    showCreateFolderDialog.value = false
  } else {
    alert('创建收藏夹失败: ' + result.error)
  }
}

const goToPost = (postId: string) => {
  router.push(`/post/${postId}`)
}

const getBookmarkExcerpt = (bookmark: any) => {
  const content = bookmark.target_data?.content || ''
  return content.length > 100 ? content.substring(0, 100) + '...' : content
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

// 监听当前用户变化，重新加载数据
watch(() => authStore.user, () => {
  if (authStore.user) {
    loadInitialData()
  }
}, { immediate: true })
</script>

<style scoped>
.message-center {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.header {
  background: white;
  border-bottom: 1px solid #f0f0f0;
  padding: 1rem 0;
}

.container {
  max-width: 1200px;
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

.unread-indicator {
  position: relative;
  top: -8px;
  right: -8px;
  background: #ff4d4f;
  color: white;
  border-radius: 10px;
  padding: 0.125rem 0.375rem;
  font-size: 0.7rem;
  min-width: 16px;
  text-align: center;
  font-weight: bold;
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

.message-layout {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 2rem;
  height: calc(100vh - 200px);
}

.sidebar {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid #f0f0f0;
}

.tab-btn {
  flex: 1;
  padding: 1rem;
  border: none;
  background: none;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.tab-btn.active {
  color: #1890ff;
  border-bottom: 2px solid #1890ff;
}

.tab-btn:hover {
  background: #f8f9fa;
}

.unread-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: #ff4d4f;
  color: white;
  border-radius: 10px;
  padding: 0.125rem 0.375rem;
  font-size: 0.75rem;
  min-width: 18px;
  text-align: center;
}

.search-box {
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
  position: relative;
}

.search-box input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 0.9rem;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 1rem;
  right: 1rem;
  background: white;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
}

.search-result-item:hover {
  background: #f8f9fa;
}

.conversation-list,
.bookmark-list {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 1px solid #f0f0f0;
  position: relative;
}

.conversation-item:hover {
  background: #f8f9fa;
  transform: translateX(2px);
}

.conversation-item.active {
  background: #e6f7ff;
  border-left: 3px solid #1890ff;
}

.conversation-item::before {
  content: '';
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-right: 2px solid #ccc;
  border-bottom: 2px solid #ccc;
  transform: translateY(-50%) rotate(-45deg);
  opacity: 0;
  transition: opacity 0.2s;
}

.conversation-item:hover::before {
  opacity: 1;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.username {
  font-weight: 600;
  color: #333;
}

.time {
  font-size: 0.8rem;
  color: #999;
}

.last-message {
  color: #666;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.unread-count {
  background: #1890ff;
  color: white;
  border-radius: 10px;
  padding: 0.125rem 0.375rem;
  font-size: 0.75rem;
  min-width: 18px;
  text-align: center;
}

.folder-selector {
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  gap: 0.5rem;
}

.folder-selector select {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
}

.create-folder-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #1890ff;
  background: none;
  color: #1890ff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.create-folder-btn:hover {
  background: #e6f7ff;
}

.bookmark-item {
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.bookmark-item:hover {
  background: #f8f9fa;
}

.bookmark-content h4 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1rem;
}

.bookmark-excerpt {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.bookmark-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: #999;
}

.bookmark-actions {
  margin-top: 0.5rem;
}

.remove-btn {
  background: none;
  border: 1px solid #ff4d4f;
  color: #ff4d4f;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.remove-btn:hover {
  background: #fff1f0;
}

.content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.empty-conversation,
.empty-bookmark {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.chat-username {
  font-weight: 600;
  color: #333;
  flex: 1;
}

.delete-conversation-btn {
  background: none;
  border: 1px solid #ff4d4f;
  color: #ff4d4f;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.delete-conversation-btn:hover {
  background: #fff1f0;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.message {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.message.is-sent {
  flex-direction: row-reverse;
}

.message-content {
  max-width: 70%;
}

.message-bubble {
  background: #f0f0f0;
  padding: 0.75rem;
  border-radius: 12px;
  margin-bottom: 0.25rem;
}

.message.is-sent .message-bubble {
  background: #1890ff;
  color: white;
}

.message-time {
  font-size: 0.8rem;
  color: #999;
  text-align: right;
}

.message-input {
  padding: 1rem;
  border-top: 1px solid #f0f0f0;
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-wrapper textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  resize: vertical;
  font-family: inherit;
}

.input-wrapper textarea:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input-hint {
  color: #999;
  font-size: 0.8rem;
}

.send-btn {
  background: #1890ff;
  color: white;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.send-btn:hover:not(:disabled) {
  background: #40a9ff;
}

.send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.bookmark-detail {
  padding: 2rem;
}

.bookmark-header h3 {
  margin: 0 0 1rem 0;
  color: #333;
}

.bookmark-info {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  color: #666;
}

.bookmark-content-full {
  color: #333;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  white-space: pre-wrap;
}

.bookmark-note {
  margin-bottom: 1.5rem;
}

.bookmark-note label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 500;
}

.bookmark-note textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  resize: vertical;
  font-family: inherit;
}

.view-btn {
  background: #1890ff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 0.5rem;
}

.view-btn:hover {
  background: #40a9ff;
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
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  width: 90%;
  max-width: 400px;
}

.modal-content h3 {
  margin: 0 0 1rem 0;
  color: #333;
}

.modal-content input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn-primary,
.btn-secondary {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
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

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #999;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .message-layout {
    grid-template-columns: 1fr;
    height: auto;
  }
  
  .sidebar {
    height: 300px;
  }
  
  .content {
    height: 500px;
  }
}
</style>