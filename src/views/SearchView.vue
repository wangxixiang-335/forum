<template>
  <div class="search-view">
    <header class="header">
      <div class="container">
        <div class="header-content">
          <RouterLink to="/" class="back-link">
            <i class="bi bi-arrow-left"></i>
            返回首页
          </RouterLink>
          <h1 class="page-title">搜索结果</h1>
        </div>
      </div>
    </header>

    <main class="main">
      <div class="container">
        <SearchComponent />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSearchStore } from '@/stores/search'
import SearchComponent from '@/components/SearchComponent.vue'

const route = useRoute()
const router = useRouter()
const searchStore = useSearchStore()

onMounted(async () => {
  // 如果URL中有搜索参数，自动执行搜索
  const query = route.query.q as string
  if (query) {
    await searchStore.globalSearch(query, 1)
  }
})
</script>

<style scoped>
.search-view {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.header {
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 1rem 20px;
}

.back-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #495057;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.2s;
}

.back-link:hover {
  background-color: #f8f9fa;
  color: #007bff;
}

.page-title {
  margin: 0;
  color: #212529;
  font-size: 24px;
  font-weight: 600;
}

.main {
  padding: 2rem 0;
}

@media (max-width: 768px) {
  .header-content {
    padding: 16px 20px;
  }
  
  .page-title {
    font-size: 20px;
  }
}
</style>