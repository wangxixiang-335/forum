<template>
  <div v-if="showStatus" class="connection-status" :class="statusClass">
    <div class="status-content">
      <span class="status-icon">{{ statusIcon }}</span>
      <span class="status-text">{{ statusText }}</span>
      <button v-if="!isConnected" @click="retryConnection" class="retry-btn">
        重试连接
      </button>
      <button @click="showDetails = !showDetails" class="details-btn">
        {{ showDetails ? '隐藏详情' : '显示详情' }}
      </button>
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
    // 测试认证连接
    const { error } = await supabase.auth.getSession()
    
    if (error) {
      throw error
    }

    // 测试数据库连接
    const { error: dbError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)

    if (dbError) {
      throw dbError
    }

    isConnected.value = true
    console.log('✅ Supabase连接检查成功')

  } catch (error: any) {
    isConnected.value = false
    lastError.value = error.message || '连接失败'
    console.error('❌ Supabase连接检查失败:', error)
  } finally {
    checking.value = false
    
    // 如果连接成功，3秒后自动隐藏状态栏
    if (isConnected.value) {
      setTimeout(() => {
        showStatus.value = false
      }, 3000)
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
  checkConnection()
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
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.3s ease;
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
  max-width: 1200px;
  margin: 0 auto;
}

.status-icon {
  font-size: 1.2rem;
  margin-right: 0.5rem;
}

.status-text {
  flex: 1;
  margin-right: 1rem;
}

.retry-btn, .details-btn {
  background: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.5);
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  margin-left: 0.5rem;
  transition: all 0.2s;
}

.retry-btn:hover, .details-btn:hover {
  background: rgba(255, 255, 255, 0.5);
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
  .status-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .retry-btn, .details-btn {
    margin-left: 0;
    margin-right: 0.5rem;
  }
  
  .detail-item {
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>