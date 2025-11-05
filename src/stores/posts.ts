import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase, withRetry, handleSupabaseError } from '@/services/supabase'
import type { Database } from '@/types/supabase'

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: {
    username: string
    avatar_url: string | null
    level: number
  }
  post_images?: Database['public']['Tables']['post_images']['Row'][]
  user_has_liked?: boolean
}

interface PostFilters {
  sortBy: 'newest' | 'oldest' | 'most_liked' | 'most_commented' | 'most_viewed'
  timeRange: 'all' | 'today' | 'week' | 'month' | 'year'
  tags?: string[]
  authorId?: string
}

export const usePostStore = defineStore('posts', () => {
  const posts = ref<Post[]>([])
  const currentPost = ref<Post | null>(null)
  const isLoading = ref(false)
  const totalPosts = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(20)
  const filters = ref<PostFilters>({
    sortBy: 'newest',
    timeRange: 'all',
    tags: []
  })

  // 获取帖子列表
  const fetchPosts = async (page = 1, limit = 20, customFilters?: PostFilters) => {
    isLoading.value = true
    currentPage.value = page
    
    try {
      const activeFilters = customFilters || filters.value
      let queryBuilder = supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, avatar_url, level)
        `, { count: 'exact' })

      // 应用过滤器
      queryBuilder = applyFilters(queryBuilder, activeFilters)

      // 应用排序
      queryBuilder = applySorting(queryBuilder, activeFilters.sortBy)

      // 应用分页
      const offset = (page - 1) * limit
      queryBuilder = queryBuilder.range(offset, offset + limit - 1)

      const { data, error, count } = await withRetry(() => queryBuilder)

      if (error) throw error
      
      if (data) {
        posts.value = data as Post[]
        totalPosts.value = count || 0
      }
    } catch (error: any) {
      console.error('获取帖子列表失败:', error)
      throw handleSupabaseError(error)
    } finally {
      isLoading.value = false
    }
  }

  // 应用过滤器
  const applyFilters = (queryBuilder: any, filters: PostFilters) => {
    // 标签过滤
    if (filters.tags && filters.tags.length > 0) {
      queryBuilder = queryBuilder.contains('tags', filters.tags)
    }

    // 作者过滤
    if (filters.authorId) {
      queryBuilder = queryBuilder.eq('user_id', filters.authorId)
    }

    // 时间范围过滤
    const timeFilter = getTimeFilter(filters.timeRange)
    if (timeFilter) {
      queryBuilder = queryBuilder.gte('created_at', timeFilter)
    }

    return queryBuilder
  }

  // 获取时间过滤器
  const getTimeFilter = (timeRange: string) => {
    const now = new Date()
    switch (timeRange) {
      case 'today':
        return new Date(now.setHours(0, 0, 0, 0)).toISOString()
      case 'week':
        return new Date(now.setDate(now.getDate() - 7)).toISOString()
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1)).toISOString()
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString()
      default:
        return null
    }
  }

  // 应用排序
  const applySorting = (queryBuilder: any, sortBy: string) => {
    switch (sortBy) {
      case 'newest':
        return queryBuilder.order('is_pinned', { ascending: false }).order('created_at', { ascending: false })
      case 'oldest':
        return queryBuilder.order('created_at', { ascending: true })
      case 'most_liked':
        return queryBuilder.order('like_count', { ascending: false }).order('created_at', { ascending: false })
      case 'most_commented':
        return queryBuilder.order('comment_count', { ascending: false }).order('created_at', { ascending: false })
      case 'most_viewed':
        return queryBuilder.order('view_count', { ascending: false }).order('created_at', { ascending: false })
      default:
        return queryBuilder.order('is_pinned', { ascending: false }).order('created_at', { ascending: false })
    }
  }

  // 更新过滤器
  const updateFilters = (newFilters: Partial<PostFilters>) => {
    filters.value = { ...filters.value, ...newFilters }
  }

  // 重置过滤器
  const resetFilters = () => {
    filters.value = {
      sortBy: 'newest',
      timeRange: 'all',
      tags: []
    }
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

  // 获取单个帖子
  const fetchPostById = async (postId: string) => {
    isLoading.value = true
    try {
      const { data, error } = await withRetry(() =>
        supabase
          .from('posts')
          .select(`
            *,
            profiles:user_id (username, avatar_url, level),
            post_images!left(*)
          `)
          .eq('id', postId)
          .single()
      )

      if (error) throw error
      
      if (data) {
        currentPost.value = data as Post
        
        // 增加浏览量
        await incrementViewCount(postId)
      }
    } catch (error: any) {
      console.error('获取帖子失败:', error)
      throw handleSupabaseError(error)
    } finally {
      isLoading.value = false
    }
  }

  // 上传帖子图片
  const uploadPostImage = async (postId: string, file: File) => {
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()
    
    if (!authStore.user) {
      throw new Error('请先登录')
    }

    try {
      // 生成唯一的文件名
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      const filePath = `post-images/${postId}/${fileName}`

      // 上传文件到Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, file)

      if (uploadError) {
        console.error('图片上传失败:', uploadError)
        throw new Error(`图片上传失败: ${uploadError.message}`)
      }

      // 获取公开URL
      const { data: urlData } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath)

      if (!urlData?.publicUrl) {
        throw new Error('无法获取图片公开URL')
      }

      // 创建图片记录
      const { data: imageData, error: imageError } = await supabase
        .from('post_images')
        .insert({
          post_id: postId,
          user_id: authStore.user.id,
          image_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type
        })
        .select()
        .single()

      if (imageError) {
        console.error('创建图片记录失败:', imageError)
        
        // 如果创建记录失败，尝试删除已上传的文件
        try {
          await supabase.storage
            .from('post-images')
            .remove([filePath])
        } catch (deleteError) {
          console.warn('删除已上传文件失败:', deleteError)
        }
        
        throw imageError
      }

      return { success: true, data: imageData }
    } catch (error: any) {
      console.error('上传帖子图片失败:', error)
      return { 
        success: false, 
        error: { 
          message: error.message || '图片上传失败',
          code: error.code
        }
      }
    }
  }

  // 创建帖子（支持图片上传）
  const createPost = async (title: string, content: string, tags: string[] = [], images: File[] = []) => {
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()
    
    if (!authStore.user) {
      throw new Error('请先登录')
    }

    let uploadResults: any[] = []

    try {
      console.log('开始创建帖子:', { 
        title: title.substring(0, 50) + '...', 
        contentLength: content.length, 
        tags,
        imageCount: images.length,
        userId: authStore.user.id
      })
      
      // 准备插入数据
      const insertData = {
        user_id: authStore.user.id,
        title,
        content,
        tags,
        like_count: 0,
        comment_count: 0,
        view_count: 0,
        is_pinned: false,
        has_images: images.length > 0
      }

      console.log('插入数据准备完成，开始数据库操作...')
      
      // 创建帖子
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert(insertData)
        .select()
        .single()

      if (postError) {
        console.error('创建帖子数据库错误:', postError)
        
        // 处理RLS策略错误
        if (postError.code === '42501' || postError.message?.includes('permission') || postError.message?.includes('row-level security')) {
          return { 
            success: false, 
            error: { 
              message: '权限不足，无法创建帖子。请检查数据库RLS策略配置。',
              code: postError.code,
              details: postError.message
            }
          }
        }
        
        // 处理其他错误
        throw postError
      }
      
      console.log('帖子创建成功:', { id: postData?.id, title: postData?.title?.substring(0, 30) + '...' })

      // 如果有图片，上传图片
      if (images.length > 0 && postData) {
        console.log('开始上传图片，数量:', images.length)
        
        uploadResults = await Promise.allSettled(
          images.map(file => uploadPostImage(postData.id, file))
        )

        console.log('图片上传结果:', uploadResults)

        // 检查上传结果
        const successfulUploads = uploadResults.filter(result => 
          result.status === 'fulfilled' && result.value && result.value.success
        )
        
        const failedUploads = uploadResults.filter(result => 
          result.status === 'rejected' || (result.status === 'fulfilled' && result.value && !result.value.success)
        )

        if (failedUploads.length > 0) {
          console.warn('部分图片上传失败:', failedUploads.length)
          
          // 如果有图片上传失败，但帖子已创建成功，返回警告信息
          if (successfulUploads.length > 0) {
            console.log('部分图片上传成功:', successfulUploads.length)
          }
        }

        // 设置第一张图片为封面图片
        if (successfulUploads.length > 0) {
          const firstImage = successfulUploads[0] as PromiseFulfilledResult<any>
          try {
            await supabase
              .from('posts')
              .update({ 
                cover_image_url: firstImage.value.data.image_url,
                updated_at: new Date().toISOString()
              })
              .eq('id', postData.id)
            console.log('封面图片设置成功')
          } catch (coverError) {
            console.warn('设置封面图片失败:', coverError)
          }
        }
      }
      
      // 增加用户经验值（发帖获得10点经验）
      try {
        await authStore.updateExperience(10)
        console.log('用户经验值更新成功')
      } catch (expError) {
        console.warn('更新经验值失败，但帖子已创建成功:', expError)
      }
      
      return { 
        success: true, 
        data: postData,
        imageUploads: {
          total: images.length,
          successful: uploadResults ? uploadResults.filter(r => r.status === 'fulfilled' && r.value && r.value.success).length : 0,
          failed: uploadResults ? uploadResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value && !r.value.success)).length : 0
        }
      }
    } catch (error: any) {
      console.error('创建帖子失败:', error)
      
      // 提供更详细和友好的错误信息
      let errorMessage = error.message || '创建帖子失败'
      
      if (error.message?.includes('timeout') || error.message?.includes('超时')) {
        errorMessage = `发布超时（${content.length}字），请检查网络连接或稍后重试`
      } else if (error.code === 'PGRST301') {
        errorMessage = '数据库连接失败，请检查网络连接'
      } else if (error.code === 'PGRST116') {
        errorMessage = '认证失败，请重新登录'
      } else if (error.code === '23505') {
        errorMessage = '帖子已存在或发生唯一性冲突'
      } else if (error.code === '23503') {
        errorMessage = '用户不存在或权限不足'
      } else if (error.code === '23502') {
        errorMessage = '数据不完整，请检查必填字段'
      }
      
      return { 
        success: false, 
        error: { 
          message: errorMessage,
          code: error.code,
          details: error.message,
          contentLength: content.length
        }
      }
    }
  }

  // 点赞/取消点赞
  const toggleLike = async (postId: string) => {
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()
    
    if (!authStore.user) {
      throw new Error('请先登录')
    }

    try {
      console.log('toggleLike: 开始点赞操作', { postId, userId: authStore.user.id })
      
      // 检查是否已经点赞
      const { data: existingLike, error: checkError } = await supabase
        .from('interactions')
        .select('id')
        .eq('user_id', authStore.user.id)
        .eq('target_type', 'post')
        .eq('target_id', postId)
        .eq('interaction_type', 'like')

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      console.log('toggleLike: 现有点赞记录', existingLike)

      if (existingLike && existingLike.length > 0) {
        // 取消点赞
        console.log('toggleLike: 执行取消点赞')
        const { error: deleteError } = await supabase
          .from('interactions')
          .delete()
          .eq('user_id', authStore.user.id)
          .eq('target_type', 'post')
          .eq('target_id', postId)
          .eq('interaction_type', 'like')
        
        if (deleteError) throw deleteError
        console.log('toggleLike: 取消点赞成功')
      } else {
        // 点赞
        console.log('toggleLike: 执行点赞')
        const { error: insertError } = await supabase
          .from('interactions')
          .insert({
            user_id: authStore.user.id,
            target_type: 'post',
            target_id: postId,
            interaction_type: 'like'
          })
        
        // 如果是重复点赞错误，说明已经点赞过了，执行取消点赞逻辑
        if (insertError && insertError.code === '23505') {
          console.log('toggleLike: 检测到重复点赞，执行取消点赞')
          const { error: deleteError } = await supabase
            .from('interactions')
            .delete()
            .eq('user_id', authStore.user.id)
            .eq('target_type', 'post')
            .eq('target_id', postId)
            .eq('interaction_type', 'like')
          
          if (deleteError) throw deleteError
          console.log('toggleLike: 重复点赞处理完成')
        } else if (insertError) {
          throw insertError
        } else {
          console.log('toggleLike: 点赞成功')
        }
      }

      // 更新本地状态
      await fetchPosts()
      if (currentPost.value?.id === postId) {
        await fetchPostById(postId)
      }

      return { success: true }
    } catch (error: any) {
      console.error('点赞操作失败:', error)
      return { success: false, error: handleSupabaseError(error) }
    }
  }

  // 增加浏览量
  const incrementViewCount = async (postId: string) => {
    try {
      await supabase.rpc('increment_view_count', { post_id: postId })
    } catch (error: any) {
      // 如果函数不存在，使用直接更新方式
      if (error?.code === 'PGRST202' || error?.message?.includes('function')) {
        console.warn('increment_view_count函数不存在，使用直接更新方式')
        const { error: updateError } = await supabase
          .from('posts')
          .update({ view_count: supabase.sql`view_count + 1` })
          .eq('id', postId)
        
        if (updateError) {
          console.error('直接更新浏览量失败:', updateError)
        }
      } else {
        console.error('增加浏览量失败:', error)
      }
    }
  }

  // 获取用户帖子
  const fetchUserPosts = async (userId: string) => {
    try {
      const { data, error } = await withRetry(() =>
        supabase
          .from('posts')
          .select(`
            *,
            profiles:user_id (username, avatar_url, level)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      )

      if (error) throw error
      
      return { success: true, data }
    } catch (error: any) {
      console.error('获取用户帖子失败:', error)
      return { success: false, error: handleSupabaseError(error) }
    }
  }

  // 获取评论及其回复
  const fetchCommentsWithReplies = async (postId: string, page = 1, limit = 20) => {
    try {
      // 获取顶级评论（没有parent_id的评论）
      const { data: topLevelComments, error: topLevelError } = await withRetry(() =>
        supabase
          .from('comments')
          .select(`
            *,
            profiles:user_id (username, avatar_url, level)
          `)
          .eq('post_id', postId)
          .is('parent_id', null)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1)
      )

      if (topLevelError) throw topLevelError

      // 为每个顶级评论获取回复
      const commentsWithReplies = await Promise.all(
        (topLevelComments || []).map(async (comment) => {
          const { data: replies, error: repliesError } = await withRetry(() =>
            supabase
              .from('comments')
              .select(`
                *,
                profiles:user_id (username, avatar_url, level)
              `)
              .eq('parent_id', comment.id)
              .order('created_at', { ascending: false })
              .limit(5) // 限制回复数量，可以添加"加载更多"功能
          )

          if (repliesError) {
            console.warn('获取评论回复失败:', repliesError)
            return { ...comment, replies: [] }
          }

          return { ...comment, replies: replies || [] }
        })
      )

      return { success: true, data: commentsWithReplies }
    } catch (error: any) {
      console.error('获取评论失败:', error)
      return { success: false, error: handleSupabaseError(error) }
    }
  }

  // 获取评论回复
  const fetchCommentReplies = async (commentId: string, page = 1, limit = 10) => {
    try {
      const { data, error } = await withRetry(() =>
        supabase
          .from('comments')
          .select(`
            *,
            profiles:user_id (username, avatar_url, level)
          `)
          .eq('parent_id', commentId)
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1)
      )

      if (error) throw error

      // 获取总数以计算是否有更多回复
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', commentId)

      const totalPages = Math.ceil((count || 0) / limit)
      const hasMore = page < totalPages

      return { 
        success: true, 
        data: data || [], 
        hasMore,
        currentPage: page,
        totalPages
      }
    } catch (error: any) {
      console.error('获取评论回复失败:', error)
      return { success: false, error: handleSupabaseError(error) }
    }
  }

  // 创建评论
  const createComment = async (postId: string, content: string, parentId?: string) => {
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()
    
    if (!authStore.user) {
      throw new Error('请先登录')
    }

    try {
      const { data, error } = await withRetry(() =>
        supabase
          .from('comments')
          .insert({
            post_id: postId,
            user_id: authStore.user.id,
            content,
            parent_id: parentId
          })
          .select()
          .single()
      )

      if (error) throw error
      
      // 增加用户经验值（评论获得5点经验）
      await authStore.updateExperience(5)
      
      return { success: true, data }
    } catch (error: any) {
      console.error('创建评论失败:', error)
      return { success: false, error: handleSupabaseError(error) }
    }
  }

  // 删除帖子
  const deletePost = async (postId: string) => {
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()
    
    if (!authStore.user) {
      throw new Error('请先登录')
    }

    try {
      const { error } = await withRetry(() =>
        supabase
          .from('posts')
          .delete()
          .eq('id', postId)
          .eq('user_id', authStore.user.id)
      )

      if (error) throw error
      
      // 从本地状态中移除帖子
      posts.value = posts.value.filter(post => post.id !== postId)
      if (currentPost.value?.id === postId) {
        currentPost.value = null
      }
      
      return { success: true }
    } catch (error: any) {
      console.error('删除帖子失败:', error)
      return { success: false, error: handleSupabaseError(error) }
    }
  }

  // 删除评论
  const deleteComment = async (commentId: string) => {
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()
    
    if (!authStore.user) {
      throw new Error('请先登录')
    }

    try {
      const { error } = await withRetry(() =>
        supabase
          .from('comments')
          .delete()
          .eq('id', commentId)
          .eq('user_id', authStore.user.id)
      )

      if (error) throw error
      
      return { success: true }
    } catch (error: any) {
      console.error('删除评论失败:', error)
      return { success: false, error: handleSupabaseError(error) }
    }
  }

  // 置顶/取消置顶评论
  const toggleCommentPin = async (commentId: string, postId: string) => {
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()
    
    if (!authStore.user) {
      throw new Error('请先登录')
    }

    try {
      // 首先获取评论信息，检查权限
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .select('is_pinned, user_id, post_id')
        .eq('id', commentId)
        .single()

      if (commentError) throw commentError

      // 检查权限：只有10级以上用户或帖子作者可以置顶评论
      const userLevel = authStore.profile?.level || 1
      const isPostAuthor = authStore.user.id === commentData.post_id
      const hasPermission = userLevel >= 10 || isPostAuthor

      if (!hasPermission) {
        return { 
          success: false, 
          error: { message: '只有Lv.10以上用户或帖子作者才能置顶评论' }
        }
      }

      // 切换置顶状态
      const { error } = await withRetry(() =>
        supabase
          .from('comments')
          .update({ 
            is_pinned: !commentData.is_pinned,
            updated_at: new Date().toISOString()
          })
          .eq('id', commentId)
      )

      if (error) throw error
      
      return { 
        success: true, 
        data: { is_pinned: !commentData.is_pinned }
      }
    } catch (error: any) {
      console.error('切换评论置顶状态失败:', error)
      return { success: false, error: handleSupabaseError(error) }
    }
  }

  return {
    posts,
    currentPost,
    isLoading,
    totalPosts,
    currentPage,
    pageSize,
    filters,
    fetchPosts,
    fetchPostById,
    fetchUserPosts,
    fetchCommentsWithReplies,
    fetchCommentReplies,
    createPost,
    createComment,
    deletePost,
    deleteComment,
    toggleCommentPin,
    toggleLike,
    updateFilters,
    resetFilters,
    getPopularTags
  }
})