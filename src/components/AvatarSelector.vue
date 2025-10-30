<template>
  <div class="avatar-selector">
    <div class="selector-header">
      <h3>选择头像</h3>
      <button @click="$emit('close')" class="close-btn" title="关闭">
        ✕
      </button>
    </div>
    <div class="avatar-grid">
      <div 
        v-for="avatar in avatars" 
        :key="avatar.id"
        class="avatar-option"
        :class="{ active: selectedAvatar === avatar.id }"
        @click="selectAvatar(avatar)"
      >
        <div class="avatar-preview" :style="{ backgroundColor: avatar.color }">
          <span class="avatar-icon">{{ avatar.icon }}</span>
        </div>
        <span class="avatar-name">{{ avatar.name }}</span>
      </div>
    </div>
    <div class="avatar-actions">
      <button @click="saveAvatar" class="btn-primary" :disabled="!selectedAvatar">
        保存头像
      </button>
      <button @click="$emit('close')" class="btn-secondary">
        取消
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

interface Avatar {
  id: string
  name: string
  icon: string
  color: string
}

const emit = defineEmits<{
  close: []
  select: [avatar: Avatar]
}>()

const selectedAvatar = ref<string>('')
const currentAvatar = ref<string>('')

const avatars: Avatar[] = [
  { id: 'cat', name: '猫咪', icon: '🐱', color: '#FF6B6B' },
  { id: 'dog', name: '小狗', icon: '🐶', color: '#4ECDC4' },
  { id: 'bear', name: '小熊', icon: '🐻', color: '#45B7D1' },
  { id: 'rabbit', name: '兔子', icon: '🐰', color: '#96CEB4' },
  { id: 'panda', name: '熊猫', icon: '🐼', color: '#FFEAA7' },
  { id: 'fox', name: '狐狸', icon: '🦊', color: '#DDA0DD' },
  { id: 'lion', name: '狮子', icon: '🦁', color: '#FFA07A' },
  { id: 'monkey', name: '猴子', icon: '🐵', color: '#98D8C8' },
  { id: 'pig', name: '小猪', icon: '🐷', color: '#FFB6C1' },
  { id: 'cow', name: '奶牛', icon: '🐮', color: '#87CEEB' },
  { id: 'tiger', name: '老虎', icon: '🐯', color: '#FFD700' },
  { id: 'elephant', name: '大象', icon: '🐘', color: '#F0E68C' },
  { id: 'giraffe', name: '长颈鹿', icon: '🦒', color: '#FFA500' },
  { id: 'penguin', name: '企鹅', icon: '🐧', color: '#B0E0E6' },
  { id: 'owl', name: '猫头鹰', icon: '🦉', color: '#D8BFD8' },
  { id: 'turtle', name: '乌龟', icon: '🐢', color: '#90EE90' }
]

onMounted(() => {
  // 从本地存储获取当前头像
  const saved = localStorage.getItem('userAvatar')
  if (saved) {
    selectedAvatar.value = saved
    currentAvatar.value = saved
  }
})

const selectAvatar = (avatar: Avatar) => {
  selectedAvatar.value = avatar.id
}

const saveAvatar = () => {
  if (!selectedAvatar.value) return
  
  const avatar = avatars.find(a => a.id === selectedAvatar.value)
  if (avatar) {
    emit('select', avatar)
    // 使用nextTick确保在DOM更新后再发出close事件
    nextTick(() => {
      emit('close')
    })
  }
}
</script>

<style scoped>
.avatar-selector {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.avatar-selector h3 {
  margin: 0;
  color: #333;
  font-size: 1.5rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #999;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #666;
}

.avatar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 1rem;
  padding: 1.5rem 2rem;
  flex: 1;
  overflow-y: auto;
}

.avatar-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.avatar-option:hover {
  background: #f8f9fa;
  transform: translateY(-2px);
}

.avatar-option.active {
  border-color: #1890ff;
  background: #e6f7ff;
}

.avatar-preview {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  font-size: 2rem;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.avatar-name {
  font-size: 0.875rem;
  color: #666;
  text-align: center;
}

.avatar-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  padding: 1rem 2rem 1.5rem;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

.btn-primary, .btn-secondary {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
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
</style>