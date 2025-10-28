<template>
  <div class="supabase-manager">
    <div class="container">
      <h1>🔧 Supabase项目管理器</h1>
      
      <!-- 项目信息 -->
      <div class="project-info">
        <h2>项目信息</h2>
        <div class="info-grid">
          <div class="info-item">
            <label>项目ID:</label>
            <span>{{ projectId || '未配置' }}</span>
          </div>
          <div class="info-item">
            <label>API URL:</label>
            <span :class="{ 'valid': isUrlValid }">{{ supabaseUrl || '未配置' }}</span>
          </div>
          <div class="info-item">
            <label>环境:</label>
            <span>{{ environment }}</span>
          </div>
          <div class="info-item">
            <label>连接状态:</label>
            <span :class="connectionStatusClass">{{ connectionStatusText }}</span>
          </div>
        </div>
      </div>

      <!-- 配置验证 -->
      <div class="config-section">
        <h2>配置验证</h2>
        <button @click="validateConfig" :disabled="validating" class="validate-btn">
          {{ validating ? '验证中...' : '验证配置' }}
        </button>
        
        <div v-if="validationResult" class="validation-result">
          <h3 :class="{ 'success': validationResult.isValid, 'error': !validationResult.isValid }">
            {{ validationResult.isValid ? '✅ 验证通过' : '❌ 验证失败' }}
          </h3>
          
          <div v-if="validationResult.issues.length > 0" class="issues">
            <div v-for="issue in validationResult.issues" :key="issue.message" class="issue" :class="issue.type">
              <span class="issue-icon">{{ getIssueIcon(issue.type) }}</span>
              <div class="issue-content">
                <strong>{{ issue.message }}</strong>
                <div v-if="issue.field" class="issue-field">字段: {{ issue.field }}</div>
                <div v-if="issue.fix" class="issue-fix">💡 {{ issue.fix }}</div>
              </div>
            </div>
          </div>
          
          <div v-if="validationResult.recommendations.length > 0" class="recommendations">
            <h4>建议:</h4>
            <ul>
              <li v-for="rec in validationResult.recommendations" :key="rec">{{ rec }}</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 数据库管理 -->
      <div class="database-section">
        <h2>数据库管理</h2>
        
        <div class="database-status">
          <h3>表状态</h3>
          <div class="tables-grid">
            <div v-for="table in tableStatus" :key="table.name" class="table-item" :class="{ 'exists': table.exists }">
              <span class="table-icon">{{ table.exists ? '✅' : '❌' }}</span>
              <span class="table-name">{{ table.name }}</span>
              <span class="table-row-count">{{ table.rowCount }} 行</span>
            </div>
          </div>
        </div>

        <div class="migration-controls">
          <h3>迁移操作</h3>
          <div class="buttons">
            <button @click="runMigrations" :disabled="migrating" class="migration-btn">
              {{ migrating ? '执行中...' : '执行迁移' }}
            </button>
            <button @click="checkDatabase" class="check-btn">检查数据库</button>
          </div>
          
          <div v-if="migrationResult" class="migration-result">
            <h4 :class="{ 'success': migrationResult.success, 'error': !migrationResult.success }">
              {{ migrationResult.success ? '✅ 迁移成功' : '❌ 迁移失败' }}
            </h4>
            <p>{{ migrationResult.message }}</p>
            <div v-if="migrationResult.details" class="migration-details">
              <pre>{{ migrationResult.details }}</pre>
            </div>
          </div>
        </div>
      </div>

      <!-- 快速操作 -->
      <div class="quick-actions">
        <h2>快速操作</h2>
        <div class="action-buttons">
          <button @click="openSupabaseDashboard" class="action-btn">
            📊 打开控制台
          </button>
          <button @click="copyConfig" class="action-btn">
            📋 复制配置
          </button>
          <button @click="exportConfig" class="action-btn">
            📁 导出配置
          </button>
          <button @click="testConnection" class="action-btn">
            🔗 测试连接
          </button>
        </div>
      </div>

      <!-- 连接测试结果 -->
      <div v-if="connectionTestResult" class="connection-test-result">
        <h3>连接测试结果</h3>
        <pre>{{ connectionTestResult }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/services/supabase'
import { validateSupabaseConfig, generateConfigReport, type ConfigValidationResult } from '@/utils/configValidator'
import { runMigrations as runDbMigrations, checkDatabaseStatus, type MigrationResult } from '@/utils/migrationRunner'

const validating = ref(false)
const validationResult = ref<ConfigValidationResult | null>(null)
const migrating = ref(false)
const migrationResult = ref<MigrationResult | null>(null)
const tableStatus = ref<any[]>([])
const connectionTestResult = ref<string>('')

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const projectId = computed(() => {
  if (!supabaseUrl) return null
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)
  return match ? match[1] : null
})

const isUrlValid = computed(() => {
  return supabaseUrl && !supabaseUrl.includes('default.supabase.co')
})

const environment = computed(() => {
  return import.meta.env.MODE
})

const connectionStatusClass = computed(() => {
  if (!validationResult.value) return 'unknown'
  return validationResult.value.isValid ? 'connected' : 'disconnected'
})

const connectionStatusText = computed(() => {
  if (!validationResult.value) return '未验证'
  return validationResult.value.isValid ? '已连接' : '连接失败'
})

const getIssueIcon = (type: string) => {
  switch (type) {
    case 'error': return '❌'
    case 'warning': return '⚠️'
    case 'info': return 'ℹ️'
    default: return '❓'
  }
}

const validateConfig = async () => {
  validating.value = true
  validationResult.value = null
  
  try {
    validationResult.value = await validateSupabaseConfig()
    console.log('🔧 配置验证完成:', validationResult.value)
  } catch (error) {
    console.error('❌ 配置验证失败:', error)
    validationResult.value = {
      isValid: false,
      issues: [{
        type: 'error',
        message: '配置验证异常: ' + (error instanceof Error ? error.message : '未知错误')
      }],
      recommendations: ['请检查控制台错误信息']
    }
  } finally {
    validating.value = false
  }
}

const runMigrations = async () => {
  migrating.value = true
  migrationResult.value = null
  
  try {
    migrationResult.value = await runDbMigrations()
    console.log('🚀 迁移执行完成:', migrationResult.value)
    
    // 迁移后重新检查数据库状态
    await checkDatabase()
  } catch (error) {
    console.error('❌ 迁移执行失败:', error)
    migrationResult.value = {
      success: false,
      message: '迁移执行异常: ' + (error instanceof Error ? error.message : '未知错误')
    }
  } finally {
    migrating.value = false
  }
}

const checkDatabase = async () => {
  try {
    const status = await checkDatabaseStatus()
    tableStatus.value = status.tables
    console.log('📊 数据库状态检查完成:', status)
  } catch (error) {
    console.error('❌ 数据库状态检查失败:', error)
  }
}

const testConnection = async () => {
  try {
    connectionTestResult.value = '🔗 开始连接测试...\n'
    
    // 测试认证
    const { data: authData, error: authError } = await supabase.auth.getSession()
    connectionTestResult.value += `认证测试: ${authError ? '失败' : '成功'}\n`
    
    if (authError) {
      connectionTestResult.value += `错误: ${authError.message}\n`
    } else {
      connectionTestResult.value += `会话状态: ${authData.session ? '已登录' : '未登录'}\n`
    }
    
    // 测试数据库
    const { error: dbError } = await supabase.from('profiles').select('count').limit(1)
    connectionTestResult.value += `数据库测试: ${dbError ? '失败' : '成功'}\n`
    
    if (dbError) {
      connectionTestResult.value += `错误: ${dbError.message}\n`
    }
    
    connectionTestResult.value += '✅ 连接测试完成'
    
  } catch (error: any) {
    connectionTestResult.value = `❌ 连接测试异常: ${error.message}`
  }
}

const openSupabaseDashboard = () => {
  if (projectId.value) {
    window.open(`https://supabase.com/dashboard/project/${projectId.value}`, '_blank')
  } else {
    window.open('https://supabase.com/dashboard', '_blank')
  }
}

const copyConfig = () => {
  const config = {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseKey
  }
  
  navigator.clipboard.writeText(JSON.stringify(config, null, 2))
  alert('配置已复制到剪贴板')
}

const exportConfig = () => {
  const configText = `VITE_SUPABASE_URL=${supabaseUrl}\nVITE_SUPABASE_ANON_KEY=${supabaseKey}`
  const blob = new Blob([configText], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'supabase-config.env'
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  console.log('🔧 Supabase管理器已加载')
  
  // 自动验证配置
  await validateConfig()
  
  // 检查数据库状态
  await checkDatabase()
})
</script>

<style scoped>
.supabase-manager {
  min-height: 100vh;
  background: #f8fafc;
  padding: 2rem 1rem;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

h1 {
  text-align: center;
  color: #1f2937;
  margin-bottom: 2rem;
}

.project-info, .config-section, .database-section, .quick-actions {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 8px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.info-item label {
  font-weight: 600;
  color: #374151;
}

.valid {
  color: #10b981;
  font-weight: bold;
}

.connected {
  color: #10b981;
  font-weight: bold;
}

.disconnected {
  color: #ef4444;
  font-weight: bold;
}

.unknown {
  color: #6b7280;
}

.validate-btn, .migration-btn, .check-btn, .action-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.3s;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
}

.validate-btn:hover:not(:disabled), 
.migration-btn:hover:not(:disabled), 
.check-btn:hover:not(:disabled), 
.action-btn:hover:not(:disabled) {
  background: #2563eb;
}

.validate-btn:disabled, .migration-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.validation-result {
  margin-top: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.validation-result .success {
  color: #10b981;
}

.validation-result .error {
  color: #ef4444;
}

.issues {
  margin: 1rem 0;
}

.issue {
  display: flex;
  align-items: flex-start;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 6px;
  border-left: 4px solid;
}

.issue.error {
  background: #fef2f2;
  border-left-color: #ef4444;
}

.issue.warning {
  background: #fffbeb;
  border-left-color: #f59e0b;
}

.issue.info {
  background: #eff6ff;
  border-left-color: #3b82f6;
}

.issue-icon {
  font-size: 1.2rem;
  margin-right: 0.75rem;
}

.issue-content {
  flex: 1;
}

.issue-field, .issue-fix {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.recommendations {
  margin-top: 1rem;
  padding: 1rem;
  background: #f0fdf4;
  border-radius: 6px;
  border: 1px solid #bbf7d0;
}

.tables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin: 1rem 0;
}

.table-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.table-item.exists {
  border-color: #10b981;
  background: #f0fdf4;
}

.table-icon {
  font-size: 1.2rem;
  margin-right: 0.5rem;
}

.table-name {
  font-weight: 600;
  flex: 1;
}

.table-row-count {
  font-size: 0.875rem;
  color: #6b7280;
}

.buttons {
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0;
}

.migration-result {
  margin-top: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.migration-result .success {
  color: #10b981;
}

.migration-result .error {
  color: #ef4444;
}

.migration-details pre {
  background: #f8fafc;
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  overflow-x: auto;
  margin-top: 0.5rem;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
}

.connection-test-result {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.connection-test-result pre {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  white-space: pre-wrap;
}

@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .tables-grid {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    grid-template-columns: 1fr;
  }
}
</style>