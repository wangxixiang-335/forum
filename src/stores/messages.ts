import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase, handleSupabaseError } from '@/services/supabase'
import type { Database } from '@/types/supabase'

// 重试函数
const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      
      if (i === maxRetries - 1) {
        throw error
      }
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
    }
  }
  
  throw lastError
}

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  is_deleted_by_sender: boolean
  is_deleted_by_receiver: boolean
  created_at: string
  updated_at: string
  sender_profile?: {
    username: string
    avatar_url: string | null
    level: number
  }
  receiver_profile?: {
    username: string
    avatar_url: string | null
    level: number
  }
}

interface Conversation {
  id: string
  user1_id: string
  user2_id: string
  last_message_id: string | null
  last_message_at: string
  is_deleted_by_user1: boolean
  is_deleted_by_user2: boolean
  created_at: string
  updated_at: string
  other_user?: {
    id: string
    username: string
    avatar_url: string | null
    level: number
  }
  last_message?: Message
  unread_count: number
}

export const useMessageStore = defineStore('messages', () => {
  const conversations = ref<Conversation[]>([])
  const currentMessages = ref<Message[]>([])
  const isLoading = ref(false)
  const unreadCount = ref(0)

  // 获取会话列表
  const fetchConversations = async () => {
    isLoading.value = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('用户未登录')

      console.log('正在获取用户会话列表，用户ID:', user.id)

      // 检查是否使用默认配置
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (!supabaseUrl || supabaseUrl.includes('default.supabase.co')) {
        console.log('开发模式：返回模拟会话数据')
        
        // 创建模拟会话数据
        const mockConversations = [
          {
            id: 'conv_mock1',
            user1_id: user.id,
            user2_id: 'mock-user-1',
            other_user: {
              id: 'mock-user-1',
              username: '测试用户1',
              avatar_url: null,
              level: 2
            },
            last_message: {
              id: 'msg1',
              content: '这是一条测试消息',
              created_at: new Date(Date.now() - 3600000).toISOString(),
              is_read: false
            },
            last_message_at: new Date(Date.now() - 3600000).toISOString(),
            unread_count: 1,
            messages: []
          }
        ]
        
        conversations.value = mockConversations
        return { success: true, data: mockConversations }
      }

      // 先获取所有相关的消息，然后按对话分组
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          *,
          sender_profile:sender_id (username, avatar_url, level),
          receiver_profile:receiver_id (username, avatar_url, level)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('is_deleted_by_sender', false)
        .eq('is_deleted_by_receiver', false)
        .order('created_at', { ascending: false })

      if (messagesError) {
        console.error('获取消息失败:', messagesError)
        throw messagesError
      }

      console.log('获取到的消息数量:', messages?.length || 0)

      // 按对话分组消息
      const conversationMap = new Map()
      
      // 确保messages是数组
      const messagesArray = Array.isArray(messages) ? messages : []
      
      messagesArray.forEach(message => {
        const otherUserId = message.sender_id === user.id ? message.receiver_id : message.sender_id
        const otherUserProfile = message.sender_id === user.id ? message.receiver_profile : message.sender_profile
        
        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            id: `conv_${otherUserId}`, // 生成一个临时会话ID
            user1_id: user.id < otherUserId ? user.id : otherUserId,
            user2_id: user.id > otherUserId ? user.id : otherUserId,
            other_user: {
              ...otherUserProfile,
              id: otherUserId // 确保other_user包含id字段
            },
            last_message: message,
            last_message_at: message.created_at,
            messages: [],
            unread_count: 0
          })
        }
        
        const conversation = conversationMap.get(otherUserId)
        conversation.messages.push(message)
        
        // 如果这是最新的消息，更新最后消息信息
        if (!conversation.last_message || new Date(message.created_at) > new Date(conversation.last_message.created_at)) {
          conversation.last_message = message
          conversation.last_message_at = message.created_at
        }
        
        // 计算未读数量
        if (message.receiver_id === user.id && !message.is_read) {
          conversation.unread_count++
        }
      })

      // 转换为数组并按时间排序
      const conversationsArray: any[] = []
      conversationMap.forEach((value) => {
        conversationsArray.push(value)
      })
      
      const conversationsList = conversationsArray.sort((a, b) => {
        const timeA = new Date(a.last_message_at).getTime()
        const timeB = new Date(b.last_message_at).getTime()
        return timeB - timeA
      })

      console.log('处理后的会话数量:', conversationsList.length)
      console.log('会话列表详情:', conversationsList)

      conversations.value = conversationsList
      return { success: true, data: conversationsList }
    } catch (error: any) {
      console.error('获取会话列表失败:', error)
      return { success: false, error: handleSupabaseError(error) }
    } finally {
      isLoading.value = false
    }
  }

  // 获取会话消息（分页）
  const fetchMessagesPaginated = async (conversationId: string, page = 1, limit = 50) => {
    isLoading.value = true
    try {
      const { data, error } = await withRetry(() =>
        supabase
          .from('messages')
          .select(`
            *,
            sender_profile:sender_id (username, avatar_url, level),
            receiver_profile:receiver_id (username, avatar_url, level)
          `)
          .or(`sender_id.in.(select user1_id from conversations where id.eq.${conversationId}),sender_id.in.(select user2_id from conversations where id.eq.${conversationId})`)
          .and(`receiver_id.in.(select user1_id from conversations where id.eq.${conversationId}),receiver_id.in.(select user2_id from conversations where id.eq.${conversationId})`)
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1)
      )

      if (error) throw error

      currentMessages.value = (data || []).reverse() // 按时间正序显示
      return { success: true, data: currentMessages.value }
    } catch (error: any) {
      console.error('获取消息失败:', error)
      return { success: false, error: handleSupabaseError(error) }
    } finally {
      isLoading.value = false
    }
  }

  // 发送消息
  const sendMessage = async (receiverId: string, content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('用户未登录')

      const { data, error } = await withRetry(() =>
        supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            receiver_id: receiverId,
            content: content.trim()
          })
          .select(`
            *,
            sender_profile:sender_id (username, avatar_url, level),
            receiver_profile:receiver_id (username, avatar_url, level)
          `)
          .single()
      )

      if (error) throw error

      // 更新本地状态
      if (data) {
        currentMessages.value.push(data)
      }

      return { success: true, data }
    } catch (error: any) {
      console.error('发送消息失败:', error)
      return { success: false, error: handleSupabaseError(error) }
    }
  }

  // 标记消息为已读
  const markMessagesAsRead = async (senderId: string) => {
    try {
      console.log('标记消息已读，senderId:', senderId)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      if (!senderId || senderId === 'undefined') {
        console.warn('senderId 无效，跳过标记已读')
        return
      }

      // 先尝试使用RPC函数，如果失败则使用直接更新
      try {
        const { error } = await supabase.rpc('mark_messages_as_read', {
          p_sender_id: senderId,
          p_receiver_id: user.id
        })

        if (error) throw error
      } catch (rpcError) {
        // 如果RPC函数不存在，使用直接更新
        console.warn('RPC函数不存在，使用直接更新:', rpcError)
        
        const { error } = await withRetry(() =>
          supabase
            .from('messages')
            .update({ is_read: true })
            .eq('sender_id', senderId)
            .eq('receiver_id', user.id)
            .eq('is_read', false)
        )

        if (error) throw error
      }

      // 更新本地状态
      currentMessages.value = currentMessages.value.map(msg => {
        if (msg.sender_id === senderId && msg.receiver_id === user.id) {
          return { ...msg, is_read: true }
        }
        return msg
      })

      // 更新会话列表中的未读数量
      conversations.value = conversations.value.map(conv => {
        if (conv.other_user?.id === senderId) {
          return { ...conv, unread_count: 0 }
        }
        return conv
      })

      // 更新全局未读计数
      const conversation = conversations.value.find(c => c.other_user?.id === senderId)
      if (conversation && conversation.unread_count === 0) {
        // 从全局未读计数中减去这个会话的未读数量
        const conversationUnreadCount = currentMessages.value.filter(
          msg => msg.sender_id === senderId && msg.receiver_id === user.id && !msg.is_read
        ).length
        
        unreadCount.value = Math.max(0, unreadCount.value - conversationUnreadCount)
      }

      return { success: true }
    } catch (error: any) {
      console.error('标记消息已读失败:', error)
      return { success: false, error: handleSupabaseError(error) }
    }
  }

  // 获取未读消息总数
  const fetchUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 检查是否使用默认配置
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (!supabaseUrl || supabaseUrl.includes('default.supabase.co')) {
        console.log('开发模式：返回模拟未读数量')
        unreadCount.value = 1
        return { success: true, count: 1 }
      }

      // 先尝试使用RPC函数，如果失败则使用直接查询
      let count = 0
      
      try {
        const { data, error } = await supabase.rpc('get_unread_message_count', {
          p_user_id: user.id
        })
        
        if (!error && data) {
          count = data
        } else {
          throw error
        }
      } catch (rpcError) {
        // 如果RPC函数不存在，使用直接查询
        console.warn('RPC函数不存在，使用直接查询:', rpcError)
        
        const { data, error } = await withRetry(() =>
          supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', user.id)
            .eq('is_read', false)
            .eq('is_deleted_by_receiver', false)
        )
        
        if (error) throw error
        count = data || 0
      }

      unreadCount.value = count
      return { success: true, count }
    } catch (error: any) {
      console.error('获取未读消息数量失败:', error)
      // 不抛出错误，设置默认值
      unreadCount.value = 0
      return { success: false, error: handleSupabaseError(error) }
    }
  }

  // 删除会话
  const deleteConversation = async (conversationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('用户未登录')

      const conversation = conversations.value.find(c => c.id === conversationId)
      if (!conversation) throw new Error('会话不存在')

      const updateField = user.id === conversation.user1_id ? 'is_deleted_by_user1' : 'is_deleted_by_user2'

      const { error } = await withRetry(() =>
        supabase
          .from('conversations')
          .update({ [updateField]: true })
          .eq('id', conversationId)
      )

      if (error) throw error

      // 更新本地状态
      conversations.value = conversations.value.filter(c => c.id !== conversationId)

      return { success: true }
    } catch (error: any) {
      console.error('删除会话失败:', error)
      return { success: false, error: handleSupabaseError(error) }
    }
  }

  // 删除消息
  const deleteMessage = async (messageId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('用户未登录')

      const message = currentMessages.value.find(m => m.id === messageId)
      if (!message) throw new Error('消息不存在')

      const updateField = user.id === message.sender_id ? 'is_deleted_by_sender' : 'is_deleted_by_receiver'

      const { error } = await withRetry(() =>
        supabase
          .from('messages')
          .update({ [updateField]: true })
          .eq('id', messageId)
      )

      if (error) throw error

      // 更新本地状态
      currentMessages.value = currentMessages.value.filter(m => m.id !== messageId)

      return { success: true }
    } catch (error: any) {
      console.error('删除消息失败:', error)
      return { success: false, error: handleSupabaseError(error) }
    }
  }

  // 搜索用户
  const searchUsers = async (query: string) => {
    try {
      const { data, error } = await withRetry(() =>
        supabase
          .from('profiles')
          .select('id, username, avatar_url, level')
          .ilike('username', `%${query}%`)
          .limit(10)
      )

      if (error) throw error

      return { success: true, data: data || [] }
    } catch (error: any) {
      console.error('搜索用户失败:', error)
      return { success: false, error: handleSupabaseError(error) }
    }
  }

  // 获取指定会话的消息
  const fetchMessages = async (conversationId: string) => {
    isLoading.value = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('用户未登录')

      console.log('获取会话消息，会话ID:', conversationId, '用户ID:', user.id)

      // 检查是否使用默认配置（开发模式）
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (!supabaseUrl || supabaseUrl.includes('default.supabase.co')) {
        console.log('开发模式：返回模拟消息数据')
        
        // 开发模式下返回模拟消息
        const mockMessages = [
          {
            id: 'msg1',
            sender_id: 'mock-user-1',
            receiver_id: user.id,
            content: '这是一条测试消息',
            is_read: false,
            is_deleted_by_sender: false,
            is_deleted_by_receiver: false,
            created_at: new Date(Date.now() - 3600000).toISOString(),
            updated_at: new Date(Date.now() - 3600000).toISOString(),
            sender_profile: {
              username: '测试用户1',
              avatar_url: null,
              level: 2
            },
            is_from_current_user: false
          }
        ]
        
        currentMessages.value = mockMessages
        return { success: true, data: currentMessages.value }
      }

      // 从conversationId中提取otherUserId（因为我们使用了临时ID格式）
      let otherUserId: string
      if (conversationId.startsWith('conv_')) {
        otherUserId = conversationId.replace('conv_', '')
      } else {
        // 如果是原有的会话ID，尝试从conversations表中获取
        const { data: conversation, error: convError } = await withRetry(() =>
          supabase
            .from('conversations')
            .select('*')
            .eq('id', conversationId)
            .single()
        )

        if (convError) throw convError
        if (!conversation) throw new Error('会话不存在')

        const isUser1 = conversation.user1_id === user.id
        otherUserId = isUser1 ? conversation.user2_id : conversation.user1_id
      }

      // 获取消息
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender_profile:sender_id (username, avatar_url, level)
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .eq('is_deleted_by_sender', false)
        .eq('is_deleted_by_receiver', false)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('获取消息失败:', error)
        throw error
      }

      console.log('获取到的消息数量:', data?.length || 0)

      const messagesWithProfiles = (data || []).map(msg => ({
        ...msg,
        is_from_current_user: msg.sender_id === user.id
      }))

      currentMessages.value = messagesWithProfiles
      return { success: true, data: currentMessages.value }
    } catch (error: any) {
      console.error('获取消息失败:', error)
      return { success: false, error: handleSupabaseError(error) }
    } finally {
      isLoading.value = false
    }
  }

  return {
    conversations,
    currentMessages,
    isLoading,
    unreadCount,
    fetchConversations,
    fetchMessages,
    fetchMessagesPaginated,
    sendMessage,
    markMessagesAsRead,
    fetchUnreadCount,
    deleteConversation,
    deleteMessage,
    searchUsers
  }
})