<template>
  <div v-if="showStatus" class="connection-status" :class="statusClass">
    <div class="status-content">
      <div class="status-info">
        <span class="status-icon">{{ statusIcon }}</span>
        <span class="status-text">{{ statusText }}</span>
      </div>
      <div class="status-actions">
        <button v-if="!isConnected" @click="retryConnection" class="retry-btn">
          重试
        </button>
        <button @click="showDetails = !showDetails" class="details-btn">
          {{ showDetails ? '隐藏' : '详情' }}
        </button>
        <button @click="showStatus = false" class="close-btn" title="关闭">
          ×
        </button>
      </div>
    </div>
    
    <div v-if="showDetails" class="details-panel">
      <div class="detail-item">
        <strong>Supabase URL:</strong> 
        <span :class="{ 'valid': isUrlValid, 'invalid': !isUrlValid }">
          {{ supabaseUrl || '未配置' }}
        </span>
      </div>
      <div class="detail-item">
        <strong>Anon Key:</strong> 
        <span :class="{ 'valid': isKeyValid, 'invalid': !isKeyValid }">
          {{ isKeyValid ? '已配置' : '未配置' }}
        </span>
      </div>
      <div class="detail-item">
        <strong>认证状态:</strong> 
        <span>{{ authStatus }}</span>
      </div>
      <div v-if="lastError" class="detail-item error">
        <strong>错误信息:</strong> 
        <span>{{ lastError }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/services/supabase'

const showStatus = ref(true)
const showDetails = ref(false)
const isConnected = ref(false)
const lastError = ref<string | null>(null)
const checking = ref(false)

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isUrlValid = computed(() => {
  return supabaseUrl && !supabaseUrl.includes('default.supabase.co')
})

const isKeyValid = computed(() => {
  return supabaseKey && !supabaseKey.includes('default')
})

const statusClass = computed(() => {
  if (checking.value) return 'checking'
  if (isConnected.value) return 'connected'
  return 'disconnected'
})

const statusIcon = computed(() => {
  if (checking.value) return '⏳'
  if (isConnected.value) return '✅'
  return '❌'
})

const statusText = computed(() => {
  if (checking.value) return '检查连接中...'
  if (isConnected.value) return 'Supabase连接正常'
  return 'Supabase连接失败'
})

const authStatus = computed(() => {
  const session = supabase.auth.getSession()
  return session ? '已登录' : '未登录'
})

const checkConnection = async () => {
  checking.value = true
  lastError.value = null

  try {
    // 首先检查配置是否有效
    if (!isUrlValid.value || !isKeyValid.value) {
      throw new Error('Supabase配置无效，请检查环境变量')
    }

    // 简单的ping测试 - 只测试网络可达性
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      isConnected.value = true
      console.log('✅ Supabase连接检查成功')

    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        throw new Error('连接超时，请检查网络连接')
      }
      throw fetchError
    }

  } catch (error: any) {
    isConnected.value = false
    lastError.value = error.message || '连接失败'
    console.error('❌ Supabase连接检查失败:', error)
  } finally {
    checking.value = false
    
    // 如果连接成功，2秒后自动隐藏状态栏
    if (isConnected.value) {
      setTimeout(() => {
        showStatus.value = false
      }, 2000)
    }
    
    // 如果连接失败，5秒后自动隐藏状态栏
    if (!isConnected.value && !checking.value) {
      setTimeout(() => {
        showStatus.value = false
      }, 5000)
    }
  }
}

const retryConnection = () => {
  checkConnection()
}

// 监听Supabase认证状态变化
supabase.auth.onAuthStateChange((event, session) => {
  console.log('🔐 认证状态变化:', event, session ? '已登录' : '未登录')
  
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
    checkConnection()
  }
})

onMounted(() => {
  console.log('🔗 连接状态组件已加载')
  
  // 延迟1秒后检查连接，避免页面加载时的网络竞争
  setTimeout(() => {
    checkConnection()
  }, 1000)
})

// 开发模式下显示连接状态
if (import.meta.env.DEV) {
  watch(isConnected, (newVal) => {
    if (newVal) {
      console.log('🔗 开发模式: Supabase连接正常')
    } else {
      console.warn('🔗 开发模式: Supabase连接异常')
    }
  })
}
</script>

<style scoped>
.connection-status {
  position: fixed;
  top: 60px; /* 调整位置，避免遮挡顶部导航栏 */
  left: 50%;
  transform: translateX(-50%);
  z-index: 999; /* 降低z-index，避免遮挡重要元素 */
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.3s ease;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: 90%;
  width: auto;
  min-width: 300px;
}

.connection-status.connected {
  background: #d1fae5;
  border-bottom: 2px solid #10b981;
  color: #065f46;
}

.connection-status.disconnected {
  background: #fee2e2;
  border-bottom: 2px solid #ef4444;
  color: #7f1d1d;
}

.connection-status.checking {
  background: #fef3c7;
  border-bottom: 2px solid #f59e0b;
  color: #92400e;
}

.status-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.status-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-icon {
  font-size: 1.2rem;
}

.status-text {
  font-weight: 500;
}

.retry-btn, .details-btn, .close-btn {
  background: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.5);
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 50px;
}

.retry-btn:hover, .details-btn:hover, .close-btn:hover {
  background: rgba(255, 255, 255, 0.5);
}

.close-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: bold;
}

.details-panel {
  max-width: 1200px;
  margin: 1rem auto 0;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  padding: 0.25rem 0;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.valid {
  color: #10b981;
  font-weight: bold;
}

.invalid {
  color: #ef4444;
  font-weight: bold;
}

.error {
  color: #dc2626;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .connection-status {
    top: 80px; /* 在移动设备上位置更低 */
    left: 5%;
    right: 5%;
    transform: none;
    min-width: auto;
    max-width: 90%;
  }
  
  .status-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .status-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .retry-btn, .details-btn, .close-btn {
    margin: 0 0.25rem;
  }
  
  .detail-item {
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>