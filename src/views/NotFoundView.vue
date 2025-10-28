<template>
  <div class="not-found">
    <div class="container">
      <div class="error-content">
        <h1>404</h1>
        <h2>页面未找到</h2>
        <p>抱歉，您访问的页面不存在或已被移除。</p>
        <div class="actions">
          <RouterLink to="/" class="btn-primary">返回首页</RouterLink>
          <button @click="goBack" class="btn-secondary">返回上页</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push('/')
  }
}
</script>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  padding: 2rem;
}

.container {
  text-align: center;
}

.error-content h1 {
  font-size: 6rem;
  font-weight: 700;
  color: #1890ff;
  margin: 0;
  line-height: 1;
}

.error-content h2 {
  font-size: 2rem;
  color: #333;
  margin: 1rem 0 0.5rem 0;
}

.error-content p {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 2rem;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-primary {
  background: #1890ff;
  color: white;
  text-decoration: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  display: inline-block;
}

.btn-primary:hover {
  background: #40a9ff;
}

.btn-secondary {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #d9d9d9;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #e8e8e8;
}
</style>