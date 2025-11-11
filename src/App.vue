<template>
  <div id="app">
    <ConnectionStatus />
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import ConnectionStatus from '@/components/ConnectionStatus.vue'
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

// 获取认证store
const authStore = useAuthStore()

onMounted(() => {
  console.log('🚀 应用初始化，加载认证状态')
  
  // 只初始化一次，避免干扰帖子加载
  authStore.initializeAuth(false) // 不强制刷新
})
</script>

<style>
#app {
  min-height: 100vh;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
</style>