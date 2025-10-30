<template>
  <div class="user-avatar" :style="{ width: size, height: size }">
    <div 
      v-if="avatarData" 
      class="avatar-content"
      :style="{ backgroundColor: avatarData.color }"
    >
      <span class="avatar-icon">{{ avatarData.icon }}</span>
    </div>
    <div v-else class="avatar-content avatar-default">
      <span class="avatar-text">{{ firstLetter }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

interface Avatar {
  id: string
  name: string
  icon: string
  color: string
}

interface Props {
  username?: string
  avatarId?: string | null
  size?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: '40px'
})

const avatarData = ref<Avatar | null>(null)

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

const firstLetter = computed(() => {
  return props.username ? props.username.charAt(0).toUpperCase() : 'U'
})

const loadAvatar = () => {
  try {
    const avatarId = props.avatarId || localStorage.getItem('userAvatar')
    if (avatarId) {
      const avatar = avatars.find(a => a.id === avatarId)
      if (avatar) {
        avatarData.value = avatar
      } else {
        avatarData.value = null
      }
    } else {
      avatarData.value = null
    }
  } catch (error) {
    console.warn('加载头像失败:', error)
    avatarData.value = null
  }
}

// 监听avatarId的变化
watch(() => props.avatarId, () => {
  loadAvatar()
}, { immediate: true })

onMounted(() => {
  loadAvatar()
})

// 暴露方法供外部调用
defineExpose({
  loadAvatar
})
</script>

<style scoped>
.user-avatar {
  border-radius: 50%;
  overflow: hidden;
  display: inline-block;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.avatar-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.avatar-default {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.avatar-icon {
  font-size: calc(0.6 * var(--avatar-size, 40px));
}

.avatar-text {
  font-size: calc(0.5 * var(--avatar-size, 40px));
  text-transform: uppercase;
}
</style>