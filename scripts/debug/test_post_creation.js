// 帖子创建调试脚本
import { createClient } from '@supabase/supabase-js'

// 从环境变量获取配置
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lsnunsxhnazfnyxayfmd.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbnVuc3hobmF6Zm55eGF5Zm1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDMyNTIsImV4cCI6MjA3NjA3OTI1Mn0._ooE6qigwspvhejS1JDJDwKbXcgfyIW2C5HnuBdBwMM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testPostCreation() {
  console.log('🔧 开始测试帖子创建功能...')
  console.log('Supabase URL:', supabaseUrl)
  console.log('Anon Key:', supabaseKey.substring(0, 20) + '...')
  
  try {
    // 1. 测试认证连接
    console.log('\n1. 测试认证连接...')
    const { data: authData, error: authError } = await supabase.auth.getSession()
    
    if (authError) {
      console.error('❌ 认证连接失败:', authError.message)
      return
    }
    
    console.log('✅ 认证连接成功')
    
    // 2. 测试数据库表访问
    console.log('\n2. 测试数据库表访问...')
    const tables = ['profiles', 'posts', 'comments', 'interactions']
    
    for (const tableName of tables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('count')
          .limit(1)
        
        if (error) {
          console.error(`❌ 表${tableName}访问失败:`, error.message)
          console.log('错误代码:', error.code)
          
          if (error.code === 'PGRST301') {
            console.log('💡 表可能不存在，需要执行数据库迁移')
          } else if (error.code === '42501') {
            console.log('💡 RLS策略问题，需要检查权限配置')
          }
        } else {
          console.log(`✅ 表${tableName}访问成功`)
        }
      } catch (tableError) {
        console.error(`❌ 表${tableName}测试异常:`, tableError.message)
      }
    }
    
    // 3. 测试帖子创建权限
    console.log('\n3. 测试帖子创建权限...')
    
    // 先尝试登录测试用户
    console.log('尝试登录测试用户...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'test123456'
    })
    
    if (signInError) {
      console.log('测试用户登录失败，尝试匿名访问:', signInError.message)
      
      // 测试匿名创建帖子（应该失败）
      const { data: anonData, error: anonError } = await supabase
        .from('posts')
        .insert({
          title: '测试帖子',
          content: '这是一个测试帖子',
          tags: ['测试'],
          like_count: 0,
          comment_count: 0,
          view_count: 0,
          is_pinned: false
        })
        .select()
        .single()
      
      if (anonError) {
        console.log('✅ 匿名创建帖子被正确阻止:', anonError.message)
        console.log('错误代码:', anonError.code)
      } else {
        console.error('❌ 匿名创建帖子不应该成功，RLS策略可能有问题')
      }
    } else {
      console.log('✅ 测试用户登录成功')
      console.log('用户ID:', signInData.user.id)
      
      // 测试创建帖子
      const testPost = {
        title: '调试测试帖子',
        content: '这是一个用于调试的测试帖子内容。'.repeat(10), // 模拟长帖子
        tags: ['调试', '测试'],
        like_count: 0,
        comment_count: 0,
        view_count: 0,
        is_pinned: false
      }
      
      console.log('\n4. 测试创建帖子...')
      console.log('帖子内容长度:', testPost.content.length)
      
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert(testPost)
        .select()
        .single()
      
      if (postError) {
        console.error('❌ 创建帖子失败:', postError.message)
        console.log('错误代码:', postError.code)
        console.log('错误详情:', postError.details)
        
        if (postError.code === '42501') {
          console.log('💡 RLS策略问题: 用户没有创建帖子的权限')
        } else if (postError.code === '23505') {
          console.log('💡 唯一约束冲突')
        } else if (postError.code === '23503') {
          console.log('💡 外键约束失败: 用户资料可能不存在')
        }
      } else {
        console.log('✅ 创建帖子成功!')
        console.log('帖子ID:', postData.id)
        
        // 测试删除帖子
        const { error: deleteError } = await supabase
          .from('posts')
          .delete()
          .eq('id', postData.id)
        
        if (deleteError) {
          console.error('删除帖子失败:', deleteError.message)
        } else {
          console.log('✅ 删除帖子成功')
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出现异常:', error.message)
  }
}

// 运行测试
testPostCreation().catch(console.error)