<template>
  <div class="search-container">
    <!-- 搜索输入框 -->
    <div class="search-input-container">
      <div class="input-group">
        <input
          ref="searchInput"
          v-model="searchQuery"
          type="text"
          class="form-control search-input"
          placeholder="搜索帖子、用户或评论..."
          @keyup.enter="handleSearch"
          @input="handleInputChange"
        />
        <button class="btn btn-primary search-btn" @click="handleSearch" :disabled="isLoading">
          <i class="bi bi-search"></i>
          搜索
        </button>
      </div>
      
      <!-- 搜索建议下拉框 -->
      <div v-if="suggestions.length > 0" class="search-suggestions">
        <div
          v-for="(suggestion, index) in suggestions"
          :key="index"
          class="suggestion-item"
          @click="selectSuggestion(suggestion)"
        >
          <i :class="getSuggestionIcon(suggestion.type)"></i>
          <span class="suggestion-text">{{ suggestion.suggestion }}</span>
          <span class="suggestion-type">{{ getSuggestionTypeLabel(suggestion.type) }}</span>
        </div>
      </div>
    </div>

    <!-- 搜索过滤器 -->
    <div v-if="searchQuery" class="search-filters">
      <div class="filter-row">
        <!-- 搜索类型 -->
        <div class="filter-group">
          <label class="filter-label">搜索范围:</label>
          <div class="btn-group" role="group">
            <input
              type="radio"
              class="btn-check"
              id="type-all"
              v-model="searchStore.filters.type"
              value="all"
            />
            <label class="btn btn-outline-primary" for="type-all">全部</label>
            
            <input
              type="radio"
              class="btn-check"
              id="type-posts"
              v-model="searchStore.filters.type"
              value="posts"
            />
            <label class="btn btn-outline-primary" for="type-posts">帖子</label>
            
            <input
              type="radio"
              class="btn-check"
              id="type-users"
              v-model="searchStore.filters.type"
              value="users"
            />
            <label class="btn btn-outline-primary" for="type-users">用户</label>
            
            <input
              type="radio"
              class="btn-check"
              id="type-comments"
              v-model="searchStore.filters.type"
              value="comments"
            />
            <label class="btn btn-outline-primary" for="type-comments">评论</label>
          </div>
        </div>

        <!-- 排序方式 -->
        <div class="filter-group">
          <label class="filter-label">排序方式:</label>
          <select class="form-select" v-model="searchStore.filters.sortBy">
            <option value="relevance">相关性</option>
            <option value="newest">最新发布</option>
            <option value="oldest">最早发布</option>
            <option value="most_liked">最多点赞</option>
            <option value="most_commented">最多评论</option>
            <option value="most_viewed">最多浏览</option>
          </select>
        </div>

        <!-- 时间范围 -->
        <div class="filter-group">
          <label class="filter-label">时间范围:</label>
          <select class="form-select" v-model="searchStore.filters.timeRange">
            <option value="all">全部时间</option>
            <option value="today">今天</option>
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="year">今年</option>
          </select>
        </div>
      </div>

      <!-- 热门标签筛选 -->
      <div v-if="popularTags.length > 0" class="tags-filter">
        <label class="filter-label">热门标签:</label>
        <div class="tags-container">
          <span
            v-for="tag in popularTags"
            :key="tag.tag"
            class="tag-badge"
            :class="{ active: searchStore.filters.tags?.includes(tag.tag) }"
            @click="toggleTag(tag.tag)"
          >
            {{ tag.tag }} ({{ tag.count }})
          </span>
        </div>
      </div>
    </div>

    <!-- 搜索结果统计 -->
    <div v-if="searchQuery && !isLoading" class="search-stats">
      <span class="stats-text">
        找到 {{ searchStore.totalResults }} 个结果
        <span v-if="searchTime"> (用时 {{ searchTime }}ms)</span>
      </span>
      <button v-if="searchQuery" class="btn btn-sm btn-outline-secondary" @click="clearSearch">
        <i class="bi bi-x-circle"></i>
        清空
      </button>
      <!-- 调试信息 -->
      <div style="font-size: 12px; color: #999; margin-top: 5px;">
        调试: {{ JSON.stringify(debugInfo) }}
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-container">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">搜索中...</span>
      </div>
      <span class="loading-text">搜索中...</span>
    </div>

    <!-- 搜索结果 -->
    <div v-if="searchStore.searchResults.length > 0 && !isLoading" class="search-results">
      <SearchResultItem
        v-for="result in searchStore.searchResults"
        :key="`${result.type}-${result.id}`"
        :result="result"
        @click="handleResultClick"
      />
    </div>

    <!-- 无结果提示 -->
    <div v-else-if="searchQuery && !isLoading" class="no-results">
      <i class="bi bi-search"></i>
      <h5>未找到相关内容</h5>
      <p>尝试使用不同的关键词或调整搜索条件</p>
    </div>

    <!-- 分页 -->
    <nav v-if="totalPages > 1" class="pagination-nav">
      <ul class="pagination">
        <li class="page-item" :class="{ disabled: searchStore.currentPage === 1 }">
          <a class="page-link" href="#" @click.prevent="goToPage(searchStore.currentPage - 1)">上一页</a>
        </li>
        <li
          v-for="page in displayedPages"
          :key="page"
          class="page-item"
          :class="{ active: page === searchStore.currentPage }"
        >
          <a class="page-link" href="#" @click.prevent="goToPage(page)">{{ page }}</a>
        </li>
        <li class="page-item" :class="{ disabled: searchStore.currentPage === totalPages }">
          <a class="page-link" href="#" @click.prevent="goToPage(searchStore.currentPage + 1)">下一页</a>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useSearchStore } from '@/stores/search'
import SearchResultItem from './SearchResultItem.vue'
import type { SearchResult, SearchFilters } from '@/stores/search'

const router = useRouter()
const searchStore = useSearchStore()

// 响应式数据
const searchInput = ref<HTMLInputElement>()
const searchQuery = ref('')
const suggestions = ref<any[]>([])
const searchTime = ref(0)

// 从 store 获取数据
const {
  searchResults,
  isLoading,
  globalSearch,
  clearResults,
  getPopularTags
} = searchStore

// 计算属性
const totalPages = computed(() => {
  const result = Math.ceil(searchStore.totalResults / searchStore.pageSize)
  console.log('totalPages 计算:', { totalResults: searchStore.totalResults, pageSize: searchStore.pageSize, result })
  return result
})

const displayedPages = computed(() => {
  const pages = []
  const start = Math.max(1, searchStore.currentPage - 2)
  const end = Math.min(totalPages.value, searchStore.currentPage + 2)
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

const popularTags = ref<any[]>([])

// 调试计算属性
const debugInfo = computed(() => {
  return {
    searchResultsLength: searchStore.searchResults.length,
    totalResults: searchStore.totalResults,
    isLoading: searchStore.isLoading,
    searchQuery: searchQuery.value
  }
})

// 方法
const handleSearch = async () => {
  if (!searchQuery.value.trim()) return
  
  // 清空搜索建议
  suggestions.value = []
  
  const startTime = Date.now()
  await globalSearch(searchQuery.value, 1)
  searchTime.value = Date.now() - startTime
}

const handleInputChange = async () => {
  if (searchQuery.value.trim().length < 2) {
    suggestions.value = []
    return
  }
  
  // 获取搜索建议
  try {
    const { data } = await getSearchSuggestions(searchQuery.value)
    suggestions.value = data || []
  } catch (error) {
    console.error('获取搜索建议失败:', error)
    suggestions.value = []
  }
}

const selectSuggestion = (suggestion: any) => {
  console.log('selectSuggestion:', suggestion)
  searchQuery.value = suggestion.suggestion
  suggestions.value = []
  handleSearch()
}

const getSuggestionIcon = (type: string) => {
  switch (type) {
    case 'post':
      return 'bi bi-file-text'
    case 'user':
      return 'bi bi-person'
    default:
      return 'bi bi-search'
  }
}

const getSuggestionTypeLabel = (type: string) => {
  switch (type) {
    case 'post':
      return '帖子'
    case 'user':
      return '用户'
    default:
      return '其他'
  }
}

const toggleTag = (tag: string) => {
  const currentTags = searchStore.filters.tags || []
  if (currentTags.includes(tag)) {
    searchStore.updateFilters({
      tags: currentTags.filter(t => t !== tag)
    })
  } else {
    searchStore.updateFilters({
      tags: [...currentTags, tag]
    })
  }
}

const goToPage = async (page: number) => {
  if (page < 1 || page > totalPages.value) return
  await globalSearch(searchQuery.value, page)
}

const clearSearch = () => {
  searchQuery.value = ''
  suggestions.value = []
  clearResults()
}

const handleResultClick = (result: SearchResult) => {
  console.log('handleResultClick:', result)
  
  // 阻止事件冒泡，避免重复触发
  if (event) {
    event.stopPropagation()
  }
  
  switch (result.type) {
    case 'post':
      console.log('跳转到帖子:', `/post/${result.id}`)
      router.push(`/post/${result.id}`)
      break
    case 'user':
      const userId = result.user_data?.id || result.user_id
      console.log('跳转到用户:', `/profile/${userId}`)
      if (userId) {
        router.push(`/profile/${userId}`)
      }
      break
    case 'comment':
      if (result.post_id) {
        console.log('跳转到评论:', `/post/${result.post_id}#comment-${result.id}`)
        router.push(`/post/${result.post_id}#comment-${result.id}`)
      }
      break
  }
}

const getSearchSuggestions = async (query: string) => {
  try {
    console.log('获取搜索建议:', query)
    const { supabase } = await import('@/services/supabase')
    
    // 直接使用简单的查询作为搜索建议
    let queryBuilder = supabase
      .from('posts')
      .select('id, title, content, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
      
    if (query && query.trim()) {
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    }
    
    const { data: fallbackData, error: fallbackError } = await queryBuilder
    
    if (fallbackError) throw fallbackError
    
    // 转换数据格式以匹配预期结构
    const formattedData = (fallbackData || []).map(post => ({
      id: post.id,
      suggestion: post.title || post.content?.substring(0, 50),
      type: 'post',
      created_at: post.created_at
    }))
    
    return { success: true, data: formattedData }
  } catch (error: any) {
    console.error('获取搜索建议失败:', error)
    return { success: false, error }
  }
}

// 监听过滤器变化
watch(() => searchStore.filters, async () => {
  if (searchQuery.value.trim()) {
    await handleSearch()
  }
}, { deep: true })

// 监听搜索查询变化
watch(searchQuery, (newQuery) => {
  if (!newQuery.trim()) {
    clearResults()
  }
})

// 组件挂载时获取热门标签
onMounted(async () => {
  try {
    const result = await getPopularTags()
    if (result.success && result.data) {
      popularTags.value = result.data
      console.log('获取热门标签成功:', popularTags.value)
    }
  } catch (error) {
    console.error('获取热门标签失败:', error)
  }
  
  // 聚焦搜索框
  await nextTick()
  searchInput.value?.focus()
})
</script>

<style scoped>
.search-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.search-input-container {
  position: relative;
  margin-bottom: 20px;
}

.input-group {
  display: flex;
  gap: 10px;
}

.search-input {
  flex: 1;
  padding: 12px 16px;
  font-size: 16px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  transition: border-color 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.search-btn {
  padding: 12px 24px;
  font-size: 16px;
  border-radius: 8px;
}

.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
}

.suggestion-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.suggestion-item:hover {
  background-color: #f8f9fa;
}

.suggestion-text {
  flex: 1;
  margin: 0 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-type {
  font-size: 12px;
  color: #6c757d;
  background-color: #e9ecef;
  padding: 2px 6px;
  border-radius: 4px;
}

.search-filters {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.filter-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 15px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-weight: 500;
  color: #495057;
  font-size: 14px;
}

.tags-filter {
  border-top: 1px solid #e9ecef;
  padding-top: 15px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-badge {
  display: inline-block;
  padding: 4px 12px;
  background-color: #e9ecef;
  color: #495057;
  border-radius: 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.tag-badge:hover {
  background-color: #dee2e6;
}

.tag-badge.active {
  background-color: #007bff;
  color: white;
}

.search-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 10px 0;
  border-bottom: 1px solid #e9ecef;
}

.stats-text {
  color: #6c757d;
  font-size: 14px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  gap: 16px;
}

.loading-text {
  color: #6c757d;
}

.search-results {
  margin-bottom: 20px;
}

.no-results {
  text-align: center;
  padding: 60px 20px;
  color: #6c757d;
}

.no-results i {
  font-size: 48px;
  margin-bottom: 16px;
  display: block;
}

.pagination-nav {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

@media (max-width: 768px) {
  .filter-row {
    flex-direction: column;
    gap: 15px;
  }
  
  .filter-group {
    width: 100%;
  }
  
  .search-stats {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
}
</style>