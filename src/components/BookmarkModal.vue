<template>
  <div class="bookmark-modal-overlay" @click="$emit('close')">
    <div class="bookmark-modal" @click.stop>
      <div class="modal-header">
        <h5 class="modal-title">
          <i class="bi bi-bookmark-star"></i>
          收藏帖子
        </h5>
        <button type="button" class="btn-close" @click="$emit('close')"></button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="handleBookmark">
          <div class="mb-3">
            <label for="folder-name" class="form-label">收藏夹</label>
            <div class="folder-input-group">
              <select
                id="folder-name"
                v-model="selectedFolder"
                class="form-select"
                required
                :disabled="isLoadingFolders"
              >
                <option value="">选择收藏夹...</option>
                <option 
                  v-for="folder in existingFolders" 
                  :key="folder" 
                  :value="folder"
                >
                  {{ folder }}
                </option>
                <option value="__new__">+ 创建新收藏夹</option>
              </select>
              <div v-if="isLoadingFolders" class="loading-folders">
                <span class="spinner-border spinner-border-sm me-2"></span>
                加载收藏夹...
              </div>
            </div>
          </div>

          <div v-if="selectedFolder === '__new__'" class="mb-3">
            <label for="new-folder-name" class="form-label">新收藏夹名称</label>
            <input
              id="new-folder-name"
              v-model="newFolderName"
              type="text"
              class="form-control"
              placeholder="输入收藏夹名称..."
              maxlength="20"
              required
            />
            <div class="form-text">
              {{ newFolderName.length }}/20 字符
            </div>
          </div>

          <div class="mb-3">
            <label for="bookmark-note" class="form-label">备注（可选）</label>
            <textarea
              id="bookmark-note"
              v-model="bookmarkNote"
              class="form-control"
              rows="3"
              placeholder="添加备注..."
              maxlength="200"
            ></textarea>
            <div class="form-text">
              {{ bookmarkNote.length }}/200 字符
            </div>
          </div>

          <div class="post-preview">
            <h6>帖子预览</h6>
            <div class="preview-content">
              <h6>{{ post.title }}</h6>
              <p>{{ truncateText(post.content, 100) }}</p>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="$emit('close')">
              取消
            </button>
            <button 
              type="submit" 
              class="btn btn-primary" 
              :disabled="!canSubmit || isBookmarking"
            >
              <span v-if="isBookmarking">
                <span class="spinner-border spinner-border-sm me-2"></span>
                收藏中...
              </span>
              <span v-else>
                <i class="bi bi-bookmark-plus me-2"></i>
                确认收藏
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBookmarkStore } from '@/stores/bookmarks'

interface Props {
  post: {
    id: string
    title: string
    content: string
  }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  bookmarked: []
}>()

const bookmarksStore = useBookmarkStore()
const { addBookmark, fetchFolders, createFolder } = bookmarksStore

const selectedFolder = ref('')
const newFolderName = ref('')
const bookmarkNote = ref('')
const isBookmarking = ref(false)
const isLoadingFolders = ref(false)
const existingFolders = ref<string[]>(['默认收藏夹']) // 提供默认值

const canSubmit = computed(() => {
  if (selectedFolder.value === '__new__') {
    return newFolderName.value.trim() !== ''
  }
  return selectedFolder.value !== ''
})

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const handleBookmark = async () => {
  if (!canSubmit.value) return

  isBookmarking.value = true
  try {
    let folderName = selectedFolder.value
    
    // 如果是创建新收藏夹
    if (selectedFolder.value === '__new__') {
      folderName = newFolderName.value.trim()
      console.log('创建新收藏夹:', folderName)
      
      const createResult = await createFolder(folderName)
      if (!createResult.success) {
        console.error('创建收藏夹失败:', createResult.error)
        alert('创建收藏夹失败：' + (createResult.error || '未知错误'))
        return
      }
      console.log('创建收藏夹成功')
    }

    console.log('开始收藏，文件夹:', folderName, '帖子ID:', props.post.id)

    const result = await addBookmark(
      'post',
      props.post.id,
      folderName,
      bookmarkNote.value.trim()
    )
    
    console.log('收藏结果:', result)
    
    if (result.success) {
      emit('bookmarked')
      emit('close')
    } else {
      console.error('收藏失败:', result.error)
      alert('收藏失败：' + (result.error || '未知错误'))
    }
  } catch (error) {
    console.error('收藏异常:', error)
    alert('收藏失败，请稍后重试')
  } finally {
    isBookmarking.value = false
  }
}

const loadExistingFolders = async () => {
  isLoadingFolders.value = true
  try {
    console.log('BookmarkModal: 开始加载收藏夹...')
    await fetchFolders()
    existingFolders.value = bookmarksStore.folders
    console.log('BookmarkModal: 收藏夹加载完成:', existingFolders.value)
    
    // 如果没有获取到收藏夹，至少提供默认选项
    if (existingFolders.value.length === 0) {
      console.log('BookmarkModal: 没有找到收藏夹，使用默认收藏夹')
      existingFolders.value = ['默认收藏夹']
    }
  } catch (error) {
    console.error('BookmarkModal: 加载收藏夹失败:', error)
    // 出错时提供默认选项
    existingFolders.value = ['默认收藏夹']
  } finally {
    isLoadingFolders.value = false
  }
}

onMounted(() => {
  loadExistingFolders()
})
</script>

<style scoped>
.bookmark-modal-overlay {
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

.folder-input-group {
  position: relative;
}

.loading-folders {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #6c757d;
}

.bookmark-modal {
  background: white;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #212529;
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

.form-label {
  font-weight: 500;
  color: #495057;
  margin-bottom: 8px;
}

.form-control,
.form-select {
  border: 1px solid #ced4da;
  border-radius: 6px;
  padding: 12px;
  font-size: 16px;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-control:focus,
.form-select:focus {
  border-color: #86b7fe;
  outline: 0;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
}

.form-text {
  font-size: 14px;
  color: #6c757d;
  margin-top: 4px;
}

.post-preview {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
}

.post-preview h6 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #495057;
}

.preview-content h6 {
  display: block;
  font-weight: 600;
  color: #212529;
  margin-bottom: 8px;
  font-size: 16px;
}

.preview-content p {
  margin: 0;
  color: #6c757d;
  font-size: 14px;
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-secondary {
  background-color: #6c757d;
  border-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #5c636a;
  border-color: #565e64;
}

.btn-primary {
  background-color: #0d6efd;
  border-color: #0d6efd;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0b5ed7;
  border-color: #0a58ca;
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.spinner-border-sm {
  width: 1rem;
  height: 1rem;
}

.spinner-border {
  display: inline-block;
  width: 2rem;
  height: 2rem;
  vertical-align: -0.125em;
  border: 0.25em solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spinner-border 0.75s linear infinite;
}

@keyframes spinner-border {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 576px) {
  .bookmark-modal-overlay {
    padding: 10px;
  }
  
  .bookmark-modal {
    max-width: 100%;
  }
  
  .modal-header,
  .modal-body {
    padding: 16px;
  }
  
  .modal-footer {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>