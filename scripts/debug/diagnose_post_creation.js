// 详细的帖子创建诊断脚本
import { createClient } from '@supabase/supabase-js'

// 使用正确的配置
const supabaseUrl = 'https://bkintupjzbcjiqvzricz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW50dXBqemJjamlxdnpyaWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYzNDEsImV4cCI6MjA3NzE4MjM0MX0.ZA6l95LSZ_x2DFfJGCcXMXLlRg9nOV7kNqEJUC7OG8o'

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnosePostCreation() {
  console.log('🔍 开始诊断帖子创建问题...')
  console.log('Supabase URL:', supabaseUrl)
  
  try {
    // 1. 测试基本连接
    console.log('\n1. 测试基本连接...')
    const startTime = Date.now()
    const { data: authData, error: authError } = await supabase.auth.getSession()
    const connectTime = Date.now() - startTime
    
    if (authError) {
      console.error('❌ 连接失败:', authError.message)
      console.error('错误代码:', authError.code)
      return
    }
    
    console.log(`✅ 连接成功 (耗时: ${connectTime}ms)`)
    
    // 2. 检查表是否存在
    console.log('\n2. 检查posts表是否存在...')
    try {
      const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'posts')
      
      if (tableError) {
        console.error('❌ 查询表信息失败:', tableError.message)
      } else if (tables && tables.length > 0) {
        console.log('✅ posts表存在')
      } else {
        console.log('❌ posts表不存在，需要执行数据库迁移')
        console.log('💡 请运行: node scripts/database/apply_missing_functions.js')
      }
    } catch (schemaError) {
      console.error('❌ 查询表结构失败:', schemaError.message)
    }
    
    // 3. 测试简单的表查询
    console.log('\n3. 测试表查询...')
    try {
      const queryStart = Date.now()
      const { data: posts, error: queryError } = await supabase
        .from('posts')
        .select('id')
        .limit(1)
      
      const queryTime = Date.now() - queryStart
      
      if (queryError) {
        console.error('❌ 表查询失败:', queryError.message)
        console.error('错误代码:', queryError.code)
        
        if (queryError.code === 'PGRST301') {
          console.log('💡 表可能不存在或RLS策略阻止访问')
        } else if (queryError.code === '42501') {
          console.log('💡 RLS策略阻止访问，需要检查权限')
        }
      } else {
        console.log(`✅ 表查询成功 (耗时: ${queryTime}ms)`)
        console.log('查询结果:', posts)
      }
    } catch (queryException) {
      console.error('❌ 查询异常:', queryException.message)
    }
    
    // 4. 测试插入操作（不带RLS检查）
    console.log('\n4. 测试插入操作...')
    try {
      const testPost = {
        title: '诊断测试帖子',
        content: '这是一个用于诊断的测试帖子。'.repeat(5), // 短内容测试
        tags: ['诊断', '测试'],
        like_count: 0,
        comment_count: 0,
        view_count: 0,
        is_pinned: false
      }
      
      console.log('测试帖子内容长度:', testPost.content.length)
      
      const insertStart = Date.now()
      const { data: insertedData, error: insertError } = await supabase
        .from('posts')
        .insert(testPost)
        .select()
        .single()
      
      const insertTime = Date.now() - insertStart
      
      if (insertError) {
        console.error('❌ 插入失败:', insertError.message)
        console.error('错误代码:', insertError.code)
        console.error('错误详情:', insertError.details)
        
        if (insertError.code === '42501') {
          console.log('💡 RLS策略阻止插入，需要为用户配置创建权限')
        } else if (insertError.code === '23503') {
          console.log('💡 外键约束失败: user_id可能不存在于profiles表')
        } else if (insertError.code === '23505') {
          console.log('💡 唯一约束冲突')
        }
      } else {
        console.log(`✅ 插入成功 (耗时: ${insertTime}ms)`)
        console.log('插入的数据ID:', insertedData.id)
        
        // 清理测试数据
        const { error: deleteError } = await supabase
          .from('posts')
          .delete()
          .eq('id', insertedData.id)
        
        if (deleteError) {
          console.warn('⚠️ 清理测试数据失败:', deleteError.message)
        } else {
          console.log('✅ 测试数据清理成功')
        }
      }
    } catch (insertException) {
      console.error('❌ 插入异常:', insertException.message)
    }
    
    // 5. 检查profiles表（用户资料）
    console.log('\n5. 检查用户资料表...')
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username')
        .limit(3)
      
      if (profilesError) {
        console.error('❌ 查询profiles表失败:', profilesError.message)
        console.log('💡 profiles表可能不存在或RLS策略阻止访问')
      } else {
        console.log('✅ profiles表查询成功')
        console.log('用户资料示例:', profiles)
      }
    } catch (profilesException) {
      console.error('❌ 查询profiles异常:', profilesException.message)
    }
    
  } catch (error) {
    console.error('❌ 诊断过程中出现异常:', error.message)
    if (error.cause) {
      console.error('底层错误:', error.cause)
    }
  }
}

// 运行诊断
diagnosePostCreation().catch(console.error)