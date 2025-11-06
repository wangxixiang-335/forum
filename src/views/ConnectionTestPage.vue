<template>
  <div class="connection-test">
    <h2>数据库连接测试</h2>
    
    <div class="test-section">
      <button @click="testConnection" :disabled="testing">
        {{ testing ? '测试中...' : '测试连接' }}
      </button>
      
      <div v-if="result" class="result">
        <h3>测试结果：</h3>
        <p><strong>状态:</strong> {{ result.status === 'ok' ? '✅ 成功' : '❌ 失败' }}</p>
        <p><strong>延迟:</strong> {{ result.latency }}ms</p>
        <p v-if="result.error"><strong>错误信息:</strong> {{ result.error.message }}</p>
        <p v-if="result.error?.code"><strong>错误代码:</strong> {{ result.error.code }}</p>
      </div>
    </div>
    
    <div class="test-section">
      <h3>尝试创建测试帖子</h3>
      <button @click="testCreatePost" :disabled="testingPost">
        {{ testingPost ? '创建中...' : '创建测试帖子' }}
      </button>
      
      <div v-if="postResult" class="result">
        <h3>帖子创建结果：</h3>
        <p v-if="postResult.success">✅ 帖子创建成功</p>
        <p v-else>❌ 帖子创建失败</p>
        <p v-if="postResult.postId"><strong>帖子ID:</strong> {{ postResult.postId }}</p>
        <p v-if="postResult.warning"><strong>警告:</strong> {{ postResult.warning }}</p>
        <p v-if="postResult.error"><strong>错误:</strong> {{ postResult.error.message }}</p>
      </div>
    </div>
    
    <div class="debug-info">
      <h3>调试信息</h3>
      <p><strong>Supabase URL:</strong> {{ supabaseUrl }}</p>
      <p><strong>是否有默认配置:</strong> {{ hasDefaultConfig ? '是' : '否' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { testConnection } from '@/services/supabase'
import { usePostsStore } from '@/stores/posts'

const testing = ref(false)
const result = ref<any>(null)
const testingPost = ref(false)
const postResult = ref<any>(null)
const supabaseUrl = ref('')
const hasDefaultConfig = ref(false)

const postsStore = usePostsStore()

onMounted(() => {
  supabaseUrl.value = import.meta.env.VITE_SUPABASE_URL || '未配置'
  hasDefaultConfig.value = supabaseUrl.value.includes('default.supabase.co')
})

const testConnection = async () => {
  testing.value = true
  result.value = null
  
  try {
    const connectionResult = await testConnection()
    result.value = connectionResult
    console.log('连接测试结果:', connectionResult)
  } catch (error) {
    result.value = {
      status: 'failed',
      latency: 0,
      error: { message: error.message }
    }
    console.error('连接测试失败:', error)
  } finally {
    testing.value = false
  }
}

const testCreatePost = async () => {
  testingPost.value = true
  postResult.value = null
  
  try {
    // 创建简单的测试帖子
    const testPostResult = await postsStore.createPost(
      '测试帖子标题',
      '这是一个用于测试连接和数据库操作的测试帖子内容。',
      ['测试'],
      []
    )
    
    postResult.value = testPostResult
    console.log('帖子创建结果:', testPostResult)
  } catch (error) {
    postResult.value = {
      success: false,
      error: { message: error.message }
    }
    console.error('帖子创建失败:', error)
  } finally {
    testingPost.value = false
  }
}
</script>

<style scoped>
.connection-test {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.test-section {
  margin: 20px 0;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.result {
  margin-top: 10px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 3px;
}

.debug-info {
  margin-top: 20px;
  padding: 15px;
  background: #f0f8ff;
  border-radius: 5px;
}

button {
  padding: 10px 15px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  background: #0056b3;
}
</style>