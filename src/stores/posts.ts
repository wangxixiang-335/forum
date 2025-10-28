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
  user_has_liked?: boolean
}

export const usePostStore = defineStore('posts', () => {
  const posts = ref<Post[]>([])
  const currentPost = ref<Post | null>(null)
  const isLoading = ref(false)

  // 获取帖子列表
  const fetchPosts = async (page = 1, limit = 20) => {
    isLoading.value = true
    try {
      const { data, error } = await withRetry(() =>
        supabase
          .from('posts')
          .select(`
            *,
            profiles:user_id (username, avatar_url, level)
          `)
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1)
      )

      if (error) throw error
      
      if (data) {
        posts.value = data as Post[]
      }
    } catch (error: any) {
      console.error('获取帖子列表失败:', error)
      throw handleSupabaseError(error)
    } finally {
      isLoading.value = false
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
            profiles:user_id (username, avatar_url, level)
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

  // 创建帖子
  const createPost = async (title: string, content: string, tags: string[] = []) => {
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()
    
    if (!authStore.user) {
      throw new Error('请先登录')
    }

    try {
      const { data, error } = await withRetry(() =>
        supabase
          .from('posts')
          .insert({
            user_id: authStore.user.id,
            title,
            content,
            tags,
            like_count: 0,
            comment_count: 0,
            view_count: 0,
            is_pinned: false
          })
          .select()
          .single()
      )

      if (error) throw error
      
      // 增加用户经验值（发帖获得10点经验）
      await supabase
        .from('profiles')
        .update({
          experience_points: supabase.rpc('increment', { 
            x: authStore.profile?.experience_points || 0, 
            y: 10 
          })
        })
        .eq('id', authStore.user.id)
      
      return { success: true, data }
    } catch (error: any) {
      console.error('创建帖子失败:', error)
      return { success: false, error: handleSupabaseError(error) }
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

      if (existingLike && existingLike.length > 0) {
        // 取消点赞
        const { error: deleteError } = await supabase
          .from('interactions')
          .delete()
          .eq('user_id', authStore.user.id)
          .eq('target_type', 'post')
          .eq('target_id', postId)
          .eq('interaction_type', 'like')
        
        if (deleteError) throw deleteError
        
        // 减少点赞数
        const { error: decrementError } = await supabase.rpc('decrement_like_count', { post_id: postId })
        if (decrementError) console.error('减少点赞数失败:', decrementError)
      } else {
        // 点赞
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
          console.log('检测到重复点赞，执行取消点赞')
          const { error: deleteError } = await supabase
            .from('interactions')
            .delete()
            .eq('user_id', authStore.user.id)
            .eq('target_type', 'post')
            .eq('target_id', postId)
            .eq('interaction_type', 'like')
          
          if (deleteError) throw deleteError
          
          // 减少点赞数
          const { error: decrementError } = await supabase.rpc('decrement_like_count', { post_id: postId })
          if (decrementError) console.error('减少点赞数失败:', decrementError)
        } else if (insertError) {
          throw insertError
        } else {
          // 增加点赞数
          const { error: incrementError } = await supabase.rpc('increment_like_count', { post_id: postId })
          if (incrementError) console.error('增加点赞数失败:', incrementError)
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
    } catch (error) {
      console.error('增加浏览量失败:', error)
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
      await supabase
        .from('profiles')
        .update({
          experience_points: (authStore.profile?.experience_points || 0) + 5
        })
        .eq('id', authStore.user.id)
      
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

  return {
    posts,
    currentPost,
    isLoading,
    fetchPosts,
    fetchPostById,
    fetchUserPosts,
    createPost,
    createComment,
    deletePost,
    deleteComment,
    toggleLike
  }
})