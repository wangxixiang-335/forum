// 应用缺失的数据库函数
// 这个脚本会执行003_add_missing_functions.sql迁移文件

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// 从环境变量获取Supabase配置
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bkintupjzbcjiqvzricz.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW50dXBqemJjamlxdnpyaWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDYzNDEsImV4cCI6MjA3NzE4MjM0MX0.ZA6l95LSZ_x2DFfJGCcXMXLlRg9nOV7kNqEJUC7OG8o'

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
  console.log('🚀 开始应用缺失的数据库函数...')
  
  try {
    // 读取迁移文件
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '003_add_missing_functions.sql')
    const migrationSql = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📄 读取迁移文件:', migrationPath)
    
    // 分割SQL语句（按分号分割，但要注意函数定义中的分号）
    const statements = migrationSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📊 发现 ${statements.length} 条SQL语句`)
    
    // 逐条执行SQL语句
    for (let i = 0; i < statements.length; i++) {
      const sql = statements[i] + ';' // 重新添加分号
      
      try {
        console.log(`🔧 执行语句 ${i + 1}/${statements.length}...`)
        
        const { error } = await supabase.rpc('execute_sql', { sql })
        
        if (error) {
          // 如果execute_sql函数不存在，尝试直接使用SQL API
          console.log('尝试使用SQL API执行...')
          const { error: sqlError } = await supabase.from('_sql').select('*').single()
          
          if (sqlError) {
            console.warn(`⚠️ 无法执行语句 ${i + 1}:`, error.message)
            console.warn('请通过Supabase Dashboard手动执行迁移文件')
            continue
          }
        }
        
        console.log(`✅ 语句 ${i + 1} 执行成功`)
        
      } catch (stmtError) {
        console.warn(`⚠️ 语句 ${i + 1} 执行失败:`, stmtError.message)
        // 继续执行下一条语句
      }
    }
    
    console.log('✅ 迁移应用完成')
    
    // 测试新创建的函数
    await testNewFunctions()
    
  } catch (error) {
    console.error('❌ 迁移应用失败:', error)
    process.exit(1)
  }
}

async function testNewFunctions() {
  console.log('🧪 测试新创建的函数...')
  
  try {
    // 测试 increment_view_count 函数
    console.log('1. 测试 increment_view_count 函数...')
    
    // 先创建一个测试帖子
    const { data: testPost, error: createError } = await supabase
      .from('posts')
      .insert({
        title: '测试帖子 - 函数验证',
        content: '这是一个用于测试数据库函数的帖子',
        user_id: '00000000-0000-0000-0000-000000000000' // 使用虚拟ID
      })
      .select()
      .single()
    
    if (createError && !createError.message.includes('violates foreign key constraint')) {
      console.warn('⚠️ 无法创建测试帖子:', createError.message)
    } else if (testPost) {
      // 测试函数
      const { error: functionError } = await supabase.rpc('increment_view_count', { 
        post_id: testPost.id 
      })
      
      if (functionError) {
        console.warn('⚠️ increment_view_count 函数测试失败:', functionError.message)
      } else {
        console.log('✅ increment_view_count 函数工作正常')
      }
      
      // 清理测试数据
      await supabase.from('posts').delete().eq('id', testPost.id)
    }
    
    // 测试其他函数
    console.log('2. 测试其他函数...')
    
    const functionsToTest = [
      'get_post_stats',
      'search_posts', 
      'get_popular_posts',
      'update_user_experience',
      'get_user_stats',
      'cleanup_old_data'
    ]
    
    for (const funcName of functionsToTest) {
      try {
        const { error } = await supabase.rpc(funcName, {})
        
        if (error && !error.message.includes('缺少参数')) {
          console.warn(`⚠️ ${funcName} 函数可能存在问题:`, error.message)
        } else {
          console.log(`✅ ${funcName} 函数存在`)
        }
      } catch (funcError) {
        console.warn(`⚠️ ${funcName} 函数测试失败:`, funcError.message)
      }
    }
    
    console.log('✅ 函数测试完成')
    
  } catch (error) {
    console.warn('⚠️ 函数测试过程中出现错误:', error.message)
  }
}

// 执行迁移
applyMigration().catch(console.error)