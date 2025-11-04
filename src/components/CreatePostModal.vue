<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>发布新帖子</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      
      <form @submit.prevent="handleSubmit" class="post-form">
        <div class="form-group">
          <label for="title">标题</label>
          <input
            id="title"
            v-model="form.title"
            type="text"
            placeholder="请输入帖子标题"
            required
            maxlength="100"
          />
          <span class="char-count">{{ form.title.length }}/100</span>
        </div>
        
        <div class="form-group">
          <label for="content">内容</label>
          <textarea
            id="content"
            v-model="form.content"
            placeholder="请输入帖子内容（支持Markdown语法）"
            required
            rows="8"
            maxlength="5000"
          ></textarea>
          <span class="char-count">{{ form.content.length }}/5000</span>
        </div>
        
        <div class="form-group">
          <label for="tags">标签（可选，用逗号分隔）</label>
          <input
            id="tags"
            v-model="form.tagsInput"
            type="text"
            placeholder="例如：技术,前端,Vue"
          />
          <div v-if="form.tags.length > 0" class="tags-preview">
            <span v-for="tag in form.tags" :key="tag" class="tag-preview">
              {{ tag }}
            </span>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" @click="$emit('close')" class="btn-secondary">
            取消
          </button>
          <button type="submit" :disabled="!isFormValid || loading" class="btn-primary">
            {{ loading ? '发布中...' : '发布' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePostStore } from '@/stores/posts'

interface Emits {
  (e: 'close'): void
  (e: 'created'): void
}

const emit = defineEmits<Emits>()

const postStore = usePostStore()

const form = ref({
  title: '',
  content: '',
  tagsInput: '',
  tags: [] as string[]
})

const loading = ref(false)

// 监听标签输入变化
watch(() => form.value.tagsInput, (newValue) => {
  if (newValue.trim()) {
    form.value.tags = newValue
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .slice(0, 5) // 最多5个标签
  } else {
    form.value.tags = []
  }
})

// 表单验证
const isFormValid = computed(() => {
  return form.value.title.trim().length > 0 && 
         form.value.content.trim().length > 0 &&
         form.value.title.length <= 100 &&
         form.value.content.length <= 5000
})

const handleSubmit = async () => {
  if (!isFormValid.value) return
  
  loading.value = true
  
  try {
    console.log('开始提交帖子，内容长度:', form.value.content.length)
    
    const result = await postStore.createPost(
      form.value.title.trim(),
      form.value.content.trim(),
      form.value.tags
    )
    
    if (result.success) {
      console.log('帖子创建成功')
      emit('created')
      // 重置表单
      form.value = {
        title: '',
        content: '',
        tagsInput: '',
        tags: []
      }
      
      // 显示成功提示
      alert('帖子发布成功！')
    } else {
      // 显示详细的错误信息
      const errorMessage = result.error?.message || '发布失败'
      const errorDetails = result.error?.details ? `

错误详情: ${result.error.details}` : ''
      const errorCode = result.error?.code ? `
错误代码: ${result.error.code}` : ''
      const contentLength = result.error?.contentLength ? `
内容长度: ${result.error.contentLength}字符` : ''
      
      alert(`发布失败: ${errorMessage}${errorCode}${contentLength}${errorDetails}`)
    }
  } catch (error: any) {
    console.error('发布帖子失败:', error)
    
    // 提供更详细的错误信息
    let errorMessage = error.message || '发布失败，请重试'
    
    if (error.message?.includes('timeout') || error.message?.includes('超时')) {
      errorMessage = `发布超时（${form.value.content.length}字符内容可能需要更长时间），请稍后检查帖子是否已创建成功`
    } else if (error.code === 'PGRST301') {
      errorMessage = '数据库连接失败，请检查网络连接'
    } else if (error.code === 'PGRST116') {
      errorMessage = '认证失败，请重新登录'
    }
    
    alert(`发布失败: ${errorMessage}`)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
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
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.post-form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
  position: relative;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #333;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.char-count {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  font-size: 0.875rem;
  color: #999;
}

.tags-preview {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.tag-preview {
  background: #e6f7ff;
  color: #1890ff;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

.btn-secondary {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #d9d9d9;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-secondary:hover {
  background: #e8e8e8;
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

.btn-primary:hover:not(:disabled) {
  background: #40a9ff;
}

.btn-primary:disabled {
  background: #bae7ff;
  cursor: not-allowed;
}
</style>