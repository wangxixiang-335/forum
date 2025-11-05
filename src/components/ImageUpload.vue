<template>
  <div class="image-upload">
    <!-- 上传区域 -->
    <div 
      class="upload-area"
      :class="{ 'drag-over': isDragOver, 'has-images': images.length > 0 }"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="triggerFileInput"
    >
      <div v-if="images.length === 0" class="upload-placeholder">
        <i class="bi bi-cloud-upload"></i>
        <p>拖拽图片到此处或点击上传</p>
        <small>支持 JPG、PNG、GIF、WEBP，最大 5MB</small>
      </div>
      
      <div v-else class="upload-preview">
        <div class="preview-header">
          <span>已选择 {{ images.length }} 张图片</span>
          <button 
            type="button" 
            class="btn-add-more"
            @click.stop="triggerFileInput"
          >
            <i class="bi bi-plus"></i>
            添加更多
          </button>
        </div>
      </div>
      
      <input
        ref="fileInput"
        type="file"
        multiple
        :accept="supportedTypes.join(',')"
        @change="handleFileSelect"
        style="display: none"
      />
    </div>

    <!-- 图片预览 -->
    <div v-if="images.length > 0" class="image-preview-grid">
      <div 
        v-for="(image, index) in images" 
        :key="image.tempId"
        class="preview-item"
      >
        <div class="preview-image">
          <img 
            :src="image.previewUrl" 
            :alt="image.file.name"
          />
          
          <!-- 操作按钮 -->
          <div class="image-actions">
            <button 
              type="button" 
              class="btn-action btn-remove"
              @click="removeImage(index)"
              title="删除图片"
            >
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
        
        <div class="preview-info">
          <div class="file-name" :title="image.file.name">
            {{ truncateFileName(image.file.name) }}
          </div>
          <div class="file-size">
            {{ formatFileSize(image.file.size) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMessage" class="error-message">
      <i class="bi bi-exclamation-circle"></i>
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface ImageData {
  file: File
  previewUrl: string
  tempId: string
}

interface Props {
  maxFiles?: number
  maxSize?: number // MB
  modelValue?: ImageData[]
}

interface Emits {
  (e: 'update:modelValue', images: ImageData[]): void
  (e: 'upload-progress', progress: number): void
}

const props = withDefaults(defineProps<Props>(), {
  maxFiles: 10,
  maxSize: 5
})

const emit = defineEmits<Emits>()

// Refs
const fileInput = ref<HTMLInputElement>()
const images = ref<ImageData[]>(props.modelValue || [])
const isDragOver = ref(false)
const errorMessage = ref('')

// 支持的图片类型
const supportedTypes = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp'
]

// 监听外部传入的modelValue变化
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    images.value = newValue
  }
})

// 监听images变化，触发更新
watch(images, (newImages) => {
  emit('update:modelValue', newImages)
  // 计算上传进度（这里简化处理，实际应该根据上传状态计算）
  const totalImages = newImages.length
  if (totalImages > 0) {
    emit('upload-progress', 100)
  }
}, { deep: true })

// Methods
const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
  
  const files = e.dataTransfer?.files
  if (files) {
    handleFiles(Array.from(files))
  }
}

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files) {
    handleFiles(Array.from(input.files))
    input.value = '' // 重置输入框
  }
}

const handleFiles = (files: File[]) => {
  // 验证文件数量
  if (images.value.length + files.length > props.maxFiles) {
    errorMessage.value = `最多只能上传 ${props.maxFiles} 张图片`
    setTimeout(() => {
      errorMessage.value = ''
    }, 3000)
    return
  }

  // 验证每个文件
  const validFiles: File[] = []
  for (const file of files) {
    const validation = validateImageFile(file)
    if (!validation.isValid) {
      errorMessage.value = validation.error!
      setTimeout(() => {
        errorMessage.value = ''
      }, 3000)
      continue
    }
    validFiles.push(file)
  }

  if (validFiles.length === 0) return

  // 创建预览图片
  const newImages: ImageData[] = validFiles.map(file => ({
    file,
    previewUrl: URL.createObjectURL(file),
    tempId: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }))

  images.value = [...images.value, ...newImages]
}

const validateImageFile = (file: File) => {
  // 检查文件类型
  if (!supportedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: '不支持的文件类型，请选择JPG、PNG、GIF或WEBP格式的图片'
    }
  }

  // 检查文件大小
  const maxSizeBytes = props.maxSize * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `文件大小超过限制，请选择小于${props.maxSize}MB的图片`
    }
  }

  return { isValid: true }
}

const removeImage = (index: number) => {
  const image = images.value[index]
  
  // 释放预览URL
  if (image.previewUrl) {
    URL.revokeObjectURL(image.previewUrl)
  }
  
  images.value.splice(index, 1)
}

const truncateFileName = (fileName: string, maxLength = 20) => {
  if (fileName.length <= maxLength) return fileName
  return fileName.substring(0, maxLength - 3) + '...'
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 清理函数，在组件销毁时释放所有预览URL
const cleanup = () => {
  images.value.forEach(image => {
    if (image.previewUrl) {
      URL.revokeObjectURL(image.previewUrl)
    }
  })
}

// 公开方法
defineExpose({
  getImages: () => images.value,
  clearImages: () => {
    cleanup()
    images.value = []
  }
})

// 生命周期
import { onUnmounted } from 'vue'
onUnmounted(() => {
  cleanup()
})
</script>

<style scoped>
.image-upload {
  width: 100%;
}

.upload-area {
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fafafa;
}

.upload-area:hover {
  border-color: #1890ff;
  background: #f0f8ff;
}

.upload-area.drag-over {
  border-color: #1890ff;
  background: #e6f7ff;
  transform: scale(1.02);
}

.upload-area.has-images {
  padding: 1rem;
  min-height: auto;
}

.upload-placeholder i {
  font-size: 3rem;
  color: #bfbfbf;
  margin-bottom: 1rem;
  display: block;
}

.upload-placeholder p {
  margin: 0 0 0.5rem 0;
  color: #666;
  font-weight: 500;
}

.upload-placeholder small {
  color: #999;
}

.upload-preview {
  width: 100%;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.preview-header span {
  color: #666;
  font-weight: 500;
}

.btn-add-more {
  background: #1890ff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-add-more:hover {
  background: #40a9ff;
}

.image-preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.preview-item {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.preview-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preview-image {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
}

.preview-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-actions {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.preview-item:hover .image-actions {
  opacity: 1;
}

.btn-action {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  transition: all 0.3s ease;
}

.btn-action:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: scale(1.1);
}

.preview-info {
  padding: 0.75rem;
}

.file-name {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 0.75rem;
  color: #999;
}

.error-message {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  color: #a8071a;
  padding: 0.75rem;
  border-radius: 4px;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .image-preview-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.75rem;
  }
  
  .upload-area {
    padding: 1.5rem;
  }
  
  .upload-placeholder i {
    font-size: 2.5rem;
  }
}
</style>