<template>
  <div class="post-filters">
    <div class="filters-header">
      <h5 class="filters-title">筛选和排序</h5>
      <button 
        v-if="hasActiveFilters" 
        class="btn btn-sm btn-outline-secondary"
        @click="resetAllFilters"
      >
        <i class="bi bi-arrow-clockwise"></i>
        重置
      </button>
    </div>

    <div class="filters-content">
      <!-- 排序方式 -->
      <div class="filter-group">
        <label class="filter-label">排序方式:</label>
        <div class="sort-options">
          <button
            v-for="option in sortOptions"
            :key="option.value"
            class="sort-btn"
            :class="{ active: filters.sortBy === option.value }"
            @click="updateFilter('sortBy', option.value)"
          >
            <i :class="option.icon"></i>
            {{ option.label }}
          </button>
        </div>
      </div>

      <!-- 时间范围 -->
      <div class="filter-group">
        <label class="filter-label">时间范围:</label>
        <div class="time-options">
          <button
            v-for="option in timeOptions"
            :key="option.value"
            class="time-btn"
            :class="{ active: filters.timeRange === option.value }"
            @click="updateFilter('timeRange', option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <!-- 标签筛选 -->
      <div class="filter-group">
        <label class="filter-label">标签筛选:</label>
        <div class="tags-section">
          <div class="selected-tags" v-if="filters.tags && filters.tags.length > 0">
            <span
              v-for="tag in filters.tags"
              :key="tag"
              class="selected-tag"
            >
              #{{ tag }}
              <button class="remove-tag" @click="removeTag(tag)">
                <i class="bi bi-x"></i>
              </button>
            </span>
          </div>
          
          <div class="popular-tags">
            <div class="tags-input-group">
              <input
                v-model="tagInput"
                type="text"
                class="form-control tag-input"
                placeholder="输入标签名称..."
                @keyup.enter="addTag"
              />
              <button class="btn btn-primary" @click="addTag" :disabled="!tagInput.trim()">
                添加
              </button>
            </div>
            
            <div v-if="popularTags.length > 0" class="tags-list">
              <span
                v-for="tagInfo in popularTags"
                :key="tagInfo.tag"
                class="popular-tag"
                :class="{ selected: filters.tags?.includes(tagInfo.tag) }"
                @click="toggleTag(tagInfo.tag)"
              >
                #{{ tagInfo.tag }}
                <span class="tag-count">({{ tagInfo.count }})</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 作者筛选 -->
      <div v-if="showAuthorFilter" class="filter-group">
        <label class="filter-label">作者筛选:</label>
        <div class="author-section">
          <div v-if="selectedAuthor" class="selected-author">
            <UserAvatar :user="selectedAuthor" size="sm" />
            <span>{{ selectedAuthor.username }}</span>
            <button class="remove-author" @click="clearAuthor">
              <i class="bi bi-x"></i>
            </button>
          </div>
          <button v-else class="btn btn-outline-primary" @click="$emit('select-author')">
            <i class="bi bi-person-plus"></i>
            选择作者
          </button>
        </div>
      </div>
    </div>

    <!-- 活跃筛选统计 -->
    <div v-if="hasActiveFilters" class="active-filters-summary">
      <span class="summary-text">
        当前有 {{ activeFilterCount }} 个筛选条件
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { usePostsStore } from '@/stores/posts'
import UserAvatar from './UserAvatar.vue'
import type { PostFilters } from '@/stores/posts'

interface Props {
  showAuthorFilter?: boolean
  selectedAuthor?: any
}

const props = withDefaults(defineProps<Props>(), {
  showAuthorFilter: false
})

const emit = defineEmits<{
  'select-author': []
  'filters-changed': [filters: PostFilters]
}>()

const postsStore = usePostsStore()
const { filters, getPopularTags } = postsStore

// 响应式数据
const tagInput = ref('')
const popularTags = ref<any[]>([])

// 排序选项
const sortOptions = [
  { value: 'newest', label: '最新发布', icon: 'bi bi-clock' },
  { value: 'oldest', label: '最早发布', icon: 'bi bi-clock-history' },
  { value: 'most_liked', label: '最多点赞', icon: 'bi bi-heart-fill' },
  { value: 'most_commented', label: '最多评论', icon: 'bi bi-chat-fill' },
  { value: 'most_viewed', label: '最多浏览', icon: 'bi bi-eye-fill' }
]

// 时间选项
const timeOptions = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'year', label: '今年' }
]

// 计算属性
const hasActiveFilters = computed(() => {
  return (
    filters.sortBy !== 'newest' ||
    filters.timeRange !== 'all' ||
    (filters.tags && filters.tags.length > 0) ||
    filters.authorId
  )
})

const activeFilterCount = computed(() => {
  let count = 0
  if (filters.sortBy !== 'newest') count++
  if (filters.timeRange !== 'all') count++
  if (filters.tags && filters.tags.length > 0) count++
  if (filters.authorId) count++
  return count
})

// 方法
const updateFilter = (key: keyof PostFilters, value: any) => {
  postsStore.updateFilters({ [key]: value })
  emit('filters-changed', filters)
}

const addTag = () => {
  const tag = tagInput.value.trim()
  if (tag && !filters.tags?.includes(tag)) {
    const currentTags = filters.tags || []
    updateFilter('tags', [...currentTags, tag])
    tagInput.value = ''
  }
}

const removeTag = (tag: string) => {
  const currentTags = filters.tags || []
  updateFilter('tags', currentTags.filter(t => t !== tag))
}

const toggleTag = (tag: string) => {
  const currentTags = filters.tags || []
  if (currentTags.includes(tag)) {
    removeTag(tag)
  } else {
    updateFilter('tags', [...currentTags, tag])
  }
}

const clearAuthor = () => {
  updateFilter('authorId', undefined)
  emit('filters-changed', filters)
}

const resetAllFilters = () => {
  postsStore.resetFilters()
  tagInput.value = ''
  emit('filters-changed', filters)
}

// 监听作者变化
watch(() => props.selectedAuthor, (newAuthor) => {
  if (newAuthor) {
    updateFilter('authorId', newAuthor.id)
  } else {
    updateFilter('authorId', undefined)
  }
})

// 组件挂载时获取热门标签
onMounted(async () => {
  const result = await getPopularTags()
  if (result.success) {
    popularTags.value = result.data
  }
})
</script>

<style scoped>
.post-filters {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filters-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #212529;
}

.filters-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filter-label {
  font-weight: 500;
  color: #495057;
  font-size: 14px;
}

.sort-options,
.time-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sort-btn,
.time-btn {
  padding: 8px 16px;
  border: 1px solid #dee2e6;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.sort-btn:hover,
.time-btn:hover {
  background-color: #f8f9fa;
  border-color: #adb5bd;
}

.sort-btn.active,
.time-btn.active {
  background-color: #007bff;
  border-color: #007bff;
  color: white;
}

.tags-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.selected-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: #007bff;
  color: white;
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 14px;
}

.remove-tag {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
}

.remove-tag:hover {
  opacity: 0.8;
}

.tags-input-group {
  display: flex;
  gap: 8px;
}

.tag-input {
  flex: 1;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.popular-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.popular-tag:hover {
  background-color: #e9ecef;
}

.popular-tag.selected {
  background-color: #007bff;
  border-color: #007bff;
  color: white;
}

.tag-count {
  font-size: 12px;
  opacity: 0.7;
}

.author-section {
  display: flex;
  align-items: center;
}

.selected-author {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.remove-author {
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
}

.remove-author:hover {
  color: #dc3545;
}

.active-filters-summary {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e9ecef;
  text-align: center;
}

.summary-text {
  font-size: 14px;
  color: #6c757d;
}

@media (max-width: 768px) {
  .post-filters {
    padding: 16px;
  }
  
  .filters-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  
  .sort-options,
  .time-options {
    gap: 6px;
  }
  
  .sort-btn,
  .time-btn {
    padding: 6px 12px;
    font-size: 13px;
  }
  
  .tags-input-group {
    flex-direction: column;
  }
}
</style>