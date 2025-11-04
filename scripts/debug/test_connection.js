// 简单的连接测试脚本
import { createClient } from '@supabase/supabase-js'

// 使用新的配置
const supabaseUrl = 'https://lsnunsxhnazfnyxayfmd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbnVuc3hobmF6Zm55eGF5Zm1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDMyNTIsImV4cCI6MjA3NjA3OTI1Mn0._ooE6qigwspvhejS1JDJDwKbXcgfyIW2C5HnuBdBwMM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('🔧 测试Supabase连接...')
  console.log('URL:', supabaseUrl)
  
  try {
    // 测试基本连接
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ 连接失败:', error.message)
      console.error('错误详情:', error)
      return
    }
    
    console.log('✅ 连接成功!')
    
    // 测试表访问
    console.log('\n测试表访问...')
    const { data: tables, error: tableError } = await supabase
      .from('posts')
      .select('count')
      .limit(1)
    
    if (tableError) {
      console.log('表访问错误:', tableError.message)
      console.log('错误代码:', tableError.code)
      
      if (tableError.code === 'PGRST301') {
        console.log('💡 表可能不存在，需要执行数据库迁移')
      }
    } else {
      console.log('✅ 表访问成功')
    }
    
  } catch (error) {
    console.error('❌ 测试异常:', error.message)
    if (error.cause) {
      console.error('底层错误:', error.cause)
    }
  }
}

// 运行测试
testConnection().catch(console.error)