<template>
  <div class="connection-test">
    <div class="container">
      <h1>🔗 Supabase连接测试</h1>
      
      <div class="config-info">
        <h2>当前配置</h2>
        <div class="config-item">
          <strong>Supabase URL:</strong> 
          <span :class="{ 'valid': isUrlValid, 'invalid': !isUrlValid }">
            {{ supabaseUrl || '未配置' }}
          </span>
        </div>
        <div class="config-item">
          <strong>Anon Key:</strong> 
          <span :class="{ 'valid': isKeyValid, 'invalid': !isKeyValid }">
            {{ supabaseKey ? '已配置' : '未配置' }}
          </span>
        </div>
      </div>

      <div class="test-section">
        <button 
          @click="testConnection" 
          :disabled="testing"
          class="test-btn"
        >
          {{ testing ? '测试中...' : '测试连接' }}
        </button>
        
        <div v-if="testResult" class="result" :class="testResult.success ? 'success' : 'error'">
          <h3>{{ testResult.success ? '✅ 连接成功' : '❌ 连接失败' }}</h3>
          <p>{{ testResult.message }}</p>
          <div v-if="testResult.details" class="details">
            <pre>{{ testResult.details }}</pre>
          </div>
        </div>
      </div>

      <div class="database-status">
        <h2>数据库表状态</h2>
        <div v-if="tableStatus" class="tables">
          <div 
            v-for="table in tableStatus" 
            :key="table.name"
            class="table-item"
            :class="{ 'accessible': table.accessible, 'inaccessible': !table.accessible }"
          >
            <span class="table-icon">{{ table.accessible ? '✅' : '❌' }}</span>
            <span class="table-name">{{ table.name }}</span>
            <span class="table-status">{{ table.accessible ? '可访问' : '不可访问' }}</span>
          </div>
        </div>
        <p v-else>点击测试连接查看表状态</p>
      </div>

      <div class="actions">
        <button @click="goToHome" class="action-btn primary">前往首页</button>
        <button @click="openSupabaseDashboard" class="action-btn secondary">打开Supabase控制台</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, handleSupabaseError } from '@/services/supabase'

const router = useRouter()
const testing = ref(false)
const testResult = ref<any>(null)
const tableStatus = ref<any[]>([])

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isUrlValid = computed(() => {
  return supabaseUrl && !supabaseUrl.includes('default.supabase.co')
})

const isKeyValid = computed(() => {
  return supabaseKey && !supabaseKey.includes('default')
})

const testConnection = async () => {
  testing.value = true
  testResult.value = null
  tableStatus.value = []

  try {
    console.log('🔗 开始测试Supabase连接...')
    
    // 测试基础连接
    const { data: authData, error: authError } = await supabase.auth.getSession()
    
    if (authError) {
      throw authError
    }

    // 测试数据库表访问
    const tables = ['profiles', 'posts', 'comments', 'interactions']
    const tableResults = []

    for (const tableName of tables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('count')
          .limit(1)
        
        tableResults.push({
          name: tableName,
          accessible: !error,
          error: error ? error.message : null
        })
      } catch (error) {
        tableResults.push({
          name: tableName,
          accessible: false,
          error: error instanceof Error ? error.message : '未知错误'
        })
      }
    }

    tableStatus.value = tableResults

    testResult.value = {
      success: true,
      message: 'Supabase连接成功！所有配置正确。',
      details: `认证状态: ${authData.session ? '已登录' : '未登录'}\n表访问测试完成`
    }

    console.log('✅ Supabase连接测试成功')

  } catch (error) {
    const handledError = handleSupabaseError(error)
    testResult.value = {
      success: false,
      message: handledError.message,
      details: `错误代码: ${handledError.code}\n建议检查环境变量配置`
    }
    console.error('❌ Supabase连接测试失败:', error)
  } finally {
    testing.value = false
  }
}

const goToHome = () => {
  router.push('/')
}

const openSupabaseDashboard = () => {
  if (isUrlValid.value) {
    const projectId = supabaseUrl.split('.')[0].replace('https://', '')
    window.open(`https://supabase.com/dashboard/project/${projectId}`, '_blank')
  } else {
    window.open('https://supabase.com/dashboard', '_blank')
  }
}

onMounted(() => {
  console.log('🔗 连接测试页面已加载')
  console.log('环境变量检查:')
  console.log('VITE_SUPABASE_URL:', supabaseUrl)
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey ? '已配置' : '未配置')
})
</script>

<style scoped>
.connection-test {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 2rem;
}

.config-info {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background: white;
  border-radius: 4px;
}

.valid {
  color: #10b981;
  font-weight: bold;
}

.invalid {
  color: #ef4444;
  font-weight: bold;
}

.test-section {
  text-align: center;
  margin-bottom: 2rem;
}

.test-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.3s;
}

.test-btn:hover:not(:disabled) {
  background: #2563eb;
}

.test-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.result {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 6px;
}

.result.success {
  background: #d1fae5;
  border: 1px solid #10b981;
  color: #065f46;
}

.result.error {
  background: #fee2e2;
  border: 1px solid #ef4444;
  color: #7f1d1d;
}

.details {
  margin-top: 0.5rem;
  background: rgba(0, 0, 0, 0.05);
  padding: 0.5rem;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.875rem;
}

.database-status {
  margin-bottom: 2rem;
}

.tables {
  display: grid;
  gap: 0.5rem;
}

.table-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  border-radius: 6px;
  gap: 1rem;
}

.table-item.accessible {
  background: #d1fae5;
  border: 1px solid #10b981;
}

.table-item.inaccessible {
  background: #fee2e2;
  border: 1px solid #ef4444;
}

.table-icon {
  font-size: 1.2rem;
}

.table-name {
  font-weight: bold;
  flex: 1;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.action-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn.primary {
  background: #10b981;
  color: white;
}

.action-btn.primary:hover {
  background: #059669;
}

.action-btn.secondary {
  background: #6b7280;
  color: white;
}

.action-btn.secondary:hover {
  background: #4b5563;
}
</style>