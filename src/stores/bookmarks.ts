import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase, withRetry, handleSupabaseError } from '@/services/supabase'
import type { Database } from '@/types/supabase'

interface Bookmark {
  id: string
  user_id: string
  target_type: 'post' | 'comment'
  target_id: string
  folder_name: string
  note?: string
  created_at: string
  target_data?: any // 关联的帖子或评论数据
}

export const useBookmarkStore = defineStore('bookmarks', () => {
  const bookmarks = ref<Bookmark[]>([])
  const isLoading = ref(false)
  const folders = ref<string[]>(['默认收藏夹'])

  // 获取用户收藏
  const fetchBookmarks = async (folder?: string, page = 1, limit = 20) => {
    isLoading.value = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('用户未登录')

      console.log(`获取收藏数据，用户ID: ${user.id}, 收藏夹: ${folder || '全部'}`)

      let query = supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (folder) {
        query = query.eq('folder_name', folder)
      }

      const { data, error } = await withRetry(() =>
        query.range((page - 1) * limit, page * limit - 1)
      )

      if (error) {
        console.error('查询收藏记录失败:', error)
        throw error
      }

      console.log(`原始收藏数据:`, data)

      // 分别获取关联的帖子和评论数据
      const processedBookmarks = []
      
      for (const bookmark of (data || [])) {
        let target_data = null
        
        try {
          if (bookmark.target_type === 'post') {
            console.log(`正在获取帖子 ${bookmark.target_id} 的数据`)
            const { data: postData, error: postError } = await withRetry(() =>
              supabase
                .from('posts')
                .select('id, title, content, created_at, like_count, comment_count')
                .eq('id', bookmark.target_id)
                .single()
            )
            
            if (postError) {
              console.warn(`无法找到帖子 ${bookmark.target_id}:`, postError)
              // 如果帖子不存在，创建一个占位符数据
              target_data = {
                id: bookmark.target_id,
                title: '帖子已被删除',
                content: '此帖子已被原作者删除，但收藏记录保留',
                created_at: bookmark.created_at,
                like_count: 0,
                comment_count: 0
              }
            } else {
              console.log(`成功获取帖子数据:`, postData)
              target_data = postData
            }
          } else if (bookmark.target_type === 'comment') {
            const { data: commentData, error: commentError } = await withRetry(() =>
              supabase
                .from('comments')
                .select('id, content, created_at, like_count, post_id, posts!inner(title)')
                .eq('id', bookmark.target_id)
                .single()
            )
            
            if (commentError) {
              console.warn(`无法找到评论 ${bookmark.target_id}:`, commentError)
              // 如果评论不存在，创建一个占位符数据
              target_data = {
                id: bookmark.target_id,
                content: '此评论已被删除，但收藏记录保留',
                created_at: bookmark.created_at,
                like_count: 0,
                post_id: null,
                post_title: '原帖子已被删除'
              }
            } else {
              target_data = {
                ...commentData,
                post_title: commentData.posts?.title || '未知帖子'
              }
            }
          }
          
          // 确保target_data不为null，这样UI可以正确显示
          if (!target_data) {
            target_data = {
              id: bookmark.target_id,
              title: '数据加载失败',
              content: '无法加载内容，请稍后重试',
              created_at: bookmark.created_at,
              like_count: 0,
              comment_count: 0
            }
          }
        } catch (error) {
          console.error(`处理收藏记录 ${bookmark.id} 时出错:`, error)
          // 创建错误占位符
          target_data = {
            id: bookmark.target_id,
            title: '加载失败',
            content: '加载内容时出错，请刷新页面重试',
            created_at: bookmark.created_at,
            like_count: 0,
            comment_count: 0
          }
        }
        
        processedBookmarks.push({
          ...bookmark,
          target_data
        })
      }

      bookmarks.value = processedBookmarks
      console.log(`获取到 ${processedBookmarks.length} 个收藏记录`, processedBookmarks)
      return { success: true, data: processedBookmarks }
    } catch (error: any) {
      console.error('获取收藏失败:', error)
      return { success: false, error: handleSupabaseError(error) }
    } finally {
      isLoading.value = false
    }
  }

  // 获取用户收藏（别名，用于组件调用）
  const getUserBookmarks = fetchBookmarks

  // 获取所有收藏夹的计数
  const fetchAllFolderCounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('fetchAllFolderCounts: 用户未登录，返回空计数')
        return {}
      }

      console.log('fetchAllFolderCounts: 获取用户收藏夹计数，用户ID:', user.id)

      const { data, error } = await withRetry(() =>
        supabase
          .from('bookmarks')
          .select('folder_name')
          .eq('user_id', user.id)
      )

      if (error) {
        console.error('fetchAllFolderCounts: 获取收藏夹计数失败:', error)
        return {}
      }

      const counts: { [key: string]: number } = {}
      if (data) {
        data.forEach(bookmark => {
          counts[bookmark.folder_name] = (counts[bookmark.folder_name] || 0) + 1
        })
      }

      console.log('fetchAllFolderCounts: 获取到的收藏夹计数:', counts)
      return counts
    } catch (error) {
      console.error('fetchAllFolderCounts: 获取收藏夹计数失败:', error)
      return {}
    }
  }

  // 一次性获取用户所有收藏数据（包括关联的帖子和评论数据）
  const fetchAllUserBookmarks = async () => {
    isLoading.value = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('用户未登录')

      console.log('获取用户所有收藏数据，用户ID:', user.id)

      // 获取所有收藏记录
      const { data: bookmarkRecords, error: bookmarkError } = await withRetry(() =>
        supabase
          .from('bookmarks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      )

      if (bookmarkError) {
        console.error('查询收藏记录失败:', bookmarkError)
        throw bookmarkError
      }

      if (!bookmarkRecords || bookmarkRecords.length === 0) {
        console.log('用户没有收藏记录')
        return { success: true, data: [], folderCounts: {} }
      }

      console.log(`获取到 ${bookmarkRecords.length} 条收藏记录`)

      // 按类型分组处理
      const postIds = bookmarkRecords
        .filter(b => b.target_type === 'post')
        .map(b => b.target_id)
      
      const commentIds = bookmarkRecords
        .filter(b => b.target_type === 'comment')
        .map(b => b.target_id)

      // 批量获取帖子数据
      const postsData: { [key: string]: any } = {}
      if (postIds.length > 0) {
        const { data: posts, error: postsError } = await withRetry(() =>
          supabase
            .from('posts')
            .select('id, title, content, created_at, like_count, comment_count')
            .in('id', postIds)
        )

        if (postsError) {
          console.error('批量获取帖子失败:', postsError)
        } else if (posts) {
          posts.forEach(post => {
            postsData[post.id] = post
          })
        }
      }

      // 批量获取评论数据
      const commentsData: { [key: string]: any } = {}
      if (commentIds.length > 0) {
        const { data: comments, error: commentsError } = await withRetry(() =>
          supabase
            .from('comments')
            .select('id, content, created_at, like_count, post_id, posts!inner(title)')
            .in('id', commentIds)
        )

        if (commentsError) {
          console.error('批量获取评论失败:', commentsError)
        } else if (comments) {
          comments.forEach(comment => {
            commentsData[comment.id] = {
              ...comment,
              post_title: comment.posts?.title || '未知帖子'
            }
          })
        }
      }

      // 处理所有收藏记录
      const processedBookmarks = bookmarkRecords.map(bookmark => {
        let target_data = null
        
        if (bookmark.target_type === 'post') {
          target_data = postsData[bookmark.target_id] || {
            id: bookmark.target_id,
            title: '帖子已被删除',
            content: '此帖子已被原作者删除，但收藏记录保留',
            created_at: bookmark.created_at,
            like_count: 0,
            comment_count: 0
          }
        } else if (bookmark.target_type === 'comment') {
          target_data = commentsData[bookmark.target_id] || {
            id: bookmark.target_id,
            content: '此评论已被删除，但收藏记录保留',
            created_at: bookmark.created_at,
            like_count: 0,
            post_id: null,
            post_title: '原帖子已被删除'
          }
        }

        return {
          ...bookmark,
          target_data
        }
      })

      // 计算每个收藏夹的计数
      const folderCounts: { [key: string]: number } = {}
      processedBookmarks.forEach(bookmark => {
        folderCounts[bookmark.folder_name] = (folderCounts[bookmark.folder_name] || 0) + 1
      })

      // 更新本地状态
      bookmarks.value = processedBookmarks

      console.log(`成功处理 ${processedBookmarks.length} 条收藏记录`)
      return { 
        success: true, 
        data: processedBookmarks,
        folderCounts 
      }
    } catch (error: any) {
      console.error('获取所有收藏失败:', error)
      return { success: false, error: handleSupabaseError(error), data: [], folderCounts: {} }
    } finally {
      isLoading.value = false
    }
  }

  // 添加收藏
  const addBookmark = async (
    targetType: 'post' | 'comment',
    targetId: string,
    folderName = '默认收藏夹',
    note?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('用户未登录')

      console.log('addBookmark: 开始收藏', { targetType, targetId, folderName })

      // 首先检查是否已经收藏
      const existingBookmark = await checkIsBookmarked(targetType, targetId)
      console.log('addBookmark: 检查收藏状态', existingBookmark)
      
      if (existingBookmark) {
        console.log('addBookmark: 帖子已收藏')
        return { success: true, data: null, message: '已收藏' }
      }

      // 尝试确保收藏夹存在于bookmark_folders表中
      try {
        console.log('addBookmark: 检查收藏夹是否存在')
        const { data: folderData, error: folderError } = await withRetry(() =>
          supabase
            .from('bookmark_folders')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', folderName)
            .single()
        )

        if (folderError && folderError.code === 'PGRST116') {
          // 收藏夹不存在，创建它
          console.log('addBookmark: 创建新收藏夹', folderName)
          const { error: createError } = await withRetry(() =>
            supabase
              .from('bookmark_folders')
              .insert({
                user_id: user.id,
                name: folderName
              })
          )

          if (createError) {
            console.log('addBookmark: 创建收藏夹失败，但继续收藏操作', createError)
          } else {
            console.log('addBookmark: 收藏夹创建成功')
          }
        } else if (folderError) {
          console.log('addBookmark: 检查收藏夹时出错，但继续收藏操作', folderError)
        }
      } catch (folderTableError) {
        console.log('bookmark_folders表不存在或不可访问，跳过收藏夹检查')
      }

      console.log('addBookmark: 执行插入操作')
      const { data, error } = await withRetry(() =>
        supabase
          .from('bookmarks')
          .insert({
            user_id: user.id,
            target_type: targetType,
            target_id: targetId,
            folder_name: folderName,
            note
          })
          .select()
          .single()
      )

      console.log('addBookmark: 插入结果', { data, error })

      if (error) {
        console.log('addBookmark: 处理错误', error)
        // 处理各种可能的错误
        if (error.code === '23505') {
          return { success: true, data: null, message: '已收藏' }
        }
        throw error
      }

      // 更新本地状态
      if (data) {
        bookmarks.value.unshift(data)
      }

      console.log('addBookmark: 收藏成功')
      return { success: true, data }
    } catch (error: any) {
      console.error('addBookmark: 添加收藏失败:', error)
      return { success: false, error: handleSupabaseError(error) }
    }
  }

  // 移除收藏
  const removeBookmark = async (bookmarkId: string) => {
    try {
      const { error } = await withRetry(() =>
        supabase
          .from('bookmarks')
          .delete()
          .eq('id', bookmarkId)
      )

      if (error) throw error

      // 更新本地状态
      bookmarks.value = bookmarks.value.filter(b => b.id !== bookmarkId)

      return { success: true }
    } catch (error: any) {
      console.error('移除收藏失败:', error)
      return { success: false, error: handleSupabaseError(error) }
    }
  }

  // 检查是否已收藏
  const checkIsBookmarked = async (targetType: 'post' | 'comment', targetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      // 使用limit(1)而不是single()来避免406错误
      const { data, error } = await withRetry(() =>
        supabase
          .from('bookmarks')
          .select('id, folder_name, note')
          .eq('user_id', user.id)
          .eq('target_type', targetType)
          .eq('target_id', targetId)
          .limit(1)
      )

      if (error) {
        console.error('检查收藏状态失败:', error)
        return false
      }

      return data && data.length > 0
    } catch (error) {
      console.error('检查收藏状态失败:', error)
      return false
    }
  }

  // 切换收藏状态
  const toggleBookmark = async (
    targetType: 'post' | 'comment',
    targetId: string,
    folderName = '默认收藏夹',
    note?: string
  ) => {
    const isBookmarked = await checkIsBookmarked(targetType, targetId)
    
    if (isBookmarked) {
      // 找到收藏记录并删除
      const bookmark = bookmarks.value.find(
        b => b.target_type === targetType && b.target_id === targetId
      )
      if (bookmark) {
        return await removeBookmark(bookmark.id)
      }
      return { success: false, error: '找不到收藏记录' }
    } else {
      return await addBookmark(targetType, targetId, folderName, note)
    }
  }

  // 获取收藏夹列表
  const fetchFolders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        folders.value = ['默认收藏夹']
        return
      }

      console.log('fetchFolders: 获取用户收藏夹，用户ID:', user.id)

      // 首先尝试从bookmark_folders表获取收藏夹
      let folderNames: string[] = []
      try {
        const { data: folderData, error: folderError } = await withRetry(() =>
          supabase
            .from('bookmark_folders')
            .select('name')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
        )

        if (!folderError && folderData) {
          folderNames = folderData.map(f => f.name)
          console.log('fetchFolders: 从bookmark_folders表获取到收藏夹:', folderNames)
        }
      } catch (folderTableError) {
        console.log('fetchFolders: bookmark_folders表不存在或不可访问，使用回退方法')
      }

      // 然后从bookmarks表获取实际使用的收藏夹名称
      const { data: bookmarkData, error: bookmarkError } = await withRetry(() =>
        supabase
          .from('bookmarks')
          .select('folder_name')
          .eq('user_id', user.id)
      )

      if (!bookmarkError && bookmarkData) {
        const bookmarkFolders = [...new Set(bookmarkData.map(b => b.folder_name))]
        console.log('fetchFolders: 从bookmarks表获取到收藏夹:', bookmarkFolders)
        
        // 合并两个列表，确保包含所有收藏夹
        const allFolders = new Set([...folderNames, ...bookmarkFolders])
        folderNames = Array.from(allFolders)
      }

      // 确保至少有默认收藏夹
      if (folderNames.length === 0) {
        folderNames = ['默认收藏夹']
        console.log('fetchFolders: 没有找到收藏夹，使用默认收藏夹')
      }

      folders.value = folderNames
      console.log('fetchFolders: 最终收藏夹列表:', folderNames)

      // 尝试同步收藏夹到bookmark_folders表（如果表存在的话）
      try {
        const { data: folderData, error: folderError } = await withRetry(() =>
          supabase
            .from('bookmark_folders')
            .select('name')
            .eq('user_id', user.id)
        )

        if (!folderError && folderData) {
          const existingFolderNames = folderData.map(f => f.name)
          const missingFolders = folderNames.filter(name => !existingFolderNames.includes(name))
          
          console.log('fetchFolders: 需要同步到bookmark_folders表的收藏夹:', missingFolders)
          
          for (const folderName of missingFolders) {
            await createFolder(folderName)
          }
        }
      } catch (syncError) {
        console.log('fetchFolders: 无法同步收藏夹到bookmark_folders表，但这不影响功能')
      }
    } catch (error) {
      console.error('fetchFolders: 获取收藏夹失败:', error)
      // 回退到简单方法
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          folders.value = ['默认收藏夹']
          return
        }

        const { data, error } = await withRetry(() =>
          supabase
            .from('bookmarks')
            .select('folder_name')
            .eq('user_id', user.id)
        )

        if (error) throw error

        const uniqueFolders = [...new Set((data || []).map(b => b.folder_name))]
        folders.value = uniqueFolders.length > 0 ? uniqueFolders : ['默认收藏夹']
        console.log('fetchFolders: 回退方法获取到的收藏夹:', folders.value)
      } catch (fallbackError) {
        console.error('fetchFolders: 获取收藏夹失败（回退方法）:', fallbackError)
        folders.value = ['默认收藏夹']
      }
    }
  }

  // 创建新收藏夹
  const createFolder = async (folderName: string) => {
    if (folders.value.includes(folderName)) {
      return { success: false, error: '收藏夹已存在' }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('用户未登录')

      // 尝试在bookmark_folders表中创建新收藏夹
      try {
        const { data, error } = await withRetry(() =>
          supabase
            .from('bookmark_folders')
            .insert({
              user_id: user.id,
              name: folderName
            })
            .select('id')
            .single()
        )

        if (error) {
          console.log('bookmark_folders表操作失败，使用回退方法:', error)
          throw error
        }
      } catch (folderTableError) {
        console.log('bookmark_folders表不存在或不可访问，使用回退方法')
        // 如果bookmark_folders表不存在或有其他错误，回退到旧方法
        // 直接添加到本地收藏夹列表，这样在下次收藏时会创建该收藏夹
        if (!folders.value.includes(folderName)) {
          folders.value.push(folderName)
        }
        return { success: true }
      }

      // 添加到本地列表
      if (!folders.value.includes(folderName)) {
        folders.value.push(folderName)
      }
      return { success: true }
    } catch (error: any) {
      console.error('创建收藏夹失败:', error)
      // 即使出错也尝试添加到本地列表
      if (!folders.value.includes(folderName)) {
        folders.value.push(folderName)
      }
      return { success: true }
    }
  }

  // 更新收藏备注
  const updateBookmarkNote = async (bookmarkId: string, note: string) => {
    try {
      const { error } = await withRetry(() =>
        supabase
          .from('bookmarks')
          .update({ note, updated_at: new Date().toISOString() })
          .eq('id', bookmarkId)
      )

      if (error) throw error

      // 更新本地状态
      const bookmark = bookmarks.value.find(b => b.id === bookmarkId)
      if (bookmark) {
        bookmark.note = note
      }

      return { success: true }
    } catch (error: any) {
      console.error('更新收藏备注失败:', error)
      return { success: false, error: handleSupabaseError(error) }
    }
  }

  return {
    bookmarks,
    isLoading,
    folders,
    fetchBookmarks,
    getUserBookmarks,
    addBookmark,
    removeBookmark,
    checkIsBookmarked,
    toggleBookmark,
    fetchFolders,
    createFolder,
    updateBookmarkNote,
    fetchAllFolderCounts,
    fetchAllUserBookmarks
  }
})