import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase, withRetry, handleSupabaseError } from '@/services/supabase'
import type { Database } from '@/types/supabase'

interface SearchResult {
  type: 'post' | 'user' | 'comment'
  id: string
  title?: string
  content: string
  relevance_score?: number
  created_at: string
  updated_at: string
  // 帖子相关字段
  user_id?: string
  username?: string
  avatar_url?: string | null
  level?: number
  like_count?: number
  comment_count?: number
  view_count?: number
  tags?: string[]
  is_pinned?: boolean
  // 用户相关字段
  user_data?: {
    id: string
    username: string
    avatar_url: string | null
    level: number
    experience_points: number
  }
  // 评论相关字段
  post_id?: string
  post_title?: string
  parent_id?: string
}

interface SearchFilters {
  type: 'all' | 'posts' | 'users' | 'comments'
  sortBy: 'relevance' | 'newest' | 'oldest' | 'most_liked' | 'most_commented' | 'most_viewed'
  timeRange: 'all' | 'today' | 'week' | 'month' | 'year'
  tags?: string[]
}

export const useSearchStore = defineStore('search', () => {
  const searchResults = ref<SearchResult[]>([])
  const isLoading = ref(false)
  const searchQuery = ref('')
  const filters = ref<SearchFilters>({
    type: 'all',
    sortBy: 'relevance',
    timeRange: 'all',
    tags: []
  })
  const totalResults = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(20)

  // 全局搜索
  const globalSearch = async (query: string, page = 1) => {
    if (!query.trim()) {
      searchResults.value = []
      totalResults.value = 0
      return { success: true, data: [] }
    }

    isLoading.value = true
    searchQuery.value = query
    currentPage.value = page

    try {
      const offset = (page - 1) * pageSize.value
      let results: SearchResult[] = []
      let totalCount = 0

      console.log('globalSearch: 开始搜索', { query, page, type: filters.value.type })

      // 根据搜索类型执行不同的搜索
      if (filters.value.type === 'all' || filters.value.type === 'posts') {
        const postsResult = await searchPosts(query, 0) // 获取所有数据，不分页
        results = results.concat(postsResult.data)
        if (filters.value.type === 'posts') {
          totalCount = postsResult.count
        } else {
          totalCount += postsResult.count
        }
        console.log('globalSearch: 帖子搜索结果', { count: postsResult.count, dataLength: postsResult.data.length })
      }

      if (filters.value.type === 'all' || filters.value.type === 'users') {
        const usersResult = await searchUsers(query, 0) // 获取所有数据，不分页
        results = results.concat(usersResult.data)
        if (filters.value.type === 'users') {
          totalCount = usersResult.count
        } else {
          totalCount += usersResult.count
        }
        console.log('globalSearch: 用户搜索结果', { count: usersResult.count, dataLength: usersResult.data.length })
      }

      if (filters.value.type === 'all' || filters.value.type === 'comments') {
        const commentsResult = await searchComments(query, 0) // 获取所有数据，不分页
        results = results.concat(commentsResult.data)
        if (filters.value.type === 'comments') {
          totalCount = commentsResult.count
        } else {
          totalCount += commentsResult.count
        }
        console.log('globalSearch: 评论搜索结果', { count: commentsResult.count, dataLength: commentsResult.data.length })
      }

      console.log('globalSearch: 合并前的结果', { totalCount, resultsLength: results.length })

      // 应用排序
      results = applySorting(results)

      // 应用分页
      const paginatedResults = results.slice(offset, offset + pageSize.value)

      searchResults.value = paginatedResults
      totalResults.value = totalCount

      console.log('globalSearch: 最终结果', { totalCount, paginatedResultsLength: paginatedResults.length })

      return { success: true, data: paginatedResults, count: totalCount }
    } catch (error: any) {
      console.error('搜索失败:', error)
      return { success: false, error: handleSupabaseError(error) }
    } finally {
      isLoading.value = false
    }
  }

  // 搜索帖子
  const searchPosts = async (query: string, offset = 0) => {
    try {
      let queryBuilder = supabase
        .from('posts')
        .select(`
          *,
          profiles: user_id (username, avatar_url, level)
        `, { count: 'exact' })

      // 应用搜索条件
      const searchConditions = []
      if (query.trim()) {
        searchConditions.push(`title.ilike.%${query}%`)
        searchConditions.push(`content.ilike.%${query}%`)
      }

      // 应用标签过滤
      if (filters.value.tags && filters.value.tags.length > 0) {
        searchConditions.push(`tags.cs.{${filters.value.tags.join(',')}}`)
      }

      // 应用时间范围过滤
      const timeFilter = getTimeFilter()
      if (timeFilter) {
        searchConditions.push(`created_at.gte.${timeFilter.value}`)
      }

      if (searchConditions.length > 0) {
        queryBuilder = queryBuilder.or(searchConditions.join(','))
      }

      // 应用排序
      queryBuilder = applyPostSorting(queryBuilder)

      // 应用分页
      queryBuilder = queryBuilder.range(offset, offset + pageSize.value - 1)

      const { data, error, count } = await withRetry(() => queryBuilder)

      if (error) throw error

      const results: SearchResult[] = (data || []).map(post => {
        console.log('searchPosts: 处理帖子数据', post);
        const result = {
          type: 'post',
          id: post.id,
          title: post.title,
          content: post.content,
          created_at: post.created_at,
          updated_at: post.updated_at,
          user_id: post.user_id,
          username: post.profiles?.username,
          avatar_url: post.profiles?.avatar_url,
          level: post.profiles?.level,
          like_count: post.like_count,
          comment_count: post.comment_count,
          view_count: post.view_count,
          tags: post.tags,
          is_pinned: post.is_pinned
        };
        console.log('searchPosts: 转换后的结果', result);
        return result;
      })

      return { data: results, count: count || 0 }
    } catch (error: any) {
      console.error('搜索帖子失败:', error)
      throw error
    }
  }

  // 搜索用户
  const searchUsers = async (query: string, offset = 0) => {
    try {
      let queryBuilder = supabase
        .from('profiles')
       .select('*', { count: 'exact' })

      // 应用搜索条件
      if (query.trim()) {
        queryBuilder = queryBuilder.ilike('username', `%${query}%`)
      }

      // 应用排序
      queryBuilder = queryBuilder.order('experience_points', { ascending: false })

      // 应用分页
      queryBuilder = queryBuilder.range(offset, offset + pageSize.value - 1)

      const { data, error, count } = await withRetry(() => queryBuilder)

      if (error) throw error

      const results: SearchResult[] = (data || []).map(user => ({
        type: 'user',
        id: user.id,
        content: `等级 ${user.level} · 经验值 ${user.experience_points}`,
        created_at: user.created_at,
        updated_at: user.updated_at,
        user_data: {
          id: user.id,
          username: user.username,
          avatar_url: user.avatar_url,
          level: user.level,
          experience_points: user.experience_points
        }
      }))

      return { data: results, count: count || 0 }
    } catch (error: any) {
      console.error('搜索用户失败:', error)
      throw error
    }
  }

  // 搜索评论
  const searchComments = async (query: string, offset = 0) => {
    try {
      let queryBuilder = supabase
        .from('comments')
        .select(`
          *,
          profiles: user_id (username, avatar_url, level),
          posts: post_id (title)
        `, { count: 'exact' })

      // 应用搜索条件
      if (query.trim()) {
        queryBuilder = queryBuilder.ilike('content', `%${query}%`)
      }

      // 应用时间范围过滤
      const timeFilter = getTimeFilter()
      if (timeFilter) {
        queryBuilder = queryBuilder.filter('created_at', timeFilter.operator, timeFilter.value)
      }

      // 应用排序
      queryBuilder = applyCommentSorting(queryBuilder)

      // 应用分页
      queryBuilder = queryBuilder.range(offset, offset + pageSize.value - 1)

      const { data, error, count } = await withRetry(() => queryBuilder)

      if (error) throw error

      const results: SearchResult[] = (data || []).map(comment => ({
        type: 'comment',
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        user_id: comment.user_id,
        username: comment.profiles?.username,
        avatar_url: comment.profiles?.avatar_url,
        level: comment.profiles?.level,
        like_count: comment.like_count,
        post_id: comment.post_id,
        post_title: comment.posts?.title,
        parent_id: comment.parent_id
      }))

      return { data: results, count: count || 0 }
    } catch (error: any) {
      console.error('搜索评论失败:', error)
      throw error
    }
  }

  // 获取时间过滤器
  const getTimeFilter = () => {
    const now = new Date()
    switch (filters.value.timeRange) {
      case 'today':
        return { operator: 'gte', value: new Date(now.setHours(0, 0, 0, 0)).toISOString() }
      case 'week':
        return { operator: 'gte', value: new Date(now.setDate(now.getDate() - 7)).toISOString() }
      case 'month':
        return { operator: 'gte', value: new Date(now.setMonth(now.getMonth() - 1)).toISOString() }
      case 'year':
        return { operator: 'gte', value: new Date(now.setFullYear(now.getFullYear() - 1)).toISOString() }
      default:
        return null
    }
  }

  // 应用帖子排序
  const applyPostSorting = (queryBuilder: any) => {
    switch (filters.value.sortBy) {
      case 'newest':
        return queryBuilder.order('created_at', { ascending: false })
      case 'oldest':
        return queryBuilder.order('created_at', { ascending: true })
      case 'most_liked':
        return queryBuilder.order('like_count', { ascending: false })
      case 'most_commented':
        return queryBuilder.order('comment_count', { ascending: false })
      case 'most_viewed':
        return queryBuilder.order('view_count', { ascending: false })
      case 'relevance':
      default:
        // 默认按置顶和创建时间排序
        return queryBuilder.order('is_pinned', { ascending: false }).order('created_at', { ascending: false })
    }
  }

  // 应用评论排序
  const applyCommentSorting = (queryBuilder: any) => {
    switch (filters.value.sortBy) {
      case 'newest':
        return queryBuilder.order('created_at', { ascending: false })
      case 'oldest':
        return queryBuilder.order('created_at', { ascending: true })
      case 'most_liked':
        return queryBuilder.order('like_count', { ascending: false })
      case 'relevance':
      default:
        return queryBuilder.order('created_at', { ascending: false })
    }
  }

  // 应用排序到搜索结果
  const applySorting = (results: SearchResult[]) => {
    switch (filters.value.sortBy) {
      case 'newest':
        return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      case 'oldest':
        return results.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      case 'most_liked':
        return results.sort((a, b) => (b.like_count || 0) - (a.like_count || 0))
      case 'most_commented':
        return results.sort((a, b) => (b.comment_count || 0) - (a.comment_count || 0))
      case 'most_viewed':
        return results.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      case 'relevance':
      default:
        return results
    }
  }

  // 更新搜索过滤器
  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    filters.value = { ...filters.value, ...newFilters }
  }

  // 清空搜索结果
  const clearResults = () => {
    searchResults.value = []
    searchQuery.value = ''
    totalResults.value = 0
    currentPage.value = 1
  }

  // 获取热门标签
  const getPopularTags = async (limit = 20) => {
    try {
      const { data, error } = await withRetry(() =>
        supabase
          .from('posts')
          .select('tags')
          .not('tags', 'eq', '{}')
          .limit(1000)
      )

      if (error) throw error

      // 统计标签频率
      const tagCounts: { [key: string]: number } = {}
      data?.forEach(post => {
        post.tags?.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        })
      })

      // 排序并返回热门标签
      const popularTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([tag, count]) => ({ tag, count }))

      return { success: true, data: popularTags }
    } catch (error: any) {
      console.error('获取热门标签失败:', error)
      return { success: false, error: handleSupabaseError(error) }
    }
  }

  return {
    searchResults,
    isLoading,
    searchQuery,
    filters,
    totalResults,
    currentPage,
    pageSize,
    globalSearch,
    searchPosts,
    searchUsers,
    searchComments,
    updateFilters,
    clearResults,
    getPopularTags
  }
})