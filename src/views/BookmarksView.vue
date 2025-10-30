<template>
  <div class="bookmarks-view">
    <header class="header">
      <div class="container">
        <div class="header-content">
          <RouterLink to="/" class="back-link">
            <i class="bi bi-arrow-left"></i>
            返回首页
          </RouterLink>
          <h1 class="page-title">我的收藏</h1>
        </div>
      </div>
    </header>

    <main class="main">
      <div class="container">
        <div class="bookmarks-layout">
          <!-- 收藏夹侧边栏 -->
          <aside class="bookmarks-sidebar">
            <div class="sidebar-header">
              <h5>收藏夹</h5>
              <button class="btn btn-sm btn-primary" @click="showCreateFolderModal = true">
                <i class="bi bi-plus"></i>
                新建
              </button>
            </div>
            
            <div class="folders-list">
              <div
                v-for="folder in folders"
                :key="folder"
                class="folder-item"
                :class="{ active: currentFolder === folder }"
                @click="selectFolder(folder)"
              >
                <i class="bi bi-folder"></i>
                <span>{{ folder }}</span>
                <span class="folder-count">({{ getFolderCount(folder) }})</span>
              </div>
            </div>
          </aside>

          <!-- 收藏内容区域 -->
          <section class="bookmarks-content">
            <div class="content-header">
              <h2>{{ currentFolder }}</h2>
              <div class="content-actions">
                <button
                  v-if="selectedBookmarks.length > 0"
                  class="btn btn-sm btn-danger"
                  @click="handleBatchDelete"
                >
                  <i class="bi bi-trash"></i>
                  删除选中 ({{ selectedBookmarks.length }})
                </button>
                <button
                  class="btn btn-sm btn-outline-secondary"
                  @click="toggleSelectMode"
                >
                  <i class="bi" :class="isSelectMode ? 'bi-x-square' : 'bi-check-square'"></i>
                  {{ isSelectMode ? '取消选择' : '批量管理' }}
                </button>
              </div>
            </div>

            <!-- 加载状态 -->
            <div v-if="isLoading" class="loading-container">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">加载中...</span>
              </div>
              <p>加载收藏中...</p>
            </div>

            <!-- 收藏列表 -->
            <div v-else-if="currentFolderBookmarks.length > 0" class="bookmarks-list">
              <div
                v-for="bookmark in currentFolderBookmarks"
                :key="bookmark.id"
                class="bookmark-item"
                :class="{ selected: selectedBookmarks.includes(bookmark.id) }"
              >
                <!-- 选择框 -->
                <div v-if="isSelectMode" class="bookmark-checkbox">
                  <input
                    type="checkbox"
                    :checked="selectedBookmarks.includes(bookmark.id)"
                    @change="toggleBookmarkSelection(bookmark.id)"
                  />
                </div>

                <!-- 收藏内容 -->
                <div class="bookmark-content">
                  <div v-if="bookmark.target_type === 'post'" class="bookmark-post">
                    <h3 class="bookmark-title">
                      <RouterLink v-if="bookmark.target_data && bookmark.target_data.title && !bookmark.target_data.title.includes('已删除') && !bookmark.target_data.title.includes('加载失败')" :to="`/post/${bookmark.target_id}`">
                        {{ bookmark.target_data.title }}
                      </RouterLink>
                      <span v-else class="deleted-post">
                        {{ bookmark.target_data?.title || '帖子已被删除' }}
                      </span>
                    </h3>
                    <p class="bookmark-excerpt">
                      {{ truncateText(bookmark.target_data?.content || '此帖子已被删除，但收藏记录保留', 150) }}
                    </p>
                    <div class="bookmark-meta">
                      <span class="bookmark-stats">
                        <i class="bi bi-heart"></i>
                        {{ bookmark.target_data?.like_count || 0 }}
                        <i class="bi bi-chat"></i>
                        {{ bookmark.target_data?.comment_count || 0 }}
                      </span>
                      <span class="bookmark-time">
                        收藏于 {{ formatTime(bookmark.created_at) }}
                      </span>
                    </div>
                  </div>

                  <div v-else-if="bookmark.target_type === 'comment'" class="bookmark-comment">
                    <p class="bookmark-excerpt">
                      {{ truncateText(bookmark.target_data?.content || '此评论已被删除，但收藏记录保留', 200) }}
                    </p>
                    <div class="bookmark-meta">
                      <span class="bookmark-post-link">
                        来自帖子：
                        <span v-if="bookmark.target_data?.post_title">
                          <RouterLink :to="`/post/${bookmark.target_data?.post_id}`">
                            {{ bookmark.target_data.post_title }}
                          </RouterLink>
                        </span>
                        <span v-else class="deleted-post">
                          原帖子已被删除
                        </span>
                      </span>
                      <span class="bookmark-time">
                        收藏于 {{ formatTime(bookmark.created_at) }}
                      </span>
                    </div>
                  </div>

                  <!-- 备注 -->
                  <div v-if="bookmark.note" class="bookmark-note">
                    <i class="bi bi-sticky"></i>
                    {{ bookmark.note }}
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div class="bookmark-actions">
                  <button
                    class="btn btn-sm btn-outline-primary action-btn"
                    @click="editBookmarkNote(bookmark)"
                    title="编辑备注"
                  >
                    <i class="bi bi-pencil"></i>
                    <span class="action-text">编辑</span>
                  </button>
                  <button
                    class="btn btn-sm btn-outline-danger action-btn"
                    @click="deleteBookmark(bookmark.id)"
                    title="删除收藏"
                  >
                    <i class="bi bi-trash"></i>
                    <span class="action-text">删除</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-else class="empty-state">
              <i class="bi bi-bookmark"></i>
              <h5>暂无收藏</h5>
              <p>这个收藏夹里还没有任何内容</p>
            </div>
          </section>
        </div>
      </div>
    </main>

    <!-- 创建收藏夹模态框 -->
    <div v-if="showCreateFolderModal" class="modal-overlay" @click="showCreateFolderModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h5>创建新收藏夹</h5>
          <button class="btn-close" @click="showCreateFolderModal = false"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">收藏夹名称</label>
            <input
              v-model="newFolderName"
              type="text"
              class="form-control"
              placeholder="输入收藏夹名称..."
              maxlength="20"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCreateFolderModal = false">
            取消
          </button>
          <button class="btn btn-primary" @click="createNewFolder" :disabled="!newFolderName.trim()">
            创建
          </button>
        </div>
      </div>
    </div>

    <!-- 编辑备注模态框 -->
    <div v-if="showEditNoteModal" class="modal-overlay" @click="showEditNoteModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h5>编辑备注</h5>
          <button class="btn-close" @click="showEditNoteModal = false"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">备注内容</label>
            <textarea
              v-model="editNoteText"
              class="form-control"
              rows="3"
              placeholder="添加备注..."
              maxlength="200"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showEditNoteModal = false">
            取消
          </button>
          <button class="btn btn-primary" @click="saveBookmarkNote">
            保存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useBookmarkStore } from '@/stores/bookmarks'

const bookmarkStore = useBookmarkStore()
const {
  isLoading,
  fetchBookmarks,
  fetchFolders,
  removeBookmark,
  updateBookmarkNote,
  createFolder,
  fetchAllFolderCounts,
  fetchAllUserBookmarks
} = bookmarkStore

// 保持响应性的引用
const bookmarks = computed(() => bookmarkStore.bookmarks)
const folders = computed(() => bookmarkStore.folders)

// 响应式数据
const currentFolder = ref('默认收藏夹')
const selectedBookmarks = ref<string[]>([])
const isSelectMode = ref(false)
const showCreateFolderModal = ref(false)
const showEditNoteModal = ref(false)
const newFolderName = ref('')
const editNoteText = ref('')
const editingBookmarkId = ref('')
const allFolderCounts = ref<{ [key: string]: number }>({})
const allBookmarksLoaded = ref(false)

// 计算属性
const folderCounts = computed(() => {
  const counts: { [key: string]: number } = {}
  // 使用从store获取的完整计数
  Object.assign(counts, allFolderCounts.value)
  
  // 确保每个文件夹都有计数（即使为0）
  if (folders.value && Array.isArray(folders.value)) {
    folders.value.forEach(folder => {
      if (!(folder in counts)) {
        counts[folder] = 0
      }
    })
  }
  
  console.log('BookmarksView: folderCounts', counts)
  return counts
})

// 当前收藏夹的收藏列表
const currentFolderBookmarks = computed(() => {
  const bookmarksData = bookmarks.value
  console.log('BookmarksView: bookmarks.value', bookmarksData)
  
  if (!bookmarksData || !Array.isArray(bookmarksData)) {
    console.log('BookmarksView: bookmarks.value 为空或不是数组', bookmarksData)
    return []
  }
  
  console.log('BookmarksView: 当前收藏夹:', currentFolder.value)
  console.log('BookmarksView: 所有收藏数据:', bookmarksData)
  
  // 详细检查每个收藏记录的folder_name
  bookmarksData.forEach((bookmark, index) => {
    console.log(`收藏记录 ${index + 1}:`, {
      id: bookmark.id,
      folder_name: bookmark.folder_name,
      folder_name_type: typeof bookmark.folder_name,
      folder_name_length: bookmark.folder_name ? bookmark.folder_name.length : 0,
      currentFolder: currentFolder.value,
      match: bookmark.folder_name === currentFolder.value
    })
  })
  
  const filtered = bookmarksData.filter(bookmark => {
    const match = bookmark.folder_name === currentFolder.value
    console.log(`比较: "${bookmark.folder_name}" === "${currentFolder.value}" = ${match}`)
    return match
  })
  
  console.log('BookmarksView: 过滤后的收藏:', filtered)
  return filtered
})

// 方法
const selectFolder = (folder: string) => {
  console.log('BookmarksView: 切换到收藏夹:', folder)
  currentFolder.value = folder
  selectedBookmarks.value = []
  isSelectMode.value = false
  // 不再需要重新获取数据，因为所有数据已经加载
}

const getFolderCount = (folder: string) => {
  const count = folderCounts.value[folder] || 0
  console.log(`getFolderCount: 收藏夹 "${folder}" 的数量: ${count}`)
  return count
}

// 获取所有收藏夹计数
const loadAllFolderCounts = async () => {
  try {
    const counts = await fetchAllFolderCounts()
    allFolderCounts.value = counts
  } catch (error) {
    console.error('加载收藏夹计数失败:', error)
  }
}

const toggleSelectMode = () => {
  isSelectMode.value = !isSelectMode.value
  if (!isSelectMode.value) {
    selectedBookmarks.value = []
  }
}

const toggleBookmarkSelection = (bookmarkId: string) => {
  const index = selectedBookmarks.value.indexOf(bookmarkId)
  if (index > -1) {
    selectedBookmarks.value.splice(index, 1)
  } else {
    selectedBookmarks.value.push(bookmarkId)
  }
}

const handleBatchDelete = async () => {
  if (!confirm(`确定要删除选中的 ${selectedBookmarks.value.length} 个收藏吗？`)) {
    return
  }

  try {
    for (const bookmarkId of selectedBookmarks.value) {
      await removeBookmark(bookmarkId)
    }
    selectedBookmarks.value = []
    isSelectMode.value = false
    
    // 重新获取所有数据
    const result = await fetchAllUserBookmarks()
    if (result.success) {
      allFolderCounts.value = result.folderCounts
    }
  } catch (error) {
    console.error('批量删除失败:', error)
    alert('删除失败，请稍后重试')
  }
}

const deleteBookmark = async (bookmarkId: string) => {
  if (!confirm('确定要删除这个收藏吗？')) {
    return
  }

  const result = await removeBookmark(bookmarkId)
  if (result.success) {
    // 重新获取所有数据
    const refreshResult = await fetchAllUserBookmarks()
    if (refreshResult.success) {
      allFolderCounts.value = refreshResult.folderCounts
    }
  } else {
    alert('删除失败：' + (result.error || '未知错误'))
  }
}

const editBookmarkNote = (bookmark: any) => {
  editingBookmarkId.value = bookmark.id
  editNoteText.value = bookmark.note || ''
  showEditNoteModal.value = true
}

const saveBookmarkNote = async () => {
  const result = await updateBookmarkNote(editingBookmarkId.value, editNoteText.value)
  if (result.success) {
    showEditNoteModal.value = false
    // 重新获取所有数据
    const refreshResult = await fetchAllUserBookmarks()
    if (refreshResult.success) {
      allFolderCounts.value = refreshResult.folderCounts
    }
  } else {
    alert('保存失败：' + (result.error || '未知错误'))
  }
}

const createNewFolder = async () => {
  if (!newFolderName.value.trim()) return

  const result = await createFolder(newFolderName.value.trim())
  if (result.success) {
    await fetchFolders()
    newFolderName.value = ''
    showCreateFolderModal.value = false
  } else {
    alert('创建失败：' + (result.error || '未知错误'))
  }
}

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 86400000) {
    return '今天'
  } else if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

// 组件挂载时加载数据
onMounted(async () => {
  await fetchFolders()
  
  // 一次性获取所有收藏数据
  const result = await fetchAllUserBookmarks()
  if (result.success) {
    allFolderCounts.value = result.folderCounts
    allBookmarksLoaded.value = true
    console.log('BookmarksView: onMounted 获取到的收藏数据:', result.data)
    
    // 设置当前收藏夹为用户的第一个收藏夹
    if (folders.value && folders.value.length > 0) {
      currentFolder.value = folders.value[0]
      console.log('BookmarksView: 设置当前收藏夹为:', currentFolder.value)
    }
  }
})

// 监听文件夹变化，更新文件夹列表
watch(folders, (newFolders) => {
  if (!newFolders.includes(currentFolder.value)) {
    currentFolder.value = newFolders[0] || '默认收藏夹'
  }
})
</script>

<style scoped>
.bookmarks-view {
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

.header-content {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 1rem 20px;
}

.back-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #495057;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.2s;
}

.back-link:hover {
  background-color: #f8f9fa;
  color: #007bff;
}

.page-title {
  margin: 0;
  color: #212529;
  font-size: 24px;
  font-weight: 600;
}

.main {
  padding: 2rem 0;
}

.bookmarks-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 24px;
}

.bookmarks-sidebar {
  background: white;
  border-radius: 8px;
  padding: 20px;
  height: fit-content;
  position: sticky;
  top: 100px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.sidebar-header h5 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.folders-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.folder-item:hover {
  background-color: #f8f9fa;
}

.folder-item.active {
  background-color: #e3f2fd;
  color: #1976d2;
}

.folder-count {
  margin-left: auto;
  font-size: 12px;
  color: #6c757d;
}

.bookmarks-content {
  background: white;
  border-radius: 8px;
  padding: 24px;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.content-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #212529;
}

.content-actions {
  display: flex;
  gap: 12px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  gap: 16px;
}

.bookmarks-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bookmark-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  transition: all 0.2s;
}

.bookmark-item:hover {
  border-color: #007bff;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
}

.bookmark-item.selected {
  background-color: #f8f9fa;
  border-color: #007bff;
}

.bookmark-checkbox {
  display: flex;
  align-items: flex-start;
  padding-top: 4px;
}

.bookmark-content {
  flex: 1;
}

.bookmark-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
}

.bookmark-title a {
  color: #212529;
  text-decoration: none;
}

.bookmark-title a:hover {
  color: #007bff;
}

.bookmark-excerpt {
  color: #6c757d;
  line-height: 1.5;
  margin-bottom: 12px;
}

.bookmark-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #6c757d;
}

.bookmark-stats {
  display: flex;
  gap: 12px;
}

.bookmark-stats i {
  margin-right: 4px;
}

.bookmark-post-link a {
  color: #007bff;
  text-decoration: none;
}

.bookmark-post-link a:hover {
  text-decoration: underline;
}

.bookmark-note {
  margin-top: 12px;
  padding: 8px 12px;
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  font-size: 14px;
  color: #856404;
}

.bookmark-note i {
  margin-right: 6px;
}

.bookmark-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 80px;
  padding: 6px 12px;
  font-size: 13px;
  transition: all 0.2s ease;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-btn i {
  font-size: 14px;
}

.action-text {
  font-weight: 500;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6c757d;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
  display: block;
}

.empty-state h5 {
  margin-bottom: 8px;
  color: #495057;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h5 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6c757d;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.btn-close:hover {
  background-color: #f8f9fa;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e9ecef;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.btn-primary {
  background-color: #007bff;
  border-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
  border-color: #004085;
}

.btn-secondary {
  background-color: #6c757d;
  border-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #545b62;
  border-color: #545b62;
}

.btn-outline-primary {
  background-color: transparent;
  border-color: #007bff;
  color: #007bff;
}

.btn-outline-primary:hover {
  background-color: #007bff;
  color: white;
}

.btn-outline-danger {
  background-color: transparent;
  border-color: #dc3545;
  color: #dc3545;
}

.btn-outline-danger:hover {
  background-color: #dc3545;
  color: white;
}

.btn-outline-secondary {
  background-color: transparent;
  border-color: #6c757d;
  color: #6c757d;
}

.btn-outline-secondary:hover {
  background-color: #6c757d;
  color: white;
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.form-control {
  display: block;
  width: 100%;
  padding: 12px;
  font-size: 16px;
  line-height: 1.5;
  color: #495057;
  background-color: #fff;
  border: 1px solid #ced4da;
  border-radius: 6px;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-control:focus {
  border-color: #80bdff;
  outline: 0;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.form-label {
  margin-bottom: 8px;
  font-weight: 500;
  color: #495057;
}

@media (max-width: 768px) {
  .bookmarks-layout {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .bookmarks-sidebar {
    position: static;
  }
  
  .content-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .bookmark-item {
    flex-direction: column;
  }
  
  .bookmark-actions {
    flex-direction: row;
    justify-content: flex-end;
    margin-top: 12px;
  }
  
  .action-btn {
    min-width: 70px;
    padding: 8px 10px;
    font-size: 12px;
  }
  
  .action-text {
    display: inline;
  }
}
</style>