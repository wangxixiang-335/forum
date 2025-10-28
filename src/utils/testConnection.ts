import { supabase } from '@/services/supabase'

/**
 * 测试Supabase数据库连接
 */
export async function testDatabaseConnection() {
  console.log('🔗 测试Supabase数据库连接...')
  
  try {
    // 测试连接和表访问
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('count')
      .limit(1)
    
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('count')
      .limit(1)
    
    const { data: interactions, error: interactionsError } = await supabase
      .from('interactions')
      .select('count')
      .limit(1)
    
    // 检查错误
    const errors = [profilesError, postsError, commentsError, interactionsError].filter(Boolean)
    
    if (errors.length > 0) {
      console.error('❌ 数据库连接测试失败:')
      errors.forEach(error => console.error(error))
      return false
    }
    
    console.log('✅ 数据库连接测试成功!')
    console.log('📊 表状态:')
    console.log('  - profiles表: 可访问')
    console.log('  - posts表: 可访问')
    console.log('  - comments表: 可访问')
    console.log('  - interactions表: 可访问')
    
    return true
  } catch (error) {
    console.error('❌ 数据库连接测试异常:', error)
    return false
  }
}

// 开发模式下自动测试
development && testDatabaseConnection()